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

# Fixture başına istatistik cache — aynı fixture için birden fazla çağrıyı önler
_FIXTURE_STATS_CACHE: dict[int, list[dict]] = {}

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


def get_h2h(home_id: int, away_id: int, last: int = 5) -> list[dict]:
    """Son N H2H maçını getir (her iki takım için)."""
    try:
        data = _get("fixtures", {
            "h2h": f"{home_id}-{away_id}",
            "last": last,
            "status": "FT",
        })
        return data.get("response", [])
    except Exception:
        return []


def get_fixture_statistics(fixture_id: int) -> list[dict]:
    if fixture_id in _FIXTURE_STATS_CACHE:
        return _FIXTURE_STATS_CACHE[fixture_id]
    data = _get("fixtures/statistics", {"fixture": fixture_id})
    result = data.get("response", [])
    _FIXTURE_STATS_CACHE[fixture_id] = result
    return result


def get_last5_card_stats(team_id: int, league_id: int, season: int) -> dict:
    """
    Son 5 maçtan sarı kart ve kırmızı kart toplamlarını döndürür.
    get_fixture_statistics cache'i kullanır — ek API çağrısı yapmaz.
    """
    fixtures = get_last5_fixtures(team_id, league_id, season)
    yellow_total = 0
    red_total    = 0
    played       = 0

    for fx in fixtures:
        fixture_id = fx["fixture"]["id"]
        for ts in get_fixture_statistics(fixture_id):
            if ts.get("team", {}).get("id") != team_id:
                continue
            s = {item["type"]: item["value"] for item in ts.get("statistics", [])}
            yellow_total += int(s.get("Yellow Cards") or 0)
            red_total    += int(s.get("Red Cards")    or 0)
            played       += 1
            break

    return {
        "yellow_cards": yellow_total,
        "red_cards":    red_total,
        "played":       played,
    }


def get_fixture_odds(fixture_id: int, bookmaker_id: int = 8) -> dict | None:
    """
    Fixture için MS1/X/MS2 ve 2.5 Üst/Alt oranlarını döndürür.
    Bookmaker 8 = Bet365 (yaygın, çoğu maçta var).
    Dönen format: {ms1, x, ms2, over25, under25} veya None.
    """
    try:
        data = _get("odds", {"fixture": fixture_id, "bookmaker": bookmaker_id})
    except Exception:
        return None

    response = data.get("response", [])
    if not response:
        # Bet365 yoksa bookmaker filtresi olmadan dene
        try:
            data = _get("odds", {"fixture": fixture_id})
            response = data.get("response", [])
        except Exception:
            return None
    if not response:
        return None

    ms1 = x = ms2 = over25 = under25 = None
    for bookmaker in response[0].get("bookmakers", []):
        for bet in bookmaker.get("bets", []):
            bet_id   = bet.get("id")
            bet_name = (bet.get("name") or "").upper()
            values   = bet.get("values", [])
            if bet_id == 1 or "MATCH WINNER" in bet_name or "1X2" in bet_name:
                for v in values:
                    val  = str(v.get("value", "")).upper()
                    odd  = _safe_float(v.get("odd"))
                    if val in ("HOME", "1"):
                        ms1 = odd
                    elif val in ("DRAW", "X"):
                        x = odd
                    elif val in ("AWAY", "2"):
                        ms2 = odd
            elif bet_id == 5 or "OVER/UNDER" in bet_name or "GOALS" in bet_name:
                for v in values:
                    val  = str(v.get("value", "")).upper()
                    odd  = _safe_float(v.get("odd"))
                    if "OVER" in val and "2.5" in val:
                        over25 = odd
                    elif "UNDER" in val and "2.5" in val:
                        under25 = odd
        if ms1 and ms2:
            break

    if not (ms1 and ms2):
        return None
    return {"ms1": ms1, "x": x, "ms2": ms2, "over25": over25, "under25": under25}


def _safe_float(val) -> float | None:
    try:
        v = float(val or 0)
        return v if v > 1.0 else None
    except Exception:
        return None


_FIXTURES_BY_DATE_CACHE: dict[tuple, list[dict]] = {}
_NORM_RE = None


def _norm_name(name: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _get_fixtures_by_date(league_id: int, season: int, date_str: str) -> list[dict]:
    """Tarih+lig için api-football fixture listesi — run boyunca önbellekte."""
    key = (league_id, season, date_str)
    if key not in _FIXTURES_BY_DATE_CACHE:
        try:
            data = _get("fixtures", {"league": league_id, "season": season, "date": date_str})
            _FIXTURES_BY_DATE_CACHE[key] = data.get("response", [])
        except Exception:
            _FIXTURES_BY_DATE_CACHE[key] = []
    return _FIXTURES_BY_DATE_CACHE[key]


def find_afl_fixture_id(home_team: str, away_team: str,
                         date_str: str, league_id: int, season: int) -> int | None:
    """
    Takım adı + tarih + lig ile api-football fixture ID'yi bulur.
    Fuzzy eşleşme: normalize edilmiş ismin bir diğerini içermesi yeterli.
    """
    fixtures = _get_fixtures_by_date(league_id, season, date_str)
    hn = _norm_name(home_team)
    an = _norm_name(away_team)
    for fx in fixtures:
        h = _norm_name(fx["teams"]["home"]["name"])
        a = _norm_name(fx["teams"]["away"]["name"])
        if (hn in h or h in hn) and (an in a or a in an):
            return fx["fixture"]["id"]
    return None


def get_predictions(fixture_id: int) -> dict | None:
    """
    Fixture için api-football tahmin verisini döndürür.
    Dönen format:
      {
        "percent": {"home": "45%", "draw": "35%", "away": "20%"},
        "advice":  "Home win",
        "comparison": {"form": {...}, "h2h": {...}, "att": {...}, "def": {...}},
        "h2h_summary": {"btts": 3, "over25": 4, "played": 6}
      }
    """
    try:
        data = _get("predictions", {"fixture": fixture_id})
        resp = data.get("response", [])
        if not resp:
            return None
        item = resp[0]
        preds   = item.get("predictions", {})
        percent = preds.get("percent", {})
        advice  = preds.get("advice", "")
        comp    = item.get("comparison", {})

        # H2H özeti — BTTS ve 2.5 Üst sayıları
        h2h     = item.get("h2h", [])
        h2h_btts  = sum(1 for m in h2h if (m.get("goals", {}).get("home") or 0) > 0
                        and (m.get("goals", {}).get("away") or 0) > 0)
        h2h_over25 = sum(1 for m in h2h if ((m.get("goals", {}).get("home") or 0)
                         + (m.get("goals", {}).get("away") or 0)) > 2)

        return {
            "percent":     percent,
            "advice":      advice,
            "comparison":  comp,
            "h2h_summary": {"played": len(h2h), "btts": h2h_btts, "over25": h2h_over25},
        }
    except Exception:
        return None


def get_injuries(team_id: int, league_id: int, season: int) -> list[dict]:
    """
    Sakatlık ve ceza (süspansiyon) listesi.
    API yanıtı: player.type = 'Injury' | 'Suspension'
    """
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
