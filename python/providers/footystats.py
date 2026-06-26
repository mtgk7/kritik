"""
FootyStats API provider — footystats.org resmi veri kaynağı.

API key: https://footystats.org/api adresinden alınır.
Config: FOOTYSTATS_API_KEY ortam değişkeni

Dönen veri: BTTS%, 2.5 Üst%, PPG, form — Claude prompt'una eklenir.
"""

import logging
import requests

log = logging.getLogger("kritik-bot.footystats")

BASE    = "https://api.football-data-api.com"
_session = requests.Session()
_session.headers.update({"User-Agent": "kritik-bot/1.0"})


def _get(endpoint: str, params: dict) -> dict | None:
    try:
        r = _session.get(f"{BASE}/{endpoint}", params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        if not data.get("success", True):
            log.warning(f"FootyStats başarısız: {data.get('message', '')}")
            return None
        return data
    except Exception as e:
        log.warning(f"FootyStats [{endpoint}]: {e}")
        return None


def fetch_todays_index(api_key: str) -> dict[str, dict]:
    """
    Bugünkü maçları çekip takım adına göre indexler.
    Key: "ev_adı_norm|dep_adı_norm"
    """
    data = _get("todays-matches", {"key": api_key, "timezone": "UTC"})
    if not data:
        return {}

    matches = data.get("data", [])
    index: dict[str, dict] = {}
    for m in matches:
        home = _norm(m.get("home_name") or "")
        away = _norm(m.get("away_name") or "")
        if home and away:
            index[f"{home}|{away}"] = m

    log.info(f"FootyStats: {len(index)} maç indexlendi")
    return index


def extract_signals(match: dict, home_team: str, away_team: str) -> dict | None:
    """
    FootyStats maç datasından tahmin sinyallerini çıkar.
    Döner: {btts_pct, o25_pct, home_ppg, away_ppg, home_form, away_form, ...}
    """
    if not match:
        return None

    def _pct(val) -> int | None:
        try:
            v = float(val)
            return round(v) if v > 1 else round(v * 100)
        except (TypeError, ValueError):
            return None

    def _ppg(val) -> float | None:
        try:
            return round(float(val), 2)
        except (TypeError, ValueError):
            return None

    result: dict = {}

    # BTTS ve 2.5 Üst ihtimalleri (pre-match model)
    btts = _pct(match.get("btts_potential") or match.get("pre_match_btts_potential"))
    o25  = _pct(match.get("o25_potential")  or match.get("pre_match_teamA_overall_ppg"))
    if btts is not None and 0 < btts < 100:
        result["btts_pct"] = btts
    if o25  is not None and 0 < o25  < 100:
        result["o25_pct"]  = o25

    # Maç başı puan ortalaması (güç göstergesi)
    h_ppg = _ppg(match.get("home_ppg") or match.get("pre_match_home_ppg"))
    a_ppg = _ppg(match.get("away_ppg") or match.get("pre_match_away_ppg"))
    if h_ppg is not None: result["home_ppg"] = h_ppg
    if a_ppg is not None: result["away_ppg"] = a_ppg

    # Gol ortalamaları (FootyStats'tan)
    h_atk = _ppg(match.get("pre_match_home_over25") or match.get("homeGoalsFor"))
    a_atk = _ppg(match.get("pre_match_away_over25") or match.get("awayGoalsFor"))
    h_def = _ppg(match.get("homeGoalsAgainst"))
    a_def = _ppg(match.get("awayGoalsAgainst"))
    if h_atk: result["home_goals_for"]     = h_atk
    if a_atk: result["away_goals_for"]     = a_atk
    if h_def: result["home_goals_against"] = h_def
    if a_def: result["away_goals_against"] = a_def

    # Form dizisi (son 5 maç)
    hf = match.get("home_recent_form") or match.get("homeForm") or ""
    af = match.get("away_recent_form") or match.get("awayForm") or ""
    if hf: result["home_form_str"] = str(hf)[:10]
    if af: result["away_form_str"] = str(af)[:10]

    return result if result else None


def _norm(name: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFKD", name.lower().strip())
    return "".join(c for c in s if not unicodedata.combining(c))
