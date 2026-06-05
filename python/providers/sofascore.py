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


def get_last5(team_name: str, team_id: int | None = None) -> list[dict]:
    """
    Takımın son 5 maçını SofaScore'dan çeker.
    Dönen format main.py'deki _build_last5_summary ile uyumlu
    (api_football fixture dict yapısına benzer).
    """
    tid = team_id or find_team_id(team_name)
    if not tid:
        return []

    data = _get(f"https://api.sofascore.com/api/v1/team/{tid}/events/last/0")
    if not data:
        return []

    events = data.get("events", [])
    # Sadece biten maçlar, son 5
    finished = [
        e for e in events
        if e.get("status", {}).get("type") in ("finished", "awarded")
    ][-5:]

    result = []
    for e in finished:
        home = e.get("homeTeam", {})
        away = e.get("awayTeam", {})
        hs   = (e.get("homeScore") or {}).get("current", 0)
        as_  = (e.get("awayScore") or {}).get("current", 0)
        ts   = e.get("startTimestamp", 0)

        # main.py'nin _build_last5_summary beklediği formata dönüştür
        result.append({
            "fixture": {
                "id":   e.get("id", 0),
                "date": _ts_to_iso(ts),
            },
            "teams": {
                "home": {"id": home.get("id", 0), "name": home.get("name", ""), "winner": hs > as_},
                "away": {"id": away.get("id", 0), "name": away.get("name", ""), "winner": as_ > hs},
            },
            "goals": {"home": hs, "away": as_},
            "_sofa_team_id": tid,
        })

    return result


def get_last5_by_name(home_name: str, away_name: str) -> tuple[list[dict], list[dict]]:
    """
    İki takım için paralel son 5 maç çeker.
    Ana bot'tan kolayca çağrılabilir.
    """
    home_id = find_team_id(home_name)
    time.sleep(0.3)
    away_id = find_team_id(away_name)
    time.sleep(0.3)

    home_last5 = get_last5(home_name, home_id) if home_id else []
    time.sleep(0.3)
    away_last5 = get_last5(away_name, away_id) if away_id else []

    return home_last5, away_last5


def _ts_to_iso(ts: int) -> str:
    from datetime import datetime, timezone
    try:
        return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
    except Exception:
        return ""
