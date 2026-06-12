"""
Haftalık özet emailini tetikler.
Cron: her Pazar 09:00 UTC   →   0 9 * * 0
"""
import os
import logging
import requests

log = logging.getLogger("weekly-summary")

SITE_URL = os.getenv("KRITIK_API_URL", "https://kritik-wine.vercel.app")
SECRET   = os.getenv("KRITIK_API_SECRET", "")


def run():
    if not SECRET:
        log.error("KRITIK_API_SECRET eksik")
        return

    r = requests.post(
        f"{SITE_URL}/api/email/weekly-digest",
        headers={"Authorization": f"Bearer {SECRET}"},
        timeout=30,
    )

    if r.ok:
        data = r.json()
        log.info(f"Haftalık özet: {data.get('sent', 0)}/{data.get('total', 0)} gönderildi, isabet: %{data.get('accuracy', '?')}")
    else:
        log.error(f"Hata {r.status_code}: {r.text[:200]}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run()
