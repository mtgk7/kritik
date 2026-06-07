import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { answerCallbackQuery, editTelegramMessage } from '@/lib/telegram'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: Request) {
  // Telegram webhook secret token doğrulaması
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
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
