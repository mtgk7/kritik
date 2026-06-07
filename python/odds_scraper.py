"""
Türk bahis sitelerinden oran çekici.
Kaynaklar: iddaa.com (devlet), misli.com, nesine.com

Kullanım:
  python odds_scraper.py          → DB'ye yaz
  python odds_scraper.py --test   → API yanıtlarını ekrana bas, DB'ye yazma
"""

import logging
import sys
import time
import json
from datetime import datetime, timezone, timedelta

import requests
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

log = logging.getLogger("odds-scraper")

TEST_MODE = "--test" in sys.argv

# ── HTTP Session ──────────────────────────────────────────────────────────────

_session = requests.Session()
_session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
})

TR_MAP = str.maketrans("çşğüöıÇŞĞÜÖİ", "csguoiCSGUOI")


def norm(name: str) -> str:
    return name.lower().translate(TR_MAP).strip()


def get(url: str, retries: int = 3, **kwargs) -> dict | list | None:
    """Retry'lı GET — None döndürürse kaynak çevrimdışı, bloklu veya HTML döndü."""
    for attempt in range(retries):
        try:
            r = _session.get(url, timeout=15, **kwargs)
            if r.status_code == 429:
                wait = 2 ** attempt
                log.warning(f"Rate-limit ({url[:50]}), {wait}s bekleniyor...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            ct = r.headers.get("content-type", "")
            # HTML dönüyorsa (login yönlendirme, SPA shell, vb.) None döndür
            if "html" in ct and "json" not in ct:
                log.debug(f"HTML yanıt (auth gerekli?): {url[:60]}")
                return None
            return r.json()
        except requests.exceptions.HTTPError as e:
            log.warning(f"HTTP hata [{attempt+1}/{retries}] {url[:60]}: {e}")
        except requests.exceptions.RequestException as e:
            log.warning(f"İstek başarısız [{attempt+1}/{retries}] {url[:60]}: {e}")
        except ValueError:
            log.debug(f"JSON parse hatası: {url[:60]}")
            return None
        if attempt < retries - 1:
            time.sleep(1)
    return None


def _test_dump(source: str, data) -> None:
    if TEST_MODE:
        print(f"\n{'='*60}")
        print(f"[TEST] {source} yanıtı:")
        try:
            print(json.dumps(data, ensure_ascii=False, indent=2)[:3000])
        except Exception:
            print(repr(data)[:3000])


# ── İddaa.com ─────────────────────────────────────────────────────────────────

def scrape_iddaa() -> list[dict]:
    """
    sportsbookv2.iddaa.com API — Spor Toto devlet bahis sistemi.
    Dönen format: [{home, away, ms1, x, ms2, over25, under25}]
    """
    results = []
    base = "https://sportsbookv2.iddaa.com/sportsbook"

    # İddaa ana sayfasına önce GET at (cookie al)
    _session.get("https://www.iddaa.com/spor/futbol", timeout=10)

    comps_data = get(base + "/competitions?sportId=1&language=tr")
    if not comps_data:
        log.warning("İddaa: competitions endpoint yanıt vermedi")
        return results

    _test_dump("iddaa competitions", comps_data)

    comps = comps_data if isinstance(comps_data, list) else (
        comps_data.get("data") or comps_data.get("competitions") or []
    )
    log.info(f"İddaa: {len(comps)} lig bulundu")

    for comp in comps[:60]:
        comp_id = (
            comp.get("i") or comp.get("id") or
            comp.get("competitionId") or comp.get("cId")
        )
        if not comp_id:
            continue

        ev_data = get(f"{base}/events?competitionId={comp_id}&language=tr")
        if not ev_data:
            continue

        _test_dump(f"iddaa events comp={comp_id}", ev_data)

        # Farklı API versiyonlarında event listesi farklı yerlerde
        events_raw = (
            ev_data if isinstance(ev_data, list) else (
                (ev_data.get("data") or {}).get("events") or
                ev_data.get("events") or
                ev_data.get("eventList") or []
            )
        )

        for e in events_raw:
            home = (
                e.get("ht") or e.get("homeTeamName") or
                e.get("homeName") or e.get("home") or ""
            )
            away = (
                e.get("at") or e.get("awayTeamName") or
                e.get("awayName") or e.get("away") or ""
            )
            if not home or not away:
                continue

            ms1 = x = ms2 = over25 = under25 = kg_var = kg_yok = None
            outcomes = e.get("oc") or e.get("outcomes") or e.get("markets") or {}

            def _parse_outcomes(items):
                nonlocal ms1, x, ms2, over25, under25, kg_var, kg_yok
                if isinstance(items, dict):
                    items = list(items.values())
                for o in (items or []):
                    if not isinstance(o, dict):
                        continue
                    try:
                        rate = float(
                            o.get("r") or o.get("rate") or o.get("price") or o.get("odd") or 0
                        )
                    except Exception:
                        continue
                    if not rate:
                        continue
                    t = str(
                        o.get("ot") or o.get("type") or o.get("name") or o.get("outcomeType") or ""
                    ).upper()
                    if t in ("1", "MS1", "HOME", "EV SAHİBİ"):
                        ms1 = rate
                    elif t in ("0", "X", "TIE", "DRAW", "BERABERLİK"):
                        x = rate
                    elif t in ("2", "MS2", "AWAY", "DEPLASMaN", "DEPLASMAN"):
                        ms2 = rate
                    elif "2.5" in t and ("+" in t or "ÜST" in t or "OVER" in t or "U" == t[-1:]):
                        over25 = rate
                    elif "2.5" in t and ("-" in t or "ALT" in t or "UNDER" in t):
                        under25 = rate
                    elif "KG" in t and ("VAR" in t or "YES" in t):
                        kg_var = rate
                    elif "KG" in t and ("YOK" in t or "NO" in t):
                        kg_yok = rate

            _parse_outcomes(outcomes)

            if ms1 and ms2:
                results.append({
                    "home": home, "away": away,
                    "ms1": ms1, "x": x, "ms2": ms2,
                    "over25": over25, "under25": under25,
                    "kg_var": kg_var, "kg_yok": kg_yok,
                })

        time.sleep(0.15)

    log.info(f"İddaa: {len(results)} maç oranı")
    return results


# ── Misli.com ─────────────────────────────────────────────────────────────────

def scrape_misli() -> list[dict]:
    """Misli.com — Türkiye Jokey Kulübü iştirakı."""
    results = []

    # Ana sayfaya önce git (session cookie al)
    _session.get("https://www.misli.com/", timeout=10)

    # Farklı endpoint versiyonları dene
    endpoints = [
        "https://apivx.misli.com/api/web/v1/sportsbook/event-list?sportId=1&marketCount=3",
        "https://apivx.misli.com/api/web/v2/sportsbook/event-list?sportId=1",
        "https://apivx.misli.com/api/web/v1/football/event-list",
        "https://aggr.misli.com/api/web/v1/sportsbook/event-list?sportId=1",
    ]

    data = None
    for ep in endpoints:
        data = get(ep)
        if data and (data.get("success") or data.get("data") or isinstance(data, list)):
            log.info(f"Misli endpoint çalıştı: {ep}")
            _test_dump(f"misli {ep}", data)
            break
        log.debug(f"Misli endpoint başarısız: {ep}")

    if not data:
        log.warning("Misli: tüm endpoint'ler yanıt vermedi")
        return results

    events: list = []
    if isinstance(data, list):
        events = data
    elif isinstance(data, dict):
        events = (
            data.get("data") or
            (data.get("data") or {}).get("events") or
            data.get("events") or
            data.get("eventList") or []
        )

    for e in events:
        home = (
            e.get("homeTeamName") or e.get("ht") or
            e.get("homeName") or e.get("home") or ""
        )
        away = (
            e.get("awayTeamName") or e.get("at") or
            e.get("awayName") or e.get("away") or ""
        )
        if not home or not away:
            continue

        ms1 = x = ms2 = over25 = under25 = None
        markets = e.get("markets") or e.get("odds") or e.get("outcomes") or []

        for m in (markets if isinstance(markets, list) else [markets]):
            if not isinstance(m, dict):
                continue
            market_type = str(
                m.get("marketType") or m.get("type") or m.get("name") or ""
            ).upper()
            selections = m.get("outcomes") or m.get("selections") or m.get("odds") or []
            for o in (selections if isinstance(selections, list) else []):
                try:
                    rate = float(
                        o.get("price") or o.get("rate") or o.get("r") or o.get("odd") or 0
                    )
                except Exception:
                    continue
                if not rate:
                    continue
                name = str(
                    o.get("name") or o.get("type") or o.get("label") or ""
                ).upper()
                if "1X2" in market_type or "MS" in market_type or "MATCH" in market_type:
                    if name in ("1", "MS1", "HOME", "EV SAHİBİ"):
                        ms1 = rate
                    elif name in ("X", "DRAW", "BERABERLİK", "0"):
                        x = rate
                    elif name in ("2", "MS2", "AWAY", "DEPLASMAN"):
                        ms2 = rate
                if "2.5" in market_type or "ÜA" in market_type or "OVER" in market_type:
                    if any(k in name for k in ("+", "ÜST", "OVER", "ÜSTÜ")):
                        over25 = rate
                    elif any(k in name for k in ("-", "ALT", "UNDER", "ALTI")):
                        under25 = rate

        if ms1 and ms2:
            results.append({
                "home": home, "away": away,
                "ms1": ms1, "x": x, "ms2": ms2,
                "over25": over25, "under25": under25,
            })

    log.info(f"Misli: {len(results)} maç oranı")
    return results


# ── Nesine.com ────────────────────────────────────────────────────────────────

def scrape_nesine() -> list[dict]:
    """Nesine.com — özel lisanslı bahis platformu."""
    results = []

    # Nesine'ye önce git (cookie/session kur)
    _session.get("https://www.nesine.com/", timeout=10)

    endpoints = [
        "https://www.nesine.com/api/sportsbook/football/prematch",
        "https://www.nesine.com/api/v1/sportsbook/events?sportId=1",
        "https://api.nesine.com/v1/sportsbook/events?sportId=1",
        "https://sportsbookservice.nesine.com/sportsbook/football/events",
    ]

    data = None
    for ep in endpoints:
        data = get(ep)
        if data:
            log.info(f"Nesine endpoint çalıştı: {ep}")
            _test_dump(f"nesine {ep}", data)
            break
        log.debug(f"Nesine endpoint başarısız: {ep}")

    if not data:
        log.warning("Nesine: API yanıt vermedi")
        return results

    events = data if isinstance(data, list) else (
        data.get("data") or data.get("events") or data.get("eventList") or []
    )

    for e in (events if isinstance(events, list) else []):
        home = e.get("homeTeam") or e.get("ht") or e.get("homeName") or ""
        away = e.get("awayTeam") or e.get("at") or e.get("awayName") or ""
        if not home or not away:
            continue

        def _safe_float(val) -> float | None:
            try:
                v = float(val or 0)
                return v if v > 1.0 else None
            except Exception:
                return None

        ms1 = _safe_float(e.get("homeOdd") or e.get("ms1") or e.get("1") or e.get("odd1"))
        x   = _safe_float(e.get("drawOdd") or e.get("x")   or e.get("X") or e.get("oddX"))
        ms2 = _safe_float(e.get("awayOdd") or e.get("ms2") or e.get("2") or e.get("odd2"))

        if ms1 and ms2:
            results.append({"home": home, "away": away, "ms1": ms1, "x": x, "ms2": ms2})

    log.info(f"Nesine: {len(results)} maç oranı")
    return results


# ── Eşleştirme & DB ───────────────────────────────────────────────────────────

def match_to_db(client, scraped: list[dict], source: str) -> int:
    """Çekilen oranları DB'deki maçlarla eşleştirip kaydeder."""
    if not scraped:
        return 0

    now = datetime.now(timezone.utc)
    rows = (
        client.table("matches")
        .select("id, home_team, away_team")
        .neq("status", "bitti")
        .gte("match_time", now.isoformat())
        .lte("match_time", (now + timedelta(days=7)).isoformat())
        .execute()
        .data or []
    )

    db_idx: dict[str, str] = {}
    for row in rows:
        key = f"{norm(row['home_team'])}|{norm(row['away_team'])}"
        db_idx[key] = row["id"]

    saved = 0
    for odds in scraped:
        key = f"{norm(odds['home'])}|{norm(odds['away'])}"
        match_id = db_idx.get(key)
        if not match_id:
            continue

        client.table("match_odds").insert({
            "match_id":  match_id,
            "source":    source,
            "ms1":       odds.get("ms1"),
            "x":         odds.get("x"),
            "ms2":       odds.get("ms2"),
            "over25":    odds.get("over25"),
            "under25":   odds.get("under25"),
            "kg_var":    odds.get("kg_var"),
            "kg_yok":    odds.get("kg_yok"),
        }).execute()

        client.table("matches").update({
            "market_odds": {
                "ms1":      odds.get("ms1"),
                "x":        odds.get("x"),
                "ms2":      odds.get("ms2"),
                "over25":   odds.get("over25"),
                "under25":  odds.get("under25"),
                "kg_var":   odds.get("kg_var"),
                "kg_yok":   odds.get("kg_yok"),
                "source":   source,
                "updated_at": now.isoformat(),
            }
        }).eq("id", match_id).execute()

        saved += 1

    return saved


def run() -> int:
    """Tüm kaynaklardan çek, DB'ye yaz. Toplam kaydedilen sayı döner."""
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    total = 0

    sources = [
        ("iddaa",  scrape_iddaa),
        ("misli",  scrape_misli),
        ("nesine", scrape_nesine),
    ]

    for source_name, scrape_fn in sources:
        try:
            odds = scrape_fn()
            if TEST_MODE:
                print(f"\n[TEST] {source_name}: {len(odds)} maç oranı döndü")
                for o in odds[:5]:
                    print(f"  {o['home']} - {o['away']}: MS1={o['ms1']} X={o['x']} MS2={o['ms2']}")
            else:
                saved = match_to_db(client, odds, source_name)
                total += saved
                log.info(f"{source_name}: {len(odds)} çekildi, {saved} DB'ye eşleşti")
        except Exception as e:
            log.error(f"{source_name} hatası: {e}", exc_info=True)

    if not TEST_MODE:
        log.info(f"Toplam {total} maç oranı DB'ye kaydedildi")

    return total


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG if TEST_MODE else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    run()
