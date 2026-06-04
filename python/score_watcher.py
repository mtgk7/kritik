"""
SofaScore Score Watcher
Canlı maç varken her 60 sn, yokken her 5 dakikada skor + durum günceller.
"""

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

TR_MAP = str.maketrans("çşğüöıÇŞĞÜÖİ", "csguo iCSGUOI")


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


def sync(client, idx: dict) -> int:
    rows = (
        client.table("matches")
        .select("id, home_team, away_team, status")
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

        if new_status in ("canlı", "bitti"):
            hs = (event.get("homeScore") or {}).get("current")
            as_ = (event.get("awayScore") or {}).get("current")
            if hs is not None:
                patch["home_score"] = hs
            if as_ is not None:
                patch["away_score"] = as_

        client.table("matches").update(patch).eq("id", row["id"]).execute()
        score_str = f"{patch.get('home_score', '?')}-{patch.get('away_score', '?')}"
        log.info(f"  {row['home_team']} - {row['away_team']} → {new_status} {score_str}")
        updated += 1

    return updated


def run():
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    log.info("Score watcher başlatıldı")

    while True:
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

        mode = "CANLI MOD" if live_events else "bekleme"
        sleep = LIVE_INTERVAL if live_events else IDLE_INTERVAL
        log.info(f"Sync tamam — {updated} güncellendi | {mode} | {sleep}s sonra tekrar")
        time.sleep(sleep)


if __name__ == "__main__":
    run()
