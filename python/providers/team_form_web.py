"""
SofaScore gayri-resmi API üzerinden takım form analizi.

Herhangi bir API key gerektirmez.
Her maç analizi öncesinde her iki takım için çağrılır.
"""

import logging
import unicodedata
import requests

log = logging.getLogger("kritik-bot.team-form-web")

_BASE = "https://api.sofascore.com/api/v1"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.sofascore.com/",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}
_session = requests.Session()
_session.headers.update(_HEADERS)

# Takım adı → SofaScore ID önbelleği (bot çalışma süresi boyunca geçerli)
_id_cache: dict[str, int | None] = {}


# ── Takım ID arama ─────────────────────────────────────────────────────────────

def _find_team_id(name: str) -> int | None:
    key = _norm(name)
    if key in _id_cache:
        return _id_cache[key]

    try:
        r = _session.get(
            f"{_BASE}/search/multi-search",
            params={"q": name},
            timeout=10,
        )
        r.raise_for_status()
        hits = r.json().get("teams", {}).get("hits", [])
        if not hits:
            _id_cache[key] = None
            return None

        # Tam eşleşme önce, yoksa ilk sonuç
        for h in hits:
            entity = h.get("entity", {})
            n = entity.get("name") or entity.get("shortName") or ""
            if _norm(n) == key:
                tid = entity.get("id")
                _id_cache[key] = tid
                return tid

        tid = hits[0]["entity"]["id"]
        _id_cache[key] = tid
        return tid

    except Exception as e:
        log.warning(f"SofaScore takım arama ({name}): {e}")
        _id_cache[key] = None
        return None


# ── Son 5 maç verisi ───────────────────────────────────────────────────────────

def _fetch_last5(team_id: int) -> list[dict]:
    """SofaScore'dan son maçları çekip ilk 5'ini döndür."""
    events = []
    for page in (0, 1):
        try:
            r = _session.get(
                f"{_BASE}/team/{team_id}/events/last/{page}",
                timeout=10,
            )
            if r.status_code == 404:
                break
            r.raise_for_status()
            events = r.json().get("events", [])
            if events:
                break
        except Exception as e:
            log.warning(f"SofaScore last5 (team {team_id}, page {page}): {e}")
            break

    # En yeni → en eski sıra (reversed varsa düzelt)
    events = sorted(events, key=lambda e: e.get("startTimestamp", 0), reverse=True)
    return events[:5]


# ── Form profili oluştur ───────────────────────────────────────────────────────

def get_team_form_profile(team_name: str) -> dict | None:
    """
    Takım adından web'de son 5 maç profilini çıkarır.
    Döner:
    {
        "matches": 5,
        "goals_for": 9, "goals_against": 4,
        "avg_gf": 1.8, "avg_ga": 0.8,
        "clean_sheets": 2, "failed_to_score": 1,
        "results": ["G","G","B","M","G"],  # Galip/Beraberlik/Mağlup
        "style": "Hücum Ağırlıklı · Savunma Sağlam",
    }
    """
    team_id = _find_team_id(team_name)
    if not team_id:
        log.debug(f"SofaScore ID bulunamadı: {team_name}")
        return None

    events = _fetch_last5(team_id)
    if not events:
        log.debug(f"SofaScore maç bulunamadı: {team_name} (id={team_id})")
        return None

    goals_for = 0
    goals_against = 0
    clean_sheets = 0
    failed_to_score = 0
    results: list[str] = []

    for ev in events:
        ht = ev.get("homeTeam", {})
        at = ev.get("awayTeam", {})
        is_home = ht.get("id") == team_id
        hs = (ev.get("homeScore") or {}).get("current") or 0
        as_ = (ev.get("awayScore") or {}).get("current") or 0
        gf = hs if is_home else as_
        ga = as_ if is_home else hs
        goals_for += gf
        goals_against += ga
        if ga == 0:
            clean_sheets += 1
        if gf == 0:
            failed_to_score += 1
        if gf > ga:
            results.append("G")
        elif gf == ga:
            results.append("B")
        else:
            results.append("M")

    n = len(events)
    avg_gf = round(goals_for / n, 2)
    avg_ga = round(goals_against / n, 2)

    # Stil sınıflaması
    attack_label = (
        "Hücum Ağırlıklı" if avg_gf >= 2.0
        else "Gol Sıkıntısı" if avg_gf <= 0.8
        else "Dengeli Hücum"
    )
    defense_label = (
        "Savunma Sağlam" if avg_ga <= 0.8
        else "Savunma Zayıf" if avg_ga >= 2.0
        else "Dengeli Savunma"
    )

    style_parts = [attack_label]
    if defense_label != "Dengeli Savunma":
        style_parts.append(defense_label)

    log.info(
        f"    Web form [{team_name}]: "
        f"{n} maç, {goals_for} gol attı / {goals_against} gol yedi, "
        f"stil: {' · '.join(style_parts)}"
    )

    return {
        "matches": n,
        "goals_for": goals_for,
        "goals_against": goals_against,
        "avg_gf": avg_gf,
        "avg_ga": avg_ga,
        "clean_sheets": clean_sheets,
        "failed_to_score": failed_to_score,
        "results": results,
        "style": " · ".join(style_parts),
    }


def _norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name.lower().strip())
    return "".join(c for c in s if not unicodedata.combining(c))
