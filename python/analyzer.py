"""
Kritik analiz motoru — provider-agnostik.

Üç katmanlı hesaplama:
  1. form_score   — son 5 maç puan ortalaması (0-1)
  2. xg_score     — gol/şut ortalamasından normalize xG (0-1)
  3. injury_score — eksik oyuncuların takım gücüne etkisi (0-1, negatif)

football_data provider'da şut verisi yok; xG gol ortalamasından türetilir.
api_football provider'da şut istatistikleri kullanılır.
"""

import math
from api_client import get_last5_fixtures, get_team_goals_avg, get_injuries
from config import (
    W_FORM, W_XG, W_HOME, W_INJURY,
    POSITION_IMPACT, DEFAULT_POSITION_IMPACT,
    missed_multiplier,
)


# ── Form Skoru ─────────────────────────────────────────────────────────────────

def calc_form_score(team_id: int, league_ref: str | int = "", season: int | None = None) -> float:
    """Son 5 maç: G=3, B=1, M=0 → normalize 0-1."""
    fixtures = get_last5_fixtures(team_id, league_ref, season)
    if not fixtures:
        return 0.5

    points, played = 0, 0
    for fx in fixtures:
        home   = fx["teams"]["home"]
        winner = home.get("winner")
        is_home = home.get("id") == team_id

        if winner is None:
            points += 1
        elif (winner and is_home) or (not winner and not is_home):
            points += 3
        played += 1

    return (points / (played * 3)) if played > 0 else 0.5


# ── xG Skoru ──────────────────────────────────────────────────────────────────

def calc_raw_xg(team_id: int, league_ref: str | int = "", season: int | None = None) -> float:
    """Ham xG (gol/maç) — DB'ye yazılır."""
    return get_team_goals_avg(team_id, league_ref, season)


def calc_xg_score(team_id: int, league_ref: str | int = "", season: int | None = None) -> float:
    """Normalize xG (0-1) — algoritma içi kullanım."""
    raw = calc_raw_xg(team_id, league_ref, season)
    return _sigmoid(raw - 1.2)


# ── Sakatlık / Ceza Etkisi ─────────────────────────────────────────────────────

def calc_injury_effect(
    team_id: int, league_ref: str | int = "", season: int | None = None
) -> tuple[float, list[dict]]:
    """
    Eksik oyuncuların takım gücüne toplam etkisini hesaplar.
    football_data provider'da boş liste döner (ücretsiz planda veri yok).
    """
    injuries = get_injuries(team_id, league_ref, season)
    if not injuries:
        return 0.0, []

    total_impact    = 0.0
    missing_players = []

    for record in injuries:
        player      = record.get("player", {})
        reason_type = player.get("type", "injury")
        name        = player.get("name", "Bilinmiyor")
        position    = (player.get("position") or "M")[0].upper()
        missed      = _estimate_missed(record)

        impact = POSITION_IMPACT.get(position, DEFAULT_POSITION_IMPACT) * missed_multiplier(missed)
        total_impact += impact

        missing_players.append({
            "name":                name,
            "reason":              "Sakatlık" if "injury" in reason_type.lower() else "Ceza",
            "missed_matches_count": missed,
            "position":            position,
        })

    return round(min(total_impact, 1.0), 3), missing_players


def _estimate_missed(record: dict) -> int:
    start_date = record.get("fixture", {}).get("date")
    if not start_date:
        return 1
    from datetime import datetime, timezone
    try:
        start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        weeks = (datetime.now(timezone.utc) - start).days // 7
        return max(1, min(weeks, 10))
    except Exception:
        return 1


# ── Güven Skoru ───────────────────────────────────────────────────────────────

def calc_confidence(
    home_form: float, away_form: float,
    home_xg: float,   away_xg: float,
    home_injury: float, away_injury: float,
) -> float:
    """0-1 arası güven skoru. Spesifikasyon formülü: sigmoid(|net| × 4)."""
    net = (
        (home_form  - away_form)   * W_FORM
        + (home_xg  - away_xg)    * W_XG
        + 0.5                      * W_HOME
        - (home_injury - away_injury) * W_INJURY
    )
    return round(_sigmoid(abs(net) * 4.0), 3)


# ── Yardımcılar ───────────────────────────────────────────────────────────────

def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))
