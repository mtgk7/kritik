import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendTelegramApproval } from '@/lib/telegram'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY tanımlı değil.')
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' })
}

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
  } catch {
    return NextResponse.json({ error: 'Webhook imzası geçersiz.' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta    = session.metadata ?? {}
    const userId  = meta.user_id
    const days    = parseInt(meta.days ?? '30', 10)

    if (!userId) {
      return NextResponse.json({ error: 'user_id eksik.' }, { status: 400 })
    }

    const email  = session.customer_email ?? session.customer_details?.email ?? 'bilinmiyor'
    const amount = session.amount_total ? `₺${(session.amount_total / 100).toFixed(0)}` : '?'

    const supabase = getServiceClient()

    // Premium doğrudan aktifleştirilmez — admin onayı beklenir
    const { data: approval, error } = await supabase
      .from('pending_approvals')
      .insert({
        user_id:           userId,
        email,
        days,
        amount_try:        session.amount_total ? Math.round(session.amount_total / 100) : null,
        stripe_session_id: session.id,
      })
      .select('id')
      .single()

    if (error || !approval) {
      console.error('pending_approvals insert hatası:', error)
      return NextResponse.json({ error: 'Onay kaydı oluşturulamadı.' }, { status: 500 })
    }

    await sendTelegramApproval(approval.id, email, days, amount)
  }

  return NextResponse.json({ received: true })
}
