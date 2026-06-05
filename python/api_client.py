"""
Unified API client — provider seçicisi.

PROVIDER=football_data  → football-data.org (ücretsiz, Avrupa ligleri)
PROVIDER=api_football   → api-football.com  (ücretli, Süper Lig dahil tüm ligler)

Süper Lig eklemek için:
  1. .env: PROVIDER=api_football
  2. .env: API_FOOTBALL_KEY=<paid_key>
  3. .env: LEAGUE_IDS=203   (veya virgülle diğerleriyle birlikte)
"""

import os
from datetime import datetime, timezone

_PROVIDER = os.getenv("PROVIDER", "football_data").lower()


# ── Ortak arayüz ──────────────────────────────────────────────────────────────

def get_fixtures(league_ref: str | int, season: int | None = None) -> list[dict]:
    if _PROVIDER == "api_football":
        from providers.api_football import get_fixtures as _gf, current_season
        s = season or current_season(int(league_ref))
        return _gf(int(league_ref), s)
    else:
        from providers.football_data import get_fixtures as _gf
        return _gf(str(league_ref))


def get_last5_fixtures(team_id: int, league_ref: str | int = "", season: int | None = None,
                       team_name: str = "") -> list[dict]:
    """
    SOFASCORE_LAST5=true ise SofaScore'dan çeker (ücretsiz, tüm ligler).
    Yoksa mevcut provider kullanılır.
    """
    if os.getenv("SOFASCORE_LAST5", "").lower() in ("1", "true", "yes"):
        if team_name:
            from providers.sofascore import get_last5
            result = get_last5(team_name, team_id if team_id else None)
            if result:
                return result
        # Fallback: mevcut provider
    if _PROVIDER == "api_football":
        from providers.api_football import get_last5_fixtures as _gf, current_season
        s = season or current_season(int(league_ref))
        return _gf(team_id, int(league_ref), s)
    else:
        from providers.football_data import get_last5_fixtures as _gf
        return _gf(team_id)


def get_team_goals_avg(team_id: int, league_ref: str | int = "", season: int | None = None) -> float:
    """
    football_data: gol ortalaması (şut verisi yok)
    api_football:  şut istatistiklerinden xG hesaplanır
    """
    if _PROVIDER == "api_football":
        from providers.api_football import get_last5_fixtures, get_fixture_statistics, current_season
        s = season or current_season(int(league_ref))
        fixtures = get_last5_fixtures(team_id, int(league_ref), s)
        total_shots_on, total_goals, count = 0, 0, 0
        for fx in fixtures:
            for ts in get_fixture_statistics(fx["fixture"]["id"]):
                if ts.get("team", {}).get("id") != team_id:
                    continue
                stats = {s["type"]: s["value"] for s in ts.get("statistics", [])}
                total_shots_on += int(stats.get("Shots on Goal") or 0)
                total_goals    += int(stats.get("Goals") or 0)
                count += 1
                break
        if count == 0 or total_shots_on == 0:
            return 1.2
        return round((total_shots_on / count) * (total_goals / total_shots_on), 2)
    else:
        from providers.football_data import get_team_goals_avg as _gga
        return _gga(team_id)


def get_injuries(team_id: int, league_ref: str | int = "", season: int | None = None) -> list[dict]:
    if _PROVIDER == "api_football":
        from providers.api_football import get_injuries as _gi, current_season
        s = season or current_season(int(league_ref))
        return _gi(team_id, int(league_ref), s)
    else:
        from providers.football_data import get_injuries as _gi
        return _gi(team_id)


def get_team_card_stats(team_id: int, league_ref: str | int = "", season: int | None = None) -> dict:
    """
    Son 5 maçtan sarı/kırmızı kart toplamı.
    football_data provider'da şut/kart istatistiği yok → sıfır döner.
    """
    if _PROVIDER == "api_football":
        from providers.api_football import get_last5_card_stats, current_season
        s = season or current_season(int(league_ref))
        return get_last5_card_stats(team_id, int(league_ref), s)
    return {"yellow_cards": 0, "red_cards": 0, "played": 0}


def current_league_season(league_ref: str | int) -> int:
    if _PROVIDER == "api_football":
        from providers.api_football import current_season
        return current_season(int(league_ref))
    return datetime.now(timezone.utc).year
