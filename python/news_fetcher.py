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

import os
import logging
import hashlib
import time
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import feedparser
import requests

log = logging.getLogger("kritik-bot.news")


# ── Çeviri ────────────────────────────────────────────────────────────────────

def _claude_client():
    """Anthropic istemcisini lazy başlatır."""
    import anthropic
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


def translate_to_turkish(text: str) -> str:
    """
    İngilizce metni Claude Haiku ile Türkçeye çevirir.
    Takım adları, oyuncu isimleri, ülke/şehir adları olduğu gibi korunur.
    Hata durumunda orijinal metni döner.
    """
    if not text or len(text.strip()) < 5:
        return text

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return text

    try:
        client = _claude_client()
        msg = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=400,
            messages=[{
                "role": "user",
                "content": (
                    "Aşağıdaki İngilizce spor haberini Türkçeye çevir.\n"
                    "KURALLAR:\n"
                    "- Takım adlarını (Manchester City, Real Madrid vb.) olduğu gibi bırak.\n"
                    "- Oyuncu ve antrenör isimlerini olduğu gibi bırak.\n"
                    "- Ülke ve şehir adlarını doğru çevir (USA → ABD, England → İngiltere).\n"
                    "- Lig adlarını olduğu gibi bırak (Premier League, La Liga vb.).\n"
                    "- Sadece çeviriyi yaz, açıklama ekleme.\n\n"
                    f"{text[:1000]}"
                ),
            }],
        )
        return msg.content[0].text.strip() or text
    except Exception as e:
        log.debug(f"Çeviri hatası (Claude): {e}")
        return text


def translate_item(title: str, summary: str) -> tuple[str, str]:
    """Başlık ve özeti tek Claude çağrısıyla birlikte çevirir."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return title, summary

    try:
        client = _claude_client()
        msg = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": (
                    "Aşağıdaki İngilizce spor haberi başlığını ve özetini Türkçeye çevir.\n"
                    "KURALLAR:\n"
                    "- Takım adlarını (Manchester City, Real Madrid vb.) olduğu gibi bırak.\n"
                    "- Oyuncu ve antrenör isimlerini olduğu gibi bırak.\n"
                    "- Ülke ve şehir adlarını doğru çevir (USA → ABD, England → İngiltere).\n"
                    "- Lig adlarını olduğu gibi bırak (Premier League, La Liga vb.).\n"
                    "- Yanıtı SADECE şu formatta ver (başka hiçbir şey yazma):\n"
                    "BAŞLIK: [çevrilmiş başlık]\n"
                    "ÖZET: [çevrilmiş özet]\n\n"
                    f"BAŞLIK: {title}\n"
                    f"ÖZET: {summary}"
                ),
            }],
        )
        raw = msg.content[0].text.strip()
        tr_title   = title
        tr_summary = summary
        for line in raw.splitlines():
            if line.startswith("BAŞLIK:"):
                tr_title = line[len("BAŞLIK:"):].strip() or title
            elif line.startswith("ÖZET:"):
                tr_summary = line[len("ÖZET:"):].strip() or summary
        return tr_title, tr_summary
    except Exception as e:
        log.debug(f"Çeviri hatası (Claude): {e}")
        return title, summary

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

            # Tam içerik — RSS'te varsa al (genellikle content[0].value)
            raw_content = ""
            if entry.get("content"):
                raw_content = entry["content"][0].get("value", "") or ""
            if not raw_content:
                raw_content = summary or ""
            clean_content = _strip_html(raw_content)[:3000] if raw_content else ""

            # Kaynak URL
            source_url = entry.get("link") or entry.get("url") or None

            # Fotoğraf çek
            image_url = _extract_image(entry, summary)

            # İngilizce haberleri Türkçeye çevir
            if feed_cfg["lang"] == "en":
                log.debug(f"    Çevriliyor: {title[:50]}...")
                title, clean_summary = translate_item(title, clean_summary)

            results.append({
                "title":        title[:200],
                "summary":      clean_summary,
                "content":      clean_content or None,
                "source_url":   source_url,
                "category":     category,
                "sport":        _detect_sport(title, clean_summary),
                "topic":        _detect_basketball_topic(title, clean_summary) if _detect_sport(title, clean_summary) == "Basketbol" else _detect_topic(title, clean_summary),
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


_SPORTS: list[tuple[str, list[str]]] = [
    ("Basketbol", [
        "basketbol", "basketball", "nba", "euroleague", "euro league",
        "beko", "anadolu efes", "panathinaikos", "olimpia", "baskonia",
        "bsl", "basketlig", "potaya", "ribaunt",
    ]),
    ("Diğer Sporlar", [
        "tenis", "tennis", "wimbledon", "roland garros", "us open", "atp", "wta",
        "formula 1", "formula1", "f1", "ferrari", "verstappen", "hamilton",
        "voleybol", "volleyball", "hentbol", "atletizm", "yüzme", "boks",
        "güreş", "judo", "taekwondo", "olimpiyat", "olympic", "motogp",
    ]),
]

_BASKETBALL_TOPICS: list[tuple[str, list[str]]] = [
    ("NBA",        ["nba", "los angeles", "boston celtics", "golden state", "miami heat", "new york knicks"]),
    ("EuroLeague", ["euroleague", "euro league", "beko", "anadolu efes", "panathinaikos", "olimpia", "baskonia"]),
    ("BSL",        ["bsl", "basketlig", "türkiye basketbol", "galatasaray nk", "fenerbahçe beko", "efes", "pınar"]),
]

def _detect_sport(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for sport, keywords in _SPORTS:
        if any(kw in text for kw in keywords):
            return sport
    return "Futbol"

def _detect_basketball_topic(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for topic, keywords in _BASKETBALL_TOPICS:
        if any(kw in text for kw in keywords):
            return topic
    return "Genel"


_TOPICS: list[tuple[str, list[str]]] = [
    ("Dünya Kupası",      ["dünya kupas", "world cup", "fifa world", "copa mundial", "2026 kupa"]),
    ("Şampiyonlar Ligi",  ["şampiyonlar ligi", "champions league", "ucl", "uefa champions"]),
    ("Süper Lig",         ["galatasaray", "fenerbahçe", "fenerbahce", "beşiktaş", "besiktas",
                           "trabzonspor", "başakşehir", "basaksehir", "süper lig", "super lig",
                           "kayserispor", "sivasspor", "antalyaspor", "konyaspor", "alanyaspor",
                           "rizespor", "kasımpaşa", "samsunspor", "pendikspor", "hatayspor"]),
    ("Premier Lig",       ["premier league", "premier lig", "man city", "man utd", "manchester",
                           "arsenal", "liverpool", "chelsea", "tottenham", "newcastle",
                           "aston villa", "west ham", "brighton", "everton"]),
    ("La Liga",           ["la liga", "laliga", "real madrid", "barcelona", "atletico",
                           "sevilla", "valencia", "villarreal", "athletic bilbao"]),
    ("Bundesliga",        ["bundesliga", "bayern", "dortmund", "bvb", "leverkusen",
                           "leipzig", "frankfurt", "stuttgard", "wolfsburg"]),
    ("Serie A",           ["serie a", "juventus", "inter milan", "ac milan", "napoli",
                           "roma", "lazio", "atalanta", "fiorentina"]),
    ("Transfer",          ["transfer", "bonservis", "imzala", "sözleşme", "sozlesme",
                           "signing", "signed", "deal", "move to", "joined", "ayrıldı"]),
]

def _detect_topic(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for topic, keywords in _TOPICS:
        if any(kw in text for kw in keywords):
            return topic
    return "Genel"


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
