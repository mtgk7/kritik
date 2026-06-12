import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY tanımlı değil.')
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' })
}

const PLANS: Record<string, { priceId: string; days: number; label: string }> = {
  weekly: {
    priceId: process.env.STRIPE_PRICE_WEEKLY!,
    days:    7,
    label:   'Haftalık Premium',
  },
  monthly: {
    priceId: process.env.STRIPE_PRICE_MONTHLY!,
    days:    30,
    label:   'Aylık Premium',
  },
  quarterly: {
    priceId: process.env.STRIPE_PRICE_QUARTERLY!,
    days:    90,
    label:   '3 Aylık Premium',
  },
  annual: {
    priceId: process.env.STRIPE_PRICE_ANNUAL!,
    days:    365,
    label:   'Yıllık Premium',
  },
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Giriş yapmalısın.' }, { status: 401 })
  }

  const { plan = 'monthly' } = await req.json().catch(() => ({}))
  const planConfig = PLANS[plan] ?? PLANS.monthly

  if (!planConfig.priceId) {
    return NextResponse.json({ error: 'Plan bulunamadı.' }, { status: 400 })
  }

  const origin = req.headers.get('origin') ?? 'https://kritik-wine.vercel.app'

  const stripe  = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode:                'payment',
    payment_method_types: ['card'],
    line_items: [{
      price:    planConfig.priceId,
      quantity: 1,
    }],
    metadata: {
      user_id:   user.id,
      user_email: user.email ?? '',
      plan,
      days:      String(planConfig.days),
    },
    customer_email: user.email ?? undefined,
    success_url:    `${origin}/premium-basarili?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:     `${origin}/profil`,
    locale:         'tr',
  })

  return NextResponse.json({ url: session.url })
}
