import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = Math.floor(100000 + Math.random() * 900000).toString()
  await supabase.from('users').update({ telegram_verify_token: token }).eq('id', user.id)

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'KritikPremiumBot'
  return NextResponse.json({ link: `https://t.me/${botUsername}?start=${token}` })
}
