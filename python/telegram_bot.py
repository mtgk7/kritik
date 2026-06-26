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


def _conf_emoji(conf: int) -> str:
    if conf >= 80: return "🔥"
    if conf >= 70: return "🟢"
    return "🟡"


def _format_alts(alternatives: list | None, pred: str, pred_c: int | None) -> str:
    """Ana tahmin + alternatifler tek satırda."""
    parts = []
    if pred and pred_c:
        parts.append(f"<b>{pred}</b> %{pred_c}")
    if alternatives:
        for a in alternatives[:3]:
            p = a.get("prediction") or a.get("pred", "")
            c = a.get("confidence", 0)
            if p and c and f"{p}" != pred:
                parts.append(f"{p} %{c}")
    return "  |  ".join(parts) if parts else (pred or "—")


def run():
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    now       = datetime.now(timezone.utc)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    day_end   = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    result = (
        client.table("matches")
        .select("id,home_team,away_team,match_time,league_name,confidence_score,"
                "prediction,prediction_confidence,alternatives,status")
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

    header = (
        f"<b>Kritik — Bugünün Seçili Tahminleri</b>\n"
        f"<i>{now.strftime('%d %B %Y')} · En az %{round(MIN_CONF*100)} güven</i>\n"
        f"{'─' * 28}\n"
    )

    blocks = [header]
    for m in matches[:8]:
        conf    = int((m.get("confidence_score") or 0) * 100)
        pred    = m.get("prediction") or "—"
        pred_c  = m.get("prediction_confidence")
        alts    = m.get("alternatives") or []
        league  = m.get("league_name") or ""
        mt      = m.get("match_time", "")
        try:
            dt = datetime.fromisoformat(mt.replace("Z", "+00:00"))
            t  = dt.strftime("%H:%M")
        except Exception:
            t = "—"

        emoji    = _conf_emoji(conf)
        pred_str = _format_alts(alts, pred, pred_c)

        blocks.append(
            f"{emoji} <b>{m['home_team']} vs {m['away_team']}</b>\n"
            f"   📅 {t}  ·  {league}\n"
            f"   🎯 {pred_str}\n"
            f"   💯 Güven: <b>%{conf}</b>\n"
            f"   🔗 <a href=\"{SITE_URL}/maclar/{m['id']}\">Detaylı analiz</a>\n"
        )

    blocks.append(
        f"<i>Tüm tahminler → <a href=\"{SITE_URL}\">{SITE_URL}</a></i>"
    )

    send("\n".join(blocks))
    log.info(f"Telegram: {len(matches)} maç gönderildi")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run()
