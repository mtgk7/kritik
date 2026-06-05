import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendTelegram } from '@/lib/telegram'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY tanımlı değil.')
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' })
}

// Service role client — RLS bypass, webhook'tan kullanıcı güncellemesi için
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: Request) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    return NextResponse.json({ error: 'Webhook imzası geçersiz.' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object as Stripe.Checkout.Session
    const meta     = session.metadata ?? {}
    const userId   = meta.user_id
    const days     = parseInt(meta.days ?? '30', 10)

    if (!userId) {
      return NextResponse.json({ error: 'user_id eksik.' }, { status: 400 })
    }

    const premiumUntil = new Date()
    premiumUntil.setDate(premiumUntil.getDate() + days)

    const supabase = getServiceClient()
    const { error } = await supabase
      .from('users')
      .update({
        is_premium:    true,
        premium_until: premiumUntil.toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Supabase güncelleme hatası:', error)
      return NextResponse.json({ error: 'Kullanıcı güncellenemedi.' }, { status: 500 })
    }

    console.log(`Premium aktifleştirildi: ${userId} — ${days} gün`)
    const email = session.customer_email ?? session.customer_details?.email ?? 'bilinmiyor'
    await sendTelegram(`⭐ <b>Yeni Premium Üye</b>\n${email} — ${days} gün`)
  }

  return NextResponse.json({ received: true })
}

// Stripe raw body gerektirir — Next.js body parsing'i devre dışı bırak
export const config = { api: { bodyParser: false } }
