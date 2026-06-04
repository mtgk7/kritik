"""
Kritik Haber Çekici — RSS tabanlı, tamamen ücretsiz.

Kaynaklar:
  - BBC Sport Football (İngilizce)
  - Goal.com (İngilizce)
  - Sky Sports Football (İngilizce)
  - Fanatik (Türkçe)
  - Sporx (Türkçe)
  - NTV Spor (Türkçe)

Her çalıştırmada:
  1. Tüm feed'leri çeker
  2. Son 24 saattekiler → "gunun_haberi"
  3. Son 7 gündekiler  → "haftanin_haberi"
  4. Başlığa göre duplicate kontrolü yapar
  5. Supabase news tablosuna yazar
"""

import logging
import hashlib
import time
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import feedparser
import requests

log = logging.getLogger("kritik-bot.news")


# ── Çeviri ────────────────────────────────────────────────────────────────────

def translate_to_turkish(text: str) -> str:
    """
    İngilizce metni Türkçeye çevirir.
    Google Translate (ücretsiz, API key gerektirmez).
    Hata durumunda orijinal metni döner.
    """
    if not text or len(text.strip()) < 5:
        return text
    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source='en', target='tr').translate(text[:5000])
        return translated or text
    except Exception as e:
        log.debug(f"Çeviri hatası: {e}")
        return text


def translate_item(title: str, summary: str) -> tuple[str, str]:
    """Başlık ve özeti çevirir, aralarında 0.5s bekler (rate limit)."""
    tr_title   = translate_to_turkish(title)
    time.sleep(0.5)
    tr_summary = translate_to_turkish(summary)
    time.sleep(0.5)
    return tr_title, tr_summary

# ── RSS kaynakları ─────────────────────────────────────────────────────────────

RSS_FEEDS = [
    # Türkçe
    {
        "url":  "https://www.milliyet.com.tr/rss/rssNew/spor.xml",
        "lang": "tr",
        "tag":  "Milliyet Spor",
    },
    {
        "url":  "https://www.hurriyet.com.tr/rss/spor",
        "lang": "tr",
        "tag":  "Hürriyet Spor",
    },
    {
        "url":  "https://www.sabah.com.tr/rss/spor.xml",
        "lang": "tr",
        "tag":  "Sabah Spor",
    },
    # İngilizce
    {
        "url":  "https://feeds.bbci.co.uk/sport/football/rss.xml",
        "lang": "en",
        "tag":  "BBC Sport",
    },
    {
        "url":  "https://www.skysports.com/rss/12040",
        "lang": "en",
        "tag":  "Sky Sports",
    },
    {
        "url":  "https://www.espn.com/espn/rss/soccer/news",
        "lang": "en",
        "tag":  "ESPN",
    },
]

# Futbolla ilgili anahtar kelimeler (alakasız haberleri filtreler)
FOOTBALL_KEYWORDS = [
    "gol", "maç", "lig", "transfer", "futbol", "takım", "oyuncu",
    "teknik direktör", "şampiyonluk", "kupa", "süper lig", "galatasaray",
    "fenerbahçe", "beşiktaş", "trabzonspor",
    "football", "soccer", "goal", "match", "league", "transfer", "player",
    "manager", "championship", "cup", "premier", "bundesliga", "laliga",
    "world cup", "fifa", "uefa", "champions",
]


def _parse_date(entry: dict) -> datetime | None:
    """feedparser entry'sinden datetime çıkarır."""
    for field in ["published", "updated"]:
        raw = entry.get(f"{field}_parsed") or entry.get(field)
        if not raw:
            continue
        try:
            if hasattr(raw, "tm_year"):   # time.struct_time
                import calendar
                ts = calendar.timegm(raw)
                return datetime.fromtimestamp(ts, tz=timezone.utc)
            return parsedate_to_datetime(str(raw)).astimezone(timezone.utc)
        except Exception:
            continue
    return datetime.now(timezone.utc)


def _is_football_related(title: str, summary: str) -> bool:
    text = (title + " " + summary).lower()
    return any(kw in text for kw in FOOTBALL_KEYWORDS)


def _title_hash(title: str) -> str:
    """Duplicate kontrolü için başlıktan kısa hash üretir."""
    return hashlib.md5(title.strip().lower().encode()).hexdigest()[:16]


