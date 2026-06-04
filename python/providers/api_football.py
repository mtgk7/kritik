"""
api-football.com provider — Süper Lig ve tüm ligler için.

Etkinleştirmek için:
  1. .env dosyasına: PROVIDER=api_football
  2. API_FOOTBALL_KEY değerini paid plan key'i ile güncelle
  3. LEAGUE_IDS=203  (Süper Lig)

Bu dosya mevcut api_client.py mantığını provider formatına taşır.
"""

import time
import requests
from datetime import datetime, timedelta, timezone

def _cfg():
    from config import API_KEY, API_HOST, FIXTURE_DAYS_AHEAD
    return API_KEY, API_HOST, FIXTURE_DAYS_AHEAD

_SESSION = requests.Session()
_initialized = False

def _ensure_session():
    global _initialized
    if not _initialized:
        key, host, _ = _cfg()
        _SESSION.headers.update({
            "x-apisports-key": key,
            "x-apisports-host": host,
        })
        _initialized = True

def _get(endpoint: str, params: dict) -> dict:
    _ensure_session()
    key, host, _ = _cfg()
    resp = _SESSION.get(f"https://{host}/{endpoint}", params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    if data.get("errors"):
        raise RuntimeError(f"API hatası [{endpoint}]: {data['errors']}")
    return data


def get_fixtures(league_id: int, season: int) -> list[dict]:
    _, _, days = _cfg()
    today = datetime.now(timezone.utc).date()
    end   = today + timedelta(days=days)
    for s in [season, season - 1]:
        try:
            data = _get("fixtures", {
                "league": league_id, "season": s,
                "from": today.isoformat(), "to": end.isoformat(), "status": "NS",
            })
            return data.get("response", [])
        except RuntimeError as e:
            if "plan" in str(e).lower() or "season" in str(e).lower():
                continue
            raise
    return []


def get_last5_fixtures(team_id: int, league_id: int, season: int) -> list[dict]:
    for s in [season, season - 1]:
        try:
            data = _get("fixtures", {
                "team": team_id, "league": league_id,
                "season": s, "last": 5, "status": "FT",
            })
            return data.get("response", [])
        except RuntimeError as e:
            if "plan" in str(e).lower() or "season" in str(e).lower():
                continue
            raise
    return []


def get_fixture_statistics(fixture_id: int) -> list[dict]:
    data = _get("fixtures/statistics", {"fixture": fixture_id})
    return data.get("response", [])


def get_injuries(team_id: int, league_id: int, season: int) -> list[dict]:
    data = _get("injuries", {"team": team_id, "league": league_id, "season": season})
    return data.get("response", [])


def current_season(league_id: int) -> int:
    data = _get("leagues", {"id": league_id, "current": "true"})
    seasons = data.get("response", [])
    if not seasons:
        return datetime.now().year
    for s in seasons[0].get("seasons", []):
        if s.get("current"):
            return s["year"]
    return datetime.now().year
