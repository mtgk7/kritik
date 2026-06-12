import { NextResponse } from 'next/server'

// GET /api/telegram/setup?secret=ADMIN_SECRET
// Telegram webhook'u bir kez kaydetmek için çağır
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const TOKEN           = process.env.TELEGRAM_BOT_TOKEN
  const WEBHOOK_SECRET  = process.env.TELEGRAM_WEBHOOK_SECRET
  const BASE_URL        = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kritik-wine.vercel.app'

  if (!TOKEN || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN veya TELEGRAM_WEBHOOK_SECRET eksik' }, { status: 500 })
  }

  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${BASE_URL}/api/telegram`,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query'],
    }),
  })

  const data = await res.json()
  return NextResponse.json(data)
}
