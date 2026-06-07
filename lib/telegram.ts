const TOKEN   = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

export async function sendTelegram(text: string): Promise<void> {
  if (!TOKEN || !CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    })
  } catch {}
}

export async function sendTelegramApproval(
  approvalId: string,
  email: string,
  days: number,
  amount: string,
): Promise<void> {
  if (!TOKEN || !CHAT_ID) return
  const text = [
    `⭐ <b>Yeni Ödeme — Onay Bekliyor</b>`,
    `👤 ${email}`,
    `📅 ${days} gün premium`,
    `💳 ${amount}`,
  ].join('\n')
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Onayla', callback_data: `approve:${approvalId}` },
            { text: '❌ Reddet', callback_data: `deny:${approvalId}` },
          ]],
        },
      }),
    })
  } catch {}
}

export async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  if (!TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
    })
  } catch {}
}

export async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
): Promise<void> {
  if (!TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
    })
  } catch {}
}
