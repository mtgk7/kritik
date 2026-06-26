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


def _fetch_event_stats(event_id: int, is_home: bool) -> dict:
    """Tek maçın şut, possession, corner, pas istatistiklerini çeker."""
    data = _get(f"https://api.sofascore.com/api/v1/event/{event_id}/statistics")
    if not data:
        return {}

    stats_list = data.get("statistics", [])
    period_data = next((s for s in stats_list if s.get("period") == "ALL"), None)
    if not period_data:
        return {}

    side = "homeValue" if is_home else "awayValue"
    values: dict[str, float] = {}
    for group in period_data.get("groups", []):
        for item in group.get("statisticsItems", []):
            name = (item.get("name") or "").lower()
            val  = item.get(side)
            if val is not None:
                try:
                    values[name] = float(val)
                except (ValueError, TypeError):
                    pass

    result: dict[str, float] = {}
    for key in ["total shots", "shots total"]:
        if key in values:
            result["shots_total"] = values[key]; break
    for key in ["shots on target", "on target"]:
        if key in values:
            result["shots_on_target"] = values[key]; break
    if "ball possession" in values:
        result["possession"] = values["ball possession"]
    for key in ["accurate passes, %", "accurate passes %", "passes accurate, %"]:
        if key in values:
            result["pass_accuracy"] = values[key]; break
    for key in ["corner kicks", "corners"]:
        if key in values:
            result["corners"] = values[key]; break
    for key in ["fouls", "total fouls"]:
        if key in values:
            result["fouls"] = values[key]; break

    return result


def _fetch_event_goal_halves(event_id: int, team_id: int, is_home: bool) -> dict:
    """Maçtaki gollerin ilk/ikinci yarı dağılımını çeker."""
    data = _get(f"https://api.sofascore.com/api/v1/event/{event_id}/incidents")
    if not data:
        return {}

    goals_1h = goals_2h = conceded_1h = conceded_2h = 0

    for inc in data.get("incidents", []):
        if inc.get("incidentType") != "goal":
            continue
        cls = inc.get("incidentClass", "")
        if cls == "missedPenalty":
            continue

        minute    = inc.get("time", 0) or 0
        inc_home  = inc.get("isHome", False)
        own_goal  = cls == "ownGoal"

        # team scored if: (incident belongs to same side as team) XOR own_goal
        team_scored = (inc_home == is_home) != own_goal
        first_half  = minute <= 45

        if team_scored:
            if first_half: goals_1h += 1
            else:          goals_2h += 1
        else:
            if first_half: conceded_1h += 1
            else:          conceded_2h += 1

    return {
        "goals_first_half":    goals_1h,
        "goals_second_half":   goals_2h,
        "conceded_first_half": conceded_1h,
        "conceded_second_half": conceded_2h,
    }


