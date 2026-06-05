"""
Email bildirimi — %80+ güven maçları için premium kullanıcılara Resend ile email gönderir.
Kullanım: main.py içinden notify_premium_users(analyzed_all) şeklinde çağrılır.
"""
import os
import logging
from datetime import datetime, timezone

import requests
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
from models import MatchRecord

log = logging.getLogger("email-notifier")

RESEND_KEY   = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL   = os.getenv("EMAIL_FROM", "Kritik <noreply@kritik.app>")
SITE_URL     = os.getenv("KRITIK_API_URL", "https://kritik-wine.vercel.app")
MIN_CONF     = float(os.getenv("EMAIL_MIN_CONF", "0.80"))


def _send(to: str, subject: str, html: str) -> bool:
    if not RESEND_KEY:
        return False
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
        json={"from": FROM_EMAIL, "to": to, "subject": subject, "html": html},
        timeout=10,
    )
    return r.ok


def _build_html(matches: list[MatchRecord]) -> str:
    rows = ""
    for m in matches[:5]:
        conf = int((m.confidence_score or 0) * 100)
        pred = m.prediction or "—"
        rows += f"""
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb">
            <div style="font-weight:600;color:#111827">{m.home_team} vs {m.away_team}</div>
            <div style="font-size:0.8rem;color:#6b7280;margin-top:2px">{m.league_name or ''}</div>
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;text-align:center">
            <span style="font-size:1.25rem;font-weight:800;color:#16a34a">%{conf}</span>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;text-align:center">
            <code style="font-size:0.9rem;font-weight:700;color:#1f2937;background:#f3f4f6;padding:2px 8px;border-radius:4px">{pred}</code>
          </td>
          <td style="padding:14px 0 14px 16px;border-bottom:1px solid #e5e7eb;text-align:right">
            <a href="{SITE_URL}/maclar/{m.id}" style="color:#dc2626;font-weight:600;font-size:0.85rem;text-decoration:none">Analiz →</a>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <!-- Header -->
    <div style="background:#111827;padding:24px 32px">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#6b7280;margin-bottom:6px">KRİTİK</div>
      <h1 style="margin:0;font-size:1.35rem;font-weight:900;color:#f9fafb;text-transform:uppercase;letter-spacing:0.04em">
        🎯 Yüksek Güven Alarm
      </h1>
    </div>
    <!-- Body -->
    <div style="padding:28px 32px">
      <p style="color:#6b7280;margin:0 0 24px;font-size:0.9rem">
        Algoritma bugün <strong>%{int(MIN_CONF*100)}+</strong> güven skorlu maçlar tespit etti.
      </p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb">
            <th style="text-align:left;padding-bottom:10px;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af">Maç</th>
            <th style="text-align:center;padding-bottom:10px;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af">Güven</th>
            <th style="text-align:center;padding-bottom:10px;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af">Tahmin</th>
            <th></th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      <a href="{SITE_URL}" style="display:block;margin-top:28px;text-align:center;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;padding:12px;font-weight:700;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.06em">
        Tüm Analizleri Gör →
      </a>
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb;font-size:0.75rem;color:#9ca3af">
      Kritik Premium üyesisiniz.
      <a href="{SITE_URL}/profil" style="color:#9ca3af">Bildirimleri yönet</a>
    </div>
  </div>
</body>
</html>"""


def notify_premium_users(matches: list[MatchRecord]) -> int:
    if not RESEND_KEY:
        log.info("RESEND_API_KEY eksik — email bildirimi atlandı")
        return 0

    high_conf = [m for m in matches if (m.confidence_score or 0) >= MIN_CONF]
    if not high_conf:
        log.info("Yüksek güven maç yok — email gönderilmedi")
        return 0

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    now = datetime.now(timezone.utc).isoformat()

    result = (
        client.table("users")
        .select("email")
        .eq("is_premium", True)
        .gt("premium_until", now)
        .execute()
    )

    users = result.data or []
    if not users:
        log.info("Premium kullanıcı yok")
        return 0

    html = _build_html(high_conf)
    subject = f"🎯 Kritik: {len(high_conf)} Yüksek Güven Maç Bulundu"
    sent = sum(1 for u in users if _send(u["email"], subject, html))
    log.info(f"Email: {sent}/{len(users)} kullanıcıya gönderildi")
    return sent
