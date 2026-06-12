"""
SofaScore Score Watcher
Canlı maç varken her 60 sn, yokken her 5 dakikada skor + durum günceller.
"""

import sys
import time
import logging
from datetime import datetime, timezone, timedelta

import requests
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("score-watcher")

SOFA_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://www.sofascore.com/",
}

LIVE_INTERVAL = 60
IDLE_INTERVAL = 300

STATUS_MAP = {
    "notstarted":  "yakında",
    "inprogress":  "canlı",
    "halftime":    "canlı",
    "pause":       "canlı",
    "interrupted": "canlı",
    "finished":    "bitti",
    "awarded":     "bitti",
    "postponed":   None,
    "canceled":    None,
    "cancelled":   None,
}

TR_MAP = str.maketrans("çşğüöıÇŞĞÜÖİ", "csguoiCSGUOI")


def norm(name: str) -> str:
    return name.lower().translate(TR_MAP).strip()


def fetch(url: str) -> list[dict]:
    try:
        r = requests.get(url, headers=SOFA_HEADERS, timeout=10)
        r.raise_for_status()
        return r.json().get("events", [])
    except Exception as e:
        log.warning(f"Fetch failed {url}: {e}")
        return []


def fetch_event_by_id(event_id: int) -> dict | None:
    """Tek bir maçı ID ile doğrudan çeker."""
    try:
        r = requests.get(
            f"https://api.sofascore.com/api/v1/event/{event_id}",
            headers=SOFA_HEADERS, timeout=10,
        )
        r.raise_for_status()
        return r.json().get("event")
    except Exception as e:
        log.warning(f"fetch_event_by_id({event_id}) failed: {e}")
        return None


def build_index(events: list[dict]) -> dict[str, dict]:
    idx = {}
    for e in events:
        key = f"{norm(e['homeTeam']['name'])}|{norm(e['awayTeam']['name'])}"
        idx[key] = e
        # ID ile de erişilebilsin
        if e.get("id"):
            idx[str(e["id"])] = e
    return idx


def check_prediction(prediction: str | None, home: int, away: int) -> bool | None:
    """Tahmin doğru mu? Maç bittikten sonra hesaplanır."""
    if not prediction:
        return None
    p = prediction.lower().strip()
    if p == "ms1":        return home > away
    if p == "ms2":        return away > home
    if p in ("x", "beraberlik"): return home == away
    if "2.5 üst" in p or "2.5üst" in p: return home + away > 2.5
    if "2.5 alt" in p or "2.5alt" in p: return home + away <= 2
    if "1.5 üst" in p or "1.5üst" in p: return home + away > 1.5
    if "1.5 alt" in p or "1.5alt" in p: return home + away <= 1
    if "kg var" in p:     return home > 0 and away > 0
    if "kg yok" in p:     return home == 0 or away == 0
    return None


def apply_event(client, row: dict, event: dict) -> bool:
    """Bir maç kaydını SofaScore event verisiyle günceller. True = değişiklik yapıldı."""
    sofa_type = event.get("status", {}).get("type", "notstarted")
    new_status = STATUS_MAP.get(sofa_type)
    if new_status is None:
        return False

    patch: dict = {"status": new_status}

    if not row.get("sofascore_id"):
        patch["sofascore_id"]      = event.get("id")
        patch["sofascore_home_id"] = event.get("homeTeam", {}).get("id")
        patch["sofascore_away_id"] = event.get("awayTeam", {}).get("id")

    if new_status in ("canlı", "bitti"):
        hs  = (event.get("homeScore") or {}).get("current")
        as_ = (event.get("awayScore") or {}).get("current")
        if hs  is not None: patch["home_score"] = hs
        if as_ is not None: patch["away_score"] = as_

    if new_status == "bitti" and row.get("prediction_correct") is None:
        hs  = patch.get("home_score")
        as_ = patch.get("away_score")
        if hs is not None and as_ is not None:
            result = check_prediction(row.get("prediction"), int(hs), int(as_))
            if result is not None:
                patch["prediction_correct"] = result

    client.table("matches").update(patch).eq("id", row["id"]).execute()
    score_str   = f"{patch.get('home_score', '?')}-{patch.get('away_score', '?')}"
    correct_str = f" {'✓' if patch.get('prediction_correct') else '✗'}" if "prediction_correct" in patch else ""
    log.info(f"  {row['home_team']} - {row['away_team']} → {new_status} {score_str}{correct_str}")
    return True


