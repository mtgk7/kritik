"""
Haftalık performans raporu — Her Pazartesi sabah Telegram'a gönderilir.
"""
import logging
from datetime import datetime, timezone, timedelta

import requests
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
from telegram_bot import send

log = logging.getLogger("weekly-report")

SITE_URL = __import__('os').getenv("KRITIK_API_URL", "https://kritik-wine.vercel.app")


def check_prediction(prediction: str | None, home: int, away: int) -> bool | None:
    if not prediction:
        return None
    p = prediction.lower().strip()
    if p == "ms1":             return home > away
    if p == "ms2":             return away > home
    if p in ("x", "beraberlik"): return home == away
    if "2.5 üst" in p:        return home + away > 2
    if "2.5 alt" in p:        return home + away <= 2
    if "1.5 üst" in p:        return home + away > 1
    if "1.5 alt" in p:        return home + away <= 1
    if "kg var" in p:         return home > 0 and away > 0
    if "kg yok" in p:         return home == 0 or away == 0
    return None


def run():
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    now        = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=7)).isoformat()

    result = (
        client.table("matches")
        .select("home_team,away_team,league_name,prediction,confidence_score,home_score,away_score,prediction_correct")
        .eq("status", "bitti")
        .gte("match_time", week_start)
        .not_.is_("prediction", "null")
        .execute()
    )

    matches = result.data or []
    if not matches:
        log.info("Geçen hafta biten maç yok")
        return

    evaluated = []
    for m in matches:
        correct = m.get("prediction_correct")
        if correct is None and m.get("home_score") is not None:
            correct = check_prediction(m.get("prediction"), m["home_score"], m["away_score"])
        if correct is not None:
            evaluated.append({**m, "_correct": correct})

    if not evaluated:
        return

    total   = len(evaluated)
    correct = sum(1 for m in evaluated if m["_correct"])
    pct     = round((correct / total) * 100) if total else 0

    # En iyi lig
    league_stats: dict[str, dict] = {}
    for m in evaluated:
        l = m.get("league_name") or "Genel"
        if l not in league_stats:
            league_stats[l] = {"total": 0, "correct": 0}
        league_stats[l]["total"] += 1
        if m["_correct"]:
            league_stats[l]["correct"] += 1

    best_league = max(league_stats.items(), key=lambda x: x[1]["correct"] / x[1]["total"] if x[1]["total"] >= 3 else 0, default=None)

    emoji = "🟢" if pct >= 65 else "🟡" if pct >= 50 else "🔴"

    lines = [
        f"📊 <b>Haftalık Performans Raporu</b>",
        f"📅 {(now - timedelta(days=7)).strftime('%d %b')} – {now.strftime('%d %b %Y')}\n",
        f"{emoji} İsabet oranı: <b>%{pct}</b>  ({correct}/{total} maç)\n",
    ]

    if best_league and best_league[1]["total"] >= 3:
        bl_pct = round(best_league[1]["correct"] / best_league[1]["total"] * 100)
        lines.append(f"🏆 En iyi lig: <b>{best_league[0]}</b> — %{bl_pct} ({best_league[1]['correct']}/{best_league[1]['total']})\n")

    # Son 5 maç özeti
    lines.append("Son sonuçlar:")
    for m in evaluated[-5:]:
        icon = "✅" if m["_correct"] else "❌"
        lines.append(f"{icon} {m['home_team']} vs {m['away_team']} — {m.get('prediction', '?')}")

    lines.append(f"\n🔗 <a href=\"{SITE_URL}/istatistikler\">Tüm istatistikler →</a>")
    send("\n".join(lines))
    log.info(f"Haftalık rapor gönderildi: %{pct} isabet ({correct}/{total})")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run()
