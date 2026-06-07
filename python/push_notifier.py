"""
Maç başlamadan 60 dakika önce yüksek güven skoru olan maçlar için
tarayıcı push bildirimi gönderir.
"""
import os
import logging
import requests
from datetime import datetime, timezone, timedelta
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

log = logging.getLogger("push-notifier")

SITE_URL     = os.getenv("KRITIK_API_URL", "https://kritik-wine.vercel.app")
API_SECRET   = os.getenv("KRITIK_API_SECRET", "")
MIN_CONF     = float(os.getenv("PUSH_MIN_CONF", "0.70"))
NOTIFY_AHEAD = 60  # dakika


def run():
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    now    = datetime.now(timezone.utc)
    start  = (now + timedelta(minutes=NOTIFY_AHEAD - 5)).isoformat()
    end    = (now + timedelta(minutes=NOTIFY_AHEAD + 5)).isoformat()

    result = (
        client.table("matches")
        .select("id,home_team,away_team,confidence_score,prediction,league_name")
        .gte("match_time", start)
        .lte("match_time", end)
        .gte("confidence_score", MIN_CONF)
        .eq("status", "yakında")
        .execute()
    )

    matches = result.data or []
    if not matches:
        log.info("Bildirim gönderilecek maç yok")
        return

    for m in matches:
        conf  = int((m.get("confidence_score") or 0) * 100)
        title = f"🎯 {m['home_team']} - {m['away_team']}"
        body  = f"{m.get('league_name','')} | Tahmin: {m.get('prediction','')} | %{conf} güven"
        url   = f"{SITE_URL}/maclar/{m['id']}"

        r = requests.post(
            f"{SITE_URL}/api/push/send",
            headers={
                "Content-Type":  "application/json",
                "Authorization": f"Bearer {API_SECRET}",
            },
            json={"title": title, "body": body, "url": url},
            timeout=15,
        )
        log.info(f"Push gönderildi: {title} → {r.json()}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run()
