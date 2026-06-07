"""
Odds Cron Worker — sürekli çalışır, Render worker olarak deploy edilir.

  Maç günü (önümüzdeki 6 saatte maç var): 15 dakikada bir
  Normal:                                 30 dakikada bir

Çalıştırma:
  python odds_cron.py           → sürekli döngü
  python odds_cron.py --once    → tek seferlik çalıştır ve çık
"""

import sys
import time
import logging
from datetime import datetime, timezone, timedelta

from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
from odds_scraper import run as scrape_odds

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("odds-cron")

MATCH_DAY_INTERVAL = 15 * 60   # saniye
NORMAL_INTERVAL    = 30 * 60


def has_upcoming_matches(client) -> bool:
    """Önümüzdeki 6 saatte 'yakında' statüsünde maç var mı?"""
    now  = datetime.now(timezone.utc)
    soon = (now + timedelta(hours=6)).isoformat()
    rows = (
        client.table("matches")
        .select("id")
        .eq("status", "yakında")
        .gte("match_time", now.isoformat())
        .lte("match_time", soon)
        .limit(1)
        .execute()
        .data or []
    )
    return bool(rows)


def tick(client) -> None:
    log.info("─── Oran çekme başlıyor ───")
    try:
        saved = scrape_odds()
        log.info(f"─── Tamamlandı: {saved} oran kaydedildi ───")
    except Exception as e:
        log.error(f"Oran çekme hatası: {e}", exc_info=True)


def run() -> None:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    log.info("Odds Cron Worker başlatıldı")

    while True:
        tick(client)

        match_day = has_upcoming_matches(client)
        interval  = MATCH_DAY_INTERVAL if match_day else NORMAL_INTERVAL
        label     = "maç günü" if match_day else "normal"
        next_run  = datetime.now(timezone.utc) + timedelta(seconds=interval)
        log.info(
            f"Sonraki çekim: {interval // 60} dk sonra ({label}) "
            f"— {next_run.strftime('%H:%M UTC')}"
        )
        time.sleep(interval)


if __name__ == "__main__":
    if "--once" in sys.argv:
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        tick(client)
    else:
        run()