def sync(client, idx: dict) -> int:
    rows = (
        client.table("matches")
        .select("id, home_team, away_team, status, prediction, prediction_correct, sofascore_id")
        .neq("status", "bitti")
        .execute()
        .data or []
    )

    updated = 0
    for row in rows:
        # 1) sofascore_id varsa direkt ID ile bak (en güvenilir)
        event = None
        if row.get("sofascore_id"):
            event = idx.get(str(row["sofascore_id"]))
            if not event:
                # Index'te yoksa doğrudan API'ye sor
                event = fetch_event_by_id(row["sofascore_id"])

        # 2) ID yoksa isim bazlı eşleştir
        if not event:
            key   = f"{norm(row['home_team'])}|{norm(row['away_team'])}"
            event = idx.get(key)

        if not event:
            continue

        if apply_event(client, row, event):
            updated += 1

    return updated


def fetch_football_data_scores(client) -> int:
    """football-data.org fallback: WC ve Avrupa ligleri için skor güncelle."""
    import os
    key = os.getenv("FOOTBALL_DATA_KEY", "")
    if not key:
        return 0

    leagues = ["WC", "TR1", "PL", "PD", "BL1", "SA", "FL1", "CL", "EL"]
    updated = 0

    for league in leagues:
        try:
            r = requests.get(
                f"https://api.football-data.org/v4/competitions/{league}/matches",
                headers={"X-Auth-Token": key},
                params={"status": "IN_PLAY,FINISHED", "limit": 20},
                timeout=10,
            )
            if not r.ok:
                continue

            matches = r.json().get("matches", [])
            for m in matches:
                ht = m.get("homeTeam", {}).get("name", "")
                at = m.get("awayTeam", {}).get("name", "")
                if not ht or not at:
                    continue

                score = m.get("score", {}).get("fullTime", {})
                hs = score.get("home")
                as_ = score.get("away")
                status_raw = m.get("status", "")

                if status_raw == "IN_PLAY":
                    new_status = "canlı"
                elif status_raw == "FINISHED":
                    new_status = "bitti"
                else:
                    continue

                if hs is None or as_ is None:
                    continue

                # DB'de eşleştir (isim normalizasyonu)
                key_norm = f"{norm(ht)}|{norm(at)}"
                rows = (
                    client.table("matches")
                    .select("id, home_team, away_team, prediction, prediction_correct, status")
                    .neq("status", "bitti")
                    .execute()
                    .data or []
                )

                for row in rows:
                    if f"{norm(row.get('home_team',''))}|{norm(row.get('away_team',''))}" != key_norm:
                        continue
                    patch: dict = {"status": new_status, "home_score": hs, "away_score": as_}
                    if new_status == "bitti" and row.get("prediction_correct") is None:
                        res = check_prediction(row.get("prediction"), hs, as_)
                        if res is not None:
                            patch["prediction_correct"] = res
                    client.table("matches").update(patch).eq("id", row["id"]).execute()
                    updated += 1

            time.sleep(6)  # football-data rate limit: 10 req/dk
        except Exception as e:
            log.warning(f"football-data {league}: {e}")

    return updated


def run_once(client) -> bool:
    """Tek sync geçişi. Canlı maç varsa True döner."""
    now = datetime.now(timezone.utc)
    today     = now.date().isoformat()
    tomorrow  = (now.date() + timedelta(days=1)).isoformat()
    yesterday = (now.date() - timedelta(days=1)).isoformat()

    live_events = fetch("https://api.sofascore.com/api/v1/sport/football/events/live")

    # Son 7 günü tara — eski güncellenmemiş maçlar için
    date_range = [(now.date() - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    date_range.append((now.date() + timedelta(days=1)).isoformat())

    all_events = list(live_events)
    for d in date_range:
        all_events += fetch(f"https://api.sofascore.com/api/v1/sport/football/scheduled-events/{d}")

    idx = build_index(all_events)
    updated = sync(client, idx)

    # SofaScore bloklu ise football-data fallback
    if not all_events:
        log.info("SofaScore bloklu — football-data.org fallback devreye giriyor")
        updated += fetch_football_data_scores(client)

    log.info(f"Sync tamam — {updated} güncellendi | {'CANLI' if live_events else 'bekleme'}")
    return bool(live_events)


def run():
    """Sürekli döngü (Render worker için)."""
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    log.info("Score watcher başlatıldı (sürekli mod)")
    while True:
        has_live = run_once(client)
        time.sleep(LIVE_INTERVAL if has_live else IDLE_INTERVAL)


if __name__ == "__main__":
    if "--once" in sys.argv:
        # Cron modu: tek geçiş yap ve çık (GitHub Actions için)
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        run_once(client)
    else:
        run()
