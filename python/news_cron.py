"""
Kritik Haber Cron — sadece haber çekme, 10 dakikada bir.

Çalıştırma:
  python news_cron.py          → tek seferlik
  python news_cron.py --cron   → 10 dk'da bir döngü

Ana bot (main.py) ile ayrı process olarak çalıştırılabilir.
"""

import sys
import time
import logging
import schedule

from news_fetcher import run_news_fetch

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("kritik-news-cron")


if __name__ == "__main__":
    if "--cron" in sys.argv:
        log.info("Haber cron modu: 10 dakikada bir çalışır.")
        schedule.every(10).minutes.do(run_news_fetch)
        run_news_fetch()   # ilk çalıştırma hemen
        while True:
            schedule.run_pending()
            time.sleep(30)
    else:
        run_news_fetch()
