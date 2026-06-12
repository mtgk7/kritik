import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'VAPID keys missing' }, { status: 500 })
  }
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_SUBJECT ?? 'admin@kritik.app'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ALGORITHM_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, body, url = '/' } = await req.json()
  if (!title) return NextResponse.json({ error: 'title gerekli' }, { status: 400 })

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (!subs?.length) return NextResponse.json({ sent: 0 })

  const payload = JSON.stringify({ title, body, url })
  let sent = 0, failed = 0

  await Promise.allSettled(
    subs.map(async s => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        sent++
      } catch (e: unknown) {
        // 410 Gone = expired subscription, sil
        if ((e as { statusCode?: number }).statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
        failed++
      }
    })
  )

  return NextResponse.json({ sent, failed })
}
