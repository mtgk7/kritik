import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { answerCallbackQuery, editTelegramMessage } from '@/lib/telegram'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function sendBotMessage(chatId: number, text: string) {
  if (!TOKEN) return
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {})
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // /start TOKEN mesajı → kullanıcı hesap bağlama
  const message = body.message
  if (message?.text) {
    const text = (message.text as string).trim()
    if (text.startsWith('/start ')) {
      const token = text.slice(7).trim()
      const chatId = message.chat.id as number
      if (token) {
        const supabase = getServiceClient()
        const { data: found } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_verify_token', token)
          .maybeSingle()
        if (found) {
          await supabase.from('users').update({ telegram_chat_id: chatId, telegram_verify_token: null }).eq('id', found.id)
          await sendBotMessage(chatId, '✅ <b>Telegram bildirimler aktif!</b>\n\nKritik hesabın başarıyla bağlandı. Yeni kupon ve yüksek güven maçları için bildirim alacaksın.')
        } else {
          await sendBotMessage(chatId, '❌ Geçersiz veya süresi dolmuş kod.\n\nProfil sayfandan yeni bir bağlantı linki al.')
        }
      }
    }
    return NextResponse.json({ ok: true })
  }

  const query = body.callback_query
  if (!query) return NextResponse.json({ ok: true })

  const [action, approvalId] = (query.data as string).split(':')
  const supabase = getServiceClient()

  const { data: approval } = await supabase
    .from('pending_approvals')
    .select('*')
    .eq('id', approvalId)
    .single()

  if (!approval) {
    await answerCallbackQuery(query.id, '⚠️ Bu onay kaydı artık mevcut değil.')
    return NextResponse.json({ ok: true })
  }

  const chatId    = query.message.chat.id as number
  const msgId     = query.message.message_id as number
  const origText  = query.message.text as string
  const now       = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })

  if (action === 'approve') {
    const premiumUntil = new Date()
    premiumUntil.setDate(premiumUntil.getDate() + approval.days)

    await supabase
      .from('users')
      .update({ is_premium: true, premium_until: premiumUntil.toISOString() })
      .eq('id', approval.user_id)

    await supabase.from('pending_approvals').delete().eq('id', approvalId)

    await answerCallbackQuery(query.id, '✅ Premium aktifleştirildi!')
    await editTelegramMessage(chatId, msgId, `${origText}\n\n✅ <b>ONAYLANDI</b> — ${now}`)

  } else if (action === 'deny') {
    await supabase.from('pending_approvals').delete().eq('id', approvalId)

    await answerCallbackQuery(query.id, '❌ Reddedildi.')
    await editTelegramMessage(chatId, msgId, `${origText}\n\n❌ <b>REDDEDİLDİ</b> — ${now}`)
  }

  return NextResponse.json({ ok: true })
}
