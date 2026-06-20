"""
Odds Cron Worker — api-football.com /odds endpoint'ini kullanır.

  python odds_cron.py --once    → tek seferlik çalıştır ve çık
  python odds_cron.py           → 30 dakikada bir döngü

DB'deki yaklaşan maçları tarih bazlı api-football odds endpoint'inden
eşleştirip market_odds sütununu günceller.
"""

import re
import sys
import time
import logging
from datetime import datetime, timezone, timedelta

import requests
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, API_KEY, API_HOST

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("odds-cron")

NORMAL_INTERVAL = 30 * 60   # saniye
BOOKMAKER_ID    = 8          # Bet365 — en geniş kapsam

_SESSION: requests.Session | None = None


def _session() -> requests.Session:
    global _SESSION
    if _SESSION is None:
        _SESSION = requests.Session()
        _SESSION.headers.update({
            "x-apisports-key":  API_KEY,
            "x-apisports-host": API_HOST,
        })
    return _SESSION


def _get_odds_by_date(date_str: str) -> list[dict]:
    """Belirtilen tarih (YYYY-MM-DD) için tüm maç oranlarını çeker."""
    try:
        r = _session().get(
            f"https://{API_HOST}/odds",
            params={"date": date_str, "bookmaker": BOOKMAKER_ID, "bet": "1,5"},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        if data.get("errors"):
            log.warning(f"API hata [{date_str}]: {data['errors']}")
            return []
        return data.get("response", [])
    except Exception as e:
        log.warning(f"Odds çekme hatası [{date_str}]: {e}")
        return []


def _norm(name: str) -> str:
    """Takım adını normalize et — küçük harf, özel karakter yok."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _safe_float(val) -> float | None:
    try:
        v = float(val or 0)
        return v if v > 1.0 else None
    except Exception:
        return None


def _parse_odds(item: dict) -> dict | None:
    """API yanıtından {ms1, x, ms2, over25, under25} çıkar."""
    ms1 = x = ms2 = over25 = under25 = None
    for bm in item.get("bookmakers", []):
        for bet in bm.get("bets", []):
            bid   = bet.get("id")
            bname = (bet.get("name") or "").upper()
            vals  = bet.get("values", [])
            if bid == 1 or "MATCH WINNER" in bname or "1X2" in bname:
                for v in vals:
                    val = str(v.get("value", "")).upper()
                    odd = _safe_float(v.get("odd"))
                    if val in ("HOME", "1"):    ms1 = odd
                    elif val in ("DRAW", "X"): x   = odd
                    elif val in ("AWAY", "2"): ms2 = odd
            elif bid == 5 or "OVER/UNDER" in bname or "GOALS" in bname:
                for v in vals:
                    val = str(v.get("value", "")).upper()
                    odd = _safe_float(v.get("odd"))
                    if "OVER" in val and "2.5" in val:  over25  = odd
                    elif "UNDER" in val and "2.5" in val: under25 = odd
        if ms1 and ms2:
            break
    if not (ms1 and ms2):
        return None
    return {"ms1": ms1, "x": x, "ms2": ms2, "over25": over25, "under25": under25}


def run_once(client) -> int:
    """DB'deki yaklaşan maçları odds ile eşleştirip günceller. Kaydedilen sayısını döndürür."""
    now  = datetime.now(timezone.utc)
    end  = now + timedelta(days=7)

    rows = (
        client.table("matches")
        .select("id, home_team, away_team, match_time")
        .neq("status", "bitti")
        .gte("match_time", now.isoformat())
        .lte("match_time", end.isoformat())
        .execute()
        .data or []
    )

    if not rows:
        log.info("Yaklaşan maç yok.")
        return 0

    # Tarih bazında grupla
    by_date: dict[str, list[dict]] = {}
    for row in rows:
        d = row["match_time"][:10]   # "YYYY-MM-DD"
        by_date.setdefault(d, []).append(row)

    saved = 0
    for date_str, db_matches in sorted(by_date.items()):
        log.info(f"  {date_str}: {len(db_matches)} DB maçı var, odds çekiliyor…")
        api_items = _get_odds_by_date(date_str)
        log.info(f"  → API'den {len(api_items)} maç geldi")

        # Normalize edilmiş isim → odds sözlüğü
        api_map: dict[tuple, dict] = {}
        for item in api_items:
            fx = item.get("fixture", {})
            ht = _norm(item.get("teams", {}).get("home", {}).get("name", ""))
            at = _norm(item.get("teams", {}).get("away", {}).get("name", ""))
            if ht and at:
                odds = _parse_odds(item)
                if odds:
                    api_map[(ht, at)] = odds

        for db in db_matches:
            dh = _norm(db["home_team"])
            da = _norm(db["away_team"])

            odds = api_map.get((dh, da))

            # Tam eşleşme yoksa kısmi eşleştir (en az 5 karakter paylaşan)
            if odds is None:
                for (ah, aa), o in api_map.items():
                    if len(dh) >= 5 and len(da) >= 5:
                        if (dh in ah or ah in dh) and (da in aa or aa in da):
                            odds = o
                            log.info(f"    Kısmi eşleşme: {db['home_team']} vs {db['away_team']} → {ah} vs {aa}")
                            break

            if odds:
                client.table("matches").update({"market_odds": odds}).eq("id", db["id"]).execute()
                saved += 1
                log.info(f"    ✓ {db['home_team']} vs {db['away_team']}: ms1={odds['ms1']} x={odds['x']} ms2={odds['ms2']} üst2.5={odds.get('over25')}")
            else:
                log.debug(f"    — {db['home_team']} vs {db['away_team']}: eşleşme yok")

        time.sleep(0.3)

    log.info(f"Toplam güncellenen: {saved}/{len(rows)}")
    return saved


def run_loop() -> None:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    log.info("Odds Cron Worker başlatıldı (api-football)")
    while True:
        log.info("─── Oran çekme başlıyor ───")
        run_once(client)
        next_run = datetime.now(timezone.utc) + timedelta(seconds=NORMAL_INTERVAL)
        log.info(f"─── Sonraki: {NORMAL_INTERVAL // 60} dk sonra — {next_run.strftime('%H:%M UTC')} ───")
        time.sleep(NORMAL_INTERVAL)


if __name__ == "__main__":
    if "--once" in sys.argv:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        run_once(_client)
    else:
        run_loop()