def fetch_news() -> list[dict]:
    """
    Tüm feed'leri çek, filtrele, kategorile.
    Dönüş: Supabase'e yazılmaya hazır dict listesi.
    """
    now   = datetime.now(timezone.utc)
    day1  = now - timedelta(hours=24)
    day7  = now - timedelta(days=7)

    seen_hashes: set[str] = set()
    results: list[dict] = []

    for feed_cfg in RSS_FEEDS:
        url = feed_cfg["url"]
        tag = feed_cfg["tag"]
        log.info(f"  Feed çekiliyor: {tag}")

        try:
            feed = feedparser.parse(url)
        except Exception as e:
            log.warning(f"  Feed hatası [{tag}]: {e}")
            continue

        if feed.bozo and not feed.entries:
            log.warning(f"  Geçersiz feed [{tag}]: {feed.bozo_exception}")
            continue

        for entry in feed.entries:
            title   = (entry.get("title") or "").strip()
            summary = (entry.get("summary") or entry.get("description") or "").strip()

            if not title:
                continue

            # Duplicate kontrolü
            h = _title_hash(title)
            if h in seen_hashes:
                continue
            seen_hashes.add(h)

            # Futbolla ilgili mi?
            if not _is_football_related(title, summary):
                continue

            # Tarih
            pub_date = _parse_date(entry)
            if pub_date < day7:
                continue   # 7 günden eski

            # Kategori
            if pub_date >= day1:
                category = "gunun_haberi"
            else:
                category = "haftanin_haberi"

            # Özet temizle (HTML taglarını kaldır)
            clean_summary = _strip_html(summary)[:300] if summary else title

            # Fotoğraf çek
            image_url = _extract_image(entry, summary)

            # İngilizce haberleri Türkçeye çevir
            if feed_cfg["lang"] == "en":
                log.debug(f"    Çevriliyor: {title[:50]}...")
                title, clean_summary = translate_item(title, clean_summary)

            results.append({
                "title":        title[:200],
                "summary":      clean_summary,
                "category":     category,
                "tag":          tag,
                "published_at": pub_date.isoformat(),
                "is_published": True,
                "image_url":    image_url,
            })

    log.info(f"  Toplam {len(results)} haber bulundu")
    return results


def _extract_image(entry: dict, summary: str) -> str | None:
    """RSS entry'den fotoğraf URL'i çıkarır."""
    import re

    # 1. media:thumbnail
    for key in ["media_thumbnail", "media_content"]:
        media = entry.get(key)
        if media and isinstance(media, list) and media[0].get("url"):
            return media[0]["url"]

    # 2. enclosures (podcast/rss standart)
    for enc in entry.get("enclosures", []):
        if enc.get("type", "").startswith("image"):
            return enc.get("href") or enc.get("url")

    # 3. links içinde image
    for link in entry.get("links", []):
        if link.get("type", "").startswith("image"):
            return link.get("href")

    # 4. HTML içinde ilk <img> src
    html = summary or entry.get("content", [{}])[0].get("value", "") if entry.get("content") else summary
    if html:
        m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html)
        if m:
            url = m.group(1)
            if url.startswith("http"):
                return url

    return None


def _strip_html(text: str) -> str:
    """Basit HTML tag temizleyici."""
    import re
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


# ── Supabase'e yazma ──────────────────────────────────────────────────────────

def save_news(news_items: list[dict]) -> int:
    """
    Haberleri Supabase'e yazar.
    Aynı başlık + tarih kombinasyonu varsa atlar (duplicate önleme).
    """
    if not news_items:
        return 0

    from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
    from supabase import create_client

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Mevcut son 7 günün başlıklarını çek
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    existing = client.table("news").select("title").gte("published_at", week_ago).execute()
    existing_titles = {r["title"].strip().lower() for r in (existing.data or [])}

    # Duplicate olmayanları filtrele
    new_items = [
        item for item in news_items
        if item["title"].strip().lower() not in existing_titles
    ]

    if not new_items:
        log.info("  Yeni haber yok (tümü zaten mevcut)")
        return 0

    result = client.table("news").insert(new_items).execute()
    count = len(result.data) if result.data else 0
    log.info(f"  {count} yeni haber eklendi")
    return count


def run_news_fetch() -> int:
    """Ana fonksiyon — main.py'den çağrılır."""
    log.info("=== Haber çekme başlatıldı ===")
    items = fetch_news()
    written = save_news(items)
    log.info(f"=== Haber çekme tamamlandı: {written} yeni haber ===")
    return written
