"""
Telegram botu — günlük yüksek güven maçlarını kanala gönderir.
Kullanım: python telegram_bot.py
"""
import os
import logging
from datetime import datetime, timezone, timedelta

import requests
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

log = logging.getLogger("telegram-bot")

TELEGRAM_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
SITE_URL         = os.getenv("KRITIK_API_URL", "https://kritik-wine.vercel.app")
MIN_CONF         = float(os.getenv("TELEGRAM_MIN_CONF", "0.65"))


def send(text: str) -> bool:
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        log.warning("TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID eksik — atlanıyor")
        return False
    r = requests.post(
        f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
        json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        },
        timeout=10,
    )
    if not r.ok:
        log.warning(f"Telegram hata: {r.status_code} {r.text}")
    return r.ok


def run():
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    now        = datetime.now(timezone.utc)
    day_start  = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    day_end    = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    result = (
        client.table("matches")
        .select("id,home_team,away_team,match_time,league_name,confidence_score,prediction,prediction_confidence,status")
        .gte("match_time", day_start)
        .lt("match_time", day_end)
        .gte("confidence_score", MIN_CONF)
        .neq("status", "bitti")
        .order("confidence_score", desc=True)
        .execute()
    )

    matches = result.data or []
    if not matches:
        log.info("Bugün yüksek güven maçı yok — mesaj gönderilmedi")
        return

    lines = [f"🎯 <b>Bugünün Yüksek Güven Maçları</b> — {now.strftime('%d %b')}\n"]

    for m in matches[:6]:
        conf    = int((m.get("confidence_score") or 0) * 100)
        pred    = m.get("prediction") or "—"
        pred_c  = m.get("prediction_confidence")
        league  = m.get("league_name") or ""
        mt      = m.get("match_time", "")
        try:
            t = datetime.fromisoformat(mt.replace("Z", "+00:00")).strftime("%H:%M")
        except Exception:
            t = "—"

        emoji = "🟢" if conf >= 75 else "🟡"
        pred_str = f"{pred} %{pred_c}" if pred_c else pred

        lines.append(
            f"{emoji} <b>{m['home_team']} vs {m['away_team']}</b>\n"
            f"   📅 {t}  •  {league}\n"
            f"   🎲 <code>{pred_str}</code>  •  💯 <b>%{conf}</b> güven\n"
            f"   🔗 <a href=\"{SITE_URL}/maclar/{m['id']}\">Detaylı analiz →</a>\n"
        )

    send("\n".join(lines))
    log.info(f"Telegram: {len(matches)} maç gönderildi")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run()
