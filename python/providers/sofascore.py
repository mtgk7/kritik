"""
SofaScore son 5 maç verisi çekici.

Resmi API yok — aynı score_watcher.py'deki endpoint'ler kullanılıyor.
Takım ID'leri ilk çalıştırmada aranıp team_id_cache.json'a kaydedilir.
"""

import json
import logging
import os
import time
from pathlib import Path

import requests

log = logging.getLogger("sofascore-last5")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://www.sofascore.com/",
}

CACHE_FILE = Path(__file__).parent.parent / "team_id_cache.json"

_team_cache: dict[str, int] = {}


def _load_cache():
    global _team_cache
    if CACHE_FILE.exists():
        try:
            _team_cache = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except Exception:
            _team_cache = {}


def _save_cache():
    CACHE_FILE.write_text(json.dumps(_team_cache, ensure_ascii=False, indent=2), encoding="utf-8")


_load_cache()


def _get(url: str) -> dict | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log.warning(f"SofaScore isteği başarısız: {url} — {e}")
        return None


def find_team_id(team_name: str) -> int | None:
    """Takım adından SofaScore ID'si bulur. Cache'den döner, yoksa arar."""
    key = team_name.strip().lower()
    if key in _team_cache:
        return _team_cache[key]

    data = _get(f"https://api.sofascore.com/api/v1/search/all?q={requests.utils.quote(team_name)}")
    if not data:
        return None

    # En iyi eşleşmeyi bul (football takımı)
    for item in (data.get("results") or []):
        entity = item.get("entity", {})
        if entity.get("type") == "team" or item.get("type") == "team":
            team_id = entity.get("id") or item.get("id")
            if team_id:
                _team_cache[key] = team_id
                _save_cache()
                log.info(f"  SofaScore team ID: {team_name} → {team_id}")
                return team_id

    # Alternatif format
    for item in (data.get("teams") or []):
        team_id = item.get("id")
        if team_id:
            _team_cache[key] = team_id
            _save_cache()
            return team_id

    log.warning(f"  SofaScore'da takım bulunamadı: {team_name}")
    return None


def get_last5(team_name: str, team_id: int | None = None) -> dict | None:
    """
    Takımın son 5 maçını SofaScore'dan çeker.
    Doğrudan Last5Data formatında dict döndürür (main.py'ye hazır).
    """
    tid = team_id or find_team_id(team_name)
    if not tid:
        return None

    data = _get(f"https://api.sofascore.com/api/v1/team/{tid}/events/last/0")
    if not data:
        return None

    events = data.get("events", [])
    finished = [
        e for e in events
        if e.get("status", {}).get("type") in ("finished", "awarded")
    ][-5:]

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

        is_home       = home.get("id") == tid
        team_score    = hs if is_home else as_
        opp_score     = as_ if is_home else hs
        opponent_name = away.get("name", "?") if is_home else home.get("name", "?")

        if team_score > opp_score:
            result = "G"; wins += 1
        elif team_score < opp_score:
            result = "M"; losses += 1
        else:
            result = "B"; draws += 1

        goals_for      += team_score
        goals_against  += opp_score

        matches.append({
            "result":         result,
            "opponent":       opponent_name,
            "team_score":     team_score,
            "opponent_score": opp_score,
            "was_home":       is_home,
            "date":           _ts_to_iso(ts)[:10] if ts else "",
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


def _ts_to_iso(ts: int) -> str:
    from datetime import datetime, timezone
    try:
        return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
    except Exception:
        return ""
