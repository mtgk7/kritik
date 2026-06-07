"""
SofaScore istatistik çekici.
- H2H (kafa kafaya son 10 maç)
- Takım son 5 maç (event ID üzerinden, search API'ye gerek yok)

Kullanım: python sofascore_stats.py
"""

import logging
import time
from datetime import datetime, timezone, timedelta

import requests
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

log = logging.getLogger("sofascore-stats")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://www.sofascore.com/",
}


def _get(url: str) -> dict | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 403:
            log.warning(f"403 — SofaScore engelledi: {url}")
            return None
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log.warning(f"İstek başarısız: {url} — {e}")
        return None


def fetch_h2h(event_id: int) -> dict | None:
    """İki takım arasındaki son 10 maçı çeker."""
    data = _get(f"https://api.sofascore.com/api/v1/event/{event_id}/h2h")
    if not data:
        return None

    teams_events = data.get("teamDuel", {})
    all_events   = (data.get("events") or [])[:10]

    if not all_events:
        return None

    matches = []
    for e in all_events:
        ht  = e.get("homeTeam", {})
        at  = e.get("awayTeam", {})
        hs  = (e.get("homeScore") or {}).get("current", 0) or 0
        as_ = (e.get("awayScore") or {}).get("current", 0) or 0
        ts  = e.get("startTimestamp", 0)
        try:
            date = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%d.%m.%Y")
        except Exception:
            date = ""

        if hs > as_:
            result = "ev"
        elif as_ > hs:
            result = "dep"
        else:
            result = "b"

        matches.append({
            "date":      date,
            "home":      ht.get("name", ""),
            "away":      at.get("name", ""),
            "home_score": hs,
            "away_score": as_,
            "result":    result,
            "tournament": e.get("tournament", {}).get("name", ""),
        })

    home_wins  = sum(1 for m in matches if m["result"] == "ev")
    draws      = sum(1 for m in matches if m["result"] == "b")
    away_wins  = sum(1 for m in matches if m["result"] == "dep")

    return {
        "matches":   matches,
        "home_wins": home_wins,
        "draws":     draws,
        "away_wins": away_wins,
        "total":     len(matches),
    }


def fetch_last5_by_team_id(team_id: int, team_name: str) -> dict | None:
    """SofaScore team ID'si ile son 5 maçı çeker."""
    data = _get(f"https://api.sofascore.com/api/v1/team/{team_id}/events/last/0")
    if not data:
        return None

    events   = data.get("events", [])
    finished = [e for e in events if e.get("status", {}).get("type") in ("finished", "awarded")][-5:]

    if not finished:
        return None

    matches = []
    wins = draws = losses = goals_for = goals_against = 0

    for e in finished:
        home = e.get("homeTeam", {})
        away = e.get("awayTeam", {})
        hs   = int((e.get("homeScore") or {}).get("current") or 0)
        as_  = int((e.get("awayScore") or {}).get("current") or 0)
        ts   = e.get("startTimestamp", 0)

        is_home    = home.get("id") == team_id
        team_score = hs if is_home else as_
        opp_score  = as_ if is_home else hs
        opponent   = away.get("name", "?") if is_home else home.get("name", "?")

        if team_score > opp_score:
            result = "G"; wins += 1
        elif team_score < opp_score:
            result = "M"; losses += 1
        else:
            result = "B"; draws += 1

        goals_for     += team_score
        goals_against += opp_score

        try:
            date = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%d.%m.%Y")
        except Exception:
            date = ""

        matches.append({
            "result":         result,
            "opponent":       opponent,
            "team_score":     team_score,
            "opponent_score": opp_score,
            "was_home":       is_home,
            "date":           date,
        })

    return {
        "team":          team_name,
        "played":        len(matches),
        "wins":          wins,
        "draws":         draws,
        "losses":        losses,
        "goals_for":     goals_for,
        "goals_against": goals_against,
        "yellow_cards":  0,
        "red_cards":     0,
        "matches":       matches,
    }


def run():
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # sofascore_id'si olan ama h2h_data'sı olmayan yaklaşan maçlar
    now = datetime.now(timezone.utc).isoformat()
    rows = (
        client.table("matches")
        .select("id, home_team, away_team, sofascore_id, sofascore_home_id, sofascore_away_id")
        .not_.is_("sofascore_id", "null")
        .is_("h2h_data", "null")
        .gte("match_time", (datetime.now(timezone.utc) - timedelta(days=1)).isoformat())
        .execute()
        .data or []
    )

    log.info(f"{len(rows)} maç için istatistik çekilecek")

    for row in rows:
        event_id  = row.get("sofascore_id")
        home_id   = row.get("sofascore_home_id")
        away_id   = row.get("sofascore_away_id")

        patch: dict = {}

        # H2H
        if event_id:
            h2h = fetch_h2h(event_id)
            if h2h:
                patch["h2h_data"] = h2h
                log.info(f"  H2H: {row['home_team']} vs {row['away_team']} — {h2h['total']} maç")
            time.sleep(0.5)

        # Son 5 maç (SofaScore team ID ile)
        if home_id and not row.get("home_last5_data"):
            last5 = fetch_last5_by_team_id(home_id, row["home_team"])
            if last5:
                patch["home_last5_data"] = last5
            time.sleep(0.5)

        if away_id and not row.get("away_last5_data"):
            last5 = fetch_last5_by_team_id(away_id, row["away_team"])
            if last5:
                patch["away_last5_data"] = last5
            time.sleep(0.5)

        if patch:
            client.table("matches").update(patch).eq("id", row["id"]).execute()

    log.info("=== Tamamlandı ===")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run()
