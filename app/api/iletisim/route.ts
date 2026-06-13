import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sendTelegram } from '@/lib/telegram'

const resend = new Resend(process.env.RESEND_API_KEY)
const TO     = 'info@kritikanaliz.com'
const FROM   = process.env.EMAIL_FROM ?? 'Kritik <noreply@kritik.app>'

export async function POST(req: NextRequest) {
  const { ad, eposta, konu, mesaj } = await req.json()

  if (!ad?.trim() || !eposta?.trim() || !konu?.trim() || !mesaj?.trim()) {
    return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 })
  }

  if (mesaj.trim().length < 10) {
    return NextResponse.json({ error: 'Mesaj en az 10 karakter olmalıdır.' }, { status: 400 })
  }

  try {
    await sendTelegram(
      `📬 <b>Yeni İletişim Formu</b>\n` +
      `👤 ${ad}\n` +
      `✉️ ${eposta}\n` +
      `📌 ${konu}\n\n` +
      `${mesaj.trim().slice(0, 300)}${mesaj.trim().length > 300 ? '…' : ''}`
    )

    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: eposta,
      subject: `[Kritik İletişim] ${konu}`,
      html: `
        <h2>Yeni İletişim Talebi</h2>
        <p><strong>Ad Soyad:</strong> ${ad}</p>
        <p><strong>E-posta:</strong> ${eposta}</p>
        <p><strong>Konu:</strong> ${konu}</p>
        <hr />
        <p><strong>Mesaj:</strong></p>
        <p style="white-space:pre-wrap">${mesaj}</p>
      `,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'E-posta gönderilemedi. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}