def fetch_last5_by_team_id(team_id: int, team_name: str) -> dict | None:
    """SofaScore team ID'si ile son 5 maçı ve detaylı istatistikleri çeker."""
    data = _get(f"https://api.sofascore.com/api/v1/team/{team_id}/events/last/0")
    if not data:
        return None

    events   = data.get("events", [])
    finished = [e for e in events if e.get("status", {}).get("type") in ("finished", "awarded")][-5:]

    if not finished:
        return None

    matches = []
    wins = draws = losses = goals_for = goals_against = 0

    stat_buckets: dict[str, list[float]] = {
        "shots_total": [], "shots_on_target": [], "possession": [],
        "pass_accuracy": [], "corners": [], "fouls": [],
    }
    goal_halves = {"g1": 0, "g2": 0, "c1": 0, "c2": 0}

    for e in finished:
        home = e.get("homeTeam", {})
        away = e.get("awayTeam", {})
        hs   = int((e.get("homeScore") or {}).get("current") or 0)
        as_  = int((e.get("awayScore") or {}).get("current") or 0)
        ts   = e.get("startTimestamp", 0)
        eid  = e.get("id")

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

        # Detaylı istatistikler — SofaScore event ID ile
        if eid:
            ev_stats = _fetch_event_stats(eid, is_home)
            for key in stat_buckets:
                if key in ev_stats:
                    stat_buckets[key].append(ev_stats[key])
            time.sleep(0.3)

            halves = _fetch_event_goal_halves(eid, team_id, is_home)
            if halves:
                goal_halves["g1"] += halves["goals_first_half"]
                goal_halves["g2"] += halves["goals_second_half"]
                goal_halves["c1"] += halves["conceded_first_half"]
                goal_halves["c2"] += halves["conceded_second_half"]
            time.sleep(0.3)

    played = len(matches)

    extra: dict[str, float] = {}
    for key, vals in stat_buckets.items():
        if vals:
            extra[f"avg_{key}"] = round(sum(vals) / len(vals), 1)
    if played > 0:
        extra["avg_goals_first_half"]    = round(goal_halves["g1"] / played, 1)
        extra["avg_goals_second_half"]   = round(goal_halves["g2"] / played, 1)
        extra["avg_conceded_first_half"] = round(goal_halves["c1"] / played, 1)
        extra["avg_conceded_second_half"] = round(goal_halves["c2"] / played, 1)

    return {
        "team":          team_name,
        "played":        played,
        "wins":          wins,
        "draws":         draws,
        "losses":        losses,
        "goals_for":     goals_for,
        "goals_against": goals_against,
        "yellow_cards":  0,
        "red_cards":     0,
        "matches":       matches,
        **extra,
    }


TR_MAP = str.maketrans("çşğüöıÇŞĞÜÖİ", "csguoiCSGUOI")

def norm(name: str) -> str:
    return name.lower().translate(TR_MAP).strip()


def collect_event_ids(client) -> int:
    """Önümüzdeki 14 gün için SofaScore event ID'lerini toplar."""
    now = datetime.now(timezone.utc)
    # Tüm id'siz yaklaşan maçları çek
    rows = (
        client.table("matches")
        .select("id, home_team, away_team, match_time")
        .is_("sofascore_id", "null")
        .gte("match_time", now.isoformat())
        .lte("match_time", (now + timedelta(days=14)).isoformat())
        .execute()
        .data or []
    )

    if not rows:
        return 0

    # 14 günlük tüm SofaScore scheduled events'i çek
    idx: dict[str, dict] = {}
    for d in range(-1, 15):
        date_str = (now + timedelta(days=d)).date().isoformat()
        data = _get(f"https://api.sofascore.com/api/v1/sport/football/scheduled-events/{date_str}")
        if data:
            for e in data.get("events", []):
                ht = e.get("homeTeam", {}).get("name", "")
                at = e.get("awayTeam", {}).get("name", "")
                key = f"{norm(ht)}|{norm(at)}"
                idx[key] = e
        time.sleep(0.3)

    saved = 0
    for row in rows:
        key = f"{norm(row['home_team'])}|{norm(row['away_team'])}"
        event = idx.get(key)
        if event:
            client.table("matches").update({
                "sofascore_id":      event.get("id"),
                "sofascore_home_id": event.get("homeTeam", {}).get("id"),
                "sofascore_away_id": event.get("awayTeam", {}).get("id"),
            }).eq("id", row["id"]).execute()
            log.info(f"  ID kaydedildi: {row['home_team']} vs {row['away_team']} → {event.get('id')}")
            saved += 1

    return saved


def run():
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Önce eksik event ID'lerini topla
    saved = collect_event_ids(client)
    log.info(f"Event ID kaydedildi: {saved} maç")

    # sofascore_id'si olan ama h2h_data'sı olmayan yaklaşan maçlar
    rows = (
        client.table("matches")
        .select("id, home_team, away_team, sofascore_id, sofascore_home_id, sofascore_away_id, home_last5_data, away_last5_data")
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
