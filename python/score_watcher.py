"""
SofaScore Score Watcher
Canlı maç varken her 60 sn, yokken her 5 dakikada skor + durum günceller.
"""

import sys
import time
import logging
from datetime import datetime, timezone, timedelta

import requests
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("score-watcher")

SOFA_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://www.sofascore.com/",
}

LIVE_INTERVAL = 60
IDLE_INTERVAL = 300

STATUS_MAP = {
    "notstarted":  "yakında",
    "inprogress":  "canlı",
    "halftime":    "canlı",
    "pause":       "canlı",
    "interrupted": "canlı",
    "finished":    "bitti",
    "awarded":     "bitti",
    "postponed":   None,
    "canceled":    None,
    "cancelled":   None,
}

TR_MAP = str.maketrans("çşğüöıÇŞĞÜÖİ", "csguoiCSGUOI")


def norm(name: str) -> str:
    return name.lower().translate(TR_MAP).strip()


def fetch(url: str) -> list[dict]:
    try:
        r = requests.get(url, headers=SOFA_HEADERS, timeout=10)
        r.raise_for_status()
        return r.json().get("events", [])
    except Exception as e:
        log.warning(f"Fetch failed {url}: {e}")
        return []


def build_index(events: list[dict]) -> dict[str, dict]:
    idx = {}
    for e in events:
        key = f"{norm(e['homeTeam']['name'])}|{norm(e['awayTeam']['name'])}"
        idx[key] = e
    return idx


def check_prediction(prediction: str | None, home: int, away: int) -> bool | None:
    """Tahmin doğru mu? Maç bittikten sonra hesaplanır."""
    if not prediction:
        return None
    p = prediction.lower().strip()
    if p == "ms1":        return home > away
    if p == "ms2":        return away > home
    if p in ("x", "beraberlik"): return home == away
    if "2.5 üst" in p or "2.5üst" in p: return home + away > 2.5
    if "2.5 alt" in p or "2.5alt" in p: return home + away <= 2
    if "1.5 üst" in p or "1.5üst" in p: return home + away > 1.5
    if "1.5 alt" in p or "1.5alt" in p: return home + away <= 1
    if "kg var" in p:     return home > 0 and away > 0
    if "kg yok" in p:     return home == 0 or away == 0
    return None


def sync(client, idx: dict) -> int:
    rows = (
        client.table("matches")
        .select("id, home_team, away_team, status, prediction, prediction_correct, sofascore_id")
        .neq("status", "bitti")
        .execute()
        .data or []
    )

    updated = 0
    for row in rows:
        key = f"{norm(row['home_team'])}|{norm(row['away_team'])}"
        event = idx.get(key)
        if not event:
            continue

        sofa_type = event.get("status", {}).get("type", "notstarted")
        new_status = STATUS_MAP.get(sofa_type)
        if new_status is None:
            continue

        patch: dict = {"status": new_status}

        # SofaScore ID'lerini kaydet (link + H2H için)
        if not row.get("sofascore_id"):
            patch["sofascore_id"]      = event.get("id")
            patch["sofascore_home_id"] = event.get("homeTeam", {}).get("id")
            patch["sofascore_away_id"] = event.get("awayTeam", {}).get("id")

        if new_status in ("canlı", "bitti"):
            hs = (event.get("homeScore") or {}).get("current")
            as_ = (event.get("awayScore") or {}).get("current")
            if hs is not None:
                patch["home_score"] = hs
            if as_ is not None:
                patch["away_score"] = as_

        if new_status == "bitti" and row.get("prediction_correct") is None:
            hs = patch.get("home_score")
            as_ = patch.get("away_score")
            if hs is not None and as_ is not None:
                result = check_prediction(row.get("prediction"), int(hs), int(as_))
                if result is not None:
                    patch["prediction_correct"] = result

        client.table("matches").update(patch).eq("id", row["id"]).execute()
        score_str = f"{patch.get('home_score', '?')}-{patch.get('away_score', '?')}"
        correct_str = f" {'✓' if patch.get('prediction_correct') else '✗'}" if "prediction_correct" in patch else ""
        log.info(f"  {row['home_team']} - {row['away_team']} → {new_status} {score_str}{correct_str}")
        updated += 1

    return updated


def run_once(client) -> bool:
    """Tek sync geçişi. Canlı maç varsa True döner."""
    now = datetime.now(timezone.utc)
    today     = now.date().isoformat()
    tomorrow  = (now.date() + timedelta(days=1)).isoformat()
    yesterday = (now.date() - timedelta(days=1)).isoformat()

    live_events = fetch("https://api.sofascore.com/api/v1/sport/football/events/live")

    all_events = (
        live_events
        + fetch(f"https://api.sofascore.com/api/v1/sport/football/scheduled-events/{yesterday}")
        + fetch(f"https://api.sofascore.com/api/v1/sport/football/scheduled-events/{today}")
        + fetch(f"https://api.sofascore.com/api/v1/sport/football/scheduled-events/{tomorrow}")
    )

    idx = build_index(all_events)
    updated = sync(client, idx)
    log.info(f"Sync tamam — {updated} güncellendi | {'CANLI' if live_events else 'bekleme'}")
    return bool(live_events)


def run():
    """Sürekli döngü (Render worker için)."""
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    log.info("Score watcher başlatıldı (sürekli mod)")
    while True:
        has_live = run_once(client)
        time.sleep(LIVE_INTERVAL if has_live else IDLE_INTERVAL)


if __name__ == "__main__":
    if "--once" in sys.argv:
        # Cron modu: tek geçiş yap ve çık (GitHub Actions için)
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        run_once(client)
    else:
        run()
