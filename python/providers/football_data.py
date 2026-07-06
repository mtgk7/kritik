"""
football-data.org v4 provider — ücretsiz plan.

Kapsam (ücretsiz): PL, PD, BL1, SA, FL1, CL, EL
Süper Lig yok — gelecekte api_football.py provider'ına geçilecek.

Kısıtlar:
  - Şut istatistiği yok → xG gol ortalamasından hesaplanır
  - Sakatlık verisi yok → boş liste döner
  - 10 istek/dakika rate limit
"""

import time
import logging
import requests
from datetime import datetime, timedelta, timezone

log = logging.getLogger(__name__)

# Geçici ağ hataları — retry edilir
_TRANSIENT = (
    requests.exceptions.SSLError,
    requests.exceptions.ConnectionError,
    requests.exceptions.Timeout,
    requests.exceptions.ChunkedEncodingError,
)

# Config'den import — circular import önlemek için lazy
def _cfg():
    from config import FOOTBALL_DATA_KEY, FIXTURE_DAYS_AHEAD
    return FOOTBALL_DATA_KEY, FIXTURE_DAYS_AHEAD

BASE_URL = "https://api.football-data.org/v4"

# Ücretsiz planda desteklenen lig kodları
# Süper Lig (TR1) ücretli planda mevcut — eklemek için api_football.py'e geç
LEAGUE_MAP: dict[str, str] = {
    "PL":  "Premier League",
    "PD":  "La Liga",
    "BL1": "Bundesliga",
    "SA":  "Serie A",
    "FL1": "Ligue 1",
    "CL":  "Şampiyonlar Ligi",
    "EL":  "Avrupa Ligi",
}

_last_request = 0.0

def _get(endpoint: str, params: dict | None = None, _retries: int = 3) -> dict:
    global _last_request
    key, _ = _cfg()

    # Rate limit: 10 istek/dakika → 6 saniye ara
    elapsed = time.time() - _last_request
    if elapsed < 6.1:
        time.sleep(6.1 - elapsed)

    last_exc: Exception | None = None
    for attempt in range(_retries):
        try:
            resp = requests.get(
                f"{BASE_URL}/{endpoint}",
                headers={"X-Auth-Token": key},
                params=params or {},
                timeout=15,
            )
            _last_request = time.time()

            if resp.status_code == 429:
                time.sleep(60)
                return _get(endpoint, params, _retries)

            resp.raise_for_status()
            return resp.json()
        except _TRANSIENT as e:
            # Geçici ağ hatası → artan bekleme ile tekrar dene
            last_exc = e
            _last_request = time.time()
            wait = 3 * (attempt + 1)
            log.warning(f"football-data ağ hatası ({endpoint}), {attempt + 1}/{_retries} deneme: {type(e).__name__} — {wait}s bekleniyor")
            time.sleep(wait)

    # Tüm denemeler başarısız
    raise last_exc if last_exc else RuntimeError(f"football-data isteği başarısız: {endpoint}")


def get_fixtures(league_code: str) -> list[dict]:
    """
    Önümüzdeki N gün içindeki programlanmış maçları döndürür.
    Sonuçları ortak formata normalize eder.
    """
    _, days = _cfg()
    today = datetime.now(timezone.utc).date()
    end   = today + timedelta(days=days)

    try:
        data = _get(
            f"competitions/{league_code}/matches",
            {"status": "SCHEDULED", "dateFrom": today.isoformat(), "dateTo": end.isoformat()},
        )
    except Exception as e:
        # Bir lig çekilemezse tüm botu çökertme — boş dön, diğer ligler devam etsin
        log.warning(f"{league_code} maçları çekilemedi, atlanıyor: {type(e).__name__} — {e}")
        return []

    results = []
    for m in data.get("matches", []):
        results.append({
            "fixture": {
                "id":   m["id"],
                "date": m["utcDate"],
            },
            "teams": {
                "home": {"id": m["homeTeam"]["id"], "name": m["homeTeam"]["name"]},
                "away": {"id": m["awayTeam"]["id"], "name": m["awayTeam"]["name"]},
            },
        })
    return results


def get_last5_fixtures(team_id: int) -> list[dict]:
    """
    Takımın son 5 tamamlanmış maçını ortak formata normalize eder.
    """
    try:
        data = _get(f"teams/{team_id}/matches", {"status": "FINISHED", "limit": 5})
    except Exception as e:
        log.warning(f"Takım {team_id} son maçları çekilemedi: {type(e).__name__} — {e}")
        return []

    results = []
    for m in data.get("matches", []):
        score = m.get("score", {}).get("fullTime", {})
        home_goals = score.get("home") or 0
        away_goals = score.get("away") or 0

        home_id = m["homeTeam"]["id"]
        away_id = m["awayTeam"]["id"]

        # Kazanan: home=True, away=False, beraberlik=None
        if home_goals > away_goals:
            winner = True
        elif away_goals > home_goals:
            winner = False
        else:
            winner = None

        results.append({
            "fixture": {"id": m["id"]},
            "teams": {
                "home": {"id": home_id, "winner": winner},
                "away": {"id": away_id, "winner": not winner if winner is not None else None},
            },
            "goals": {"home": home_goals, "away": away_goals},
        })
    return results


def get_team_goals_avg(team_id: int) -> float:
    """
    Şut verisi yok → son 5 maç gol ortalaması xG proxy'si olarak kullanılır.
    """
    matches = get_last5_fixtures(team_id)
    if not matches:
        return 1.2   # lig ortalaması varsayılan

    total = 0
    for m in matches:
        is_home = m["teams"]["home"]["id"] == team_id
        goals = m["goals"]["home"] if is_home else m["goals"]["away"]
        total += goals

    return round(total / len(matches), 2)


def get_injuries(team_id: int) -> list[dict]:
    """Ücretsiz planda sakatlık verisi yok — boş liste döner."""
    return []
