'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'

function calcPredictionCorrect(prediction: string, home: number, away: number): boolean | null {
  const p = prediction.toLowerCase().trim()
  if (p === 'ms1')                                   return home > away
  if (p === 'ms2')                                   return away > home
  if (p === 'x' || p === 'beraberlik')               return home === away
  if (p.includes('2.5 üst') || p.includes('2.5üst')) return home + away > 2.5
  if (p.includes('2.5 alt') || p.includes('2.5alt')) return home + away <= 2
  if (p.includes('1.5 üst') || p.includes('1.5üst')) return home + away > 1.5
  if (p.includes('1.5 alt') || p.includes('1.5alt')) return home + away <= 1
  if (p.includes('kg var'))                          return home > 0 && away > 0
  if (p.includes('kg yok'))                          return home === 0 || away === 0
  return null
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function approvePendingApproval(formData: FormData) {
  const id      = formData.get('id') as string
  const userId  = formData.get('user_id') as string
  const days    = parseInt(formData.get('days') as string, 10)
  const email   = formData.get('email') as string

  const supabase = getServiceClient()

  // Premium süresini hesapla
  const { data: profile } = await supabase.from('users').select('premium_until').eq('id', userId).single()
  const base = profile?.premium_until && new Date(profile.premium_until) > new Date()
    ? new Date(profile.premium_until)
    : new Date()
  base.setDate(base.getDate() + days)

  await supabase.from('users').update({
    is_premium:    true,
    premium_until: base.toISOString(),
  }).eq('id', userId)

  await supabase.from('pending_approvals').delete().eq('id', id)

  await sendTelegram(`✅ <b>Premium Aktifleştirildi</b>\n${email} → +${days} gün`)

  return redirect('/admin?mesaj=Premium aktifleştirildi')
}

export async function rejectPendingApproval(formData: FormData) {
  const id    = formData.get('id') as string
  const email = formData.get('email') as string

  const supabase = getServiceClient()
  await supabase.from('pending_approvals').delete().eq('id', id)
  await sendTelegram(`❌ <b>Ödeme Reddedildi</b>\n${email}`)

  return redirect('/admin?mesaj=Ödeme reddedildi')
}

export async function approveCouponPurchase(formData: FormData) {
  const id    = formData.get('id') as string
  const email = formData.get('email') as string

  const supabase = getServiceClient()
  await supabase.from('coupon_purchases').update({ status: 'onaylandi' }).eq('id', id)
  await sendTelegram(`✅ <b>Kupon Talebi Onaylandı</b>\n${email}`)

  return redirect('/admin?mesaj=Kupon talebi onaylandı')
}

export async function rejectCouponPurchase(formData: FormData) {
  const id    = formData.get('id') as string
  const email = formData.get('email') as string

  const supabase = getServiceClient()
  await supabase.from('coupon_purchases').update({ status: 'reddedildi' }).eq('id', id)
  await sendTelegram(`❌ <b>Kupon Talebi Reddedildi</b>\n${email}`)

  return redirect('/admin?mesaj=Kupon talebi reddedildi')
}

export async function addNews(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('news').insert({
    title:        formData.get('title'),
    summary:      formData.get('summary'),
    category:     formData.get('category'),
    tag:          formData.get('tag') || null,
    is_published: formData.get('is_published') !== 'false',
  })

  if (error) {
    return redirect(`/admin/haber-ekle?error=${encodeURIComponent(error.message)}`)
  }

  return redirect('/admin?mesaj=Haber eklendi')
}

function parseSofaId(url: string): number | null {
  if (!url) return null
  // https://www.sofascore.com/tr/mac/brazil-morocco/12345678 → 12345678
  const m = url.match(/\/(\d{5,10})(?:[#?]|$)/)
  if (m) return parseInt(m[1])
  // Sadece sayı girilmişse
  if (/^\d+$/.test(url.trim())) return parseInt(url.trim())
  return null
}

export async function addMatch(formData: FormData) {
  const supabase = await createClient()

  const missingPlayersRaw = formData.get('missing_players') as string
  let missing_players = []
  try {
    missing_players = missingPlayersRaw ? JSON.parse(missingPlayersRaw) : []
  } catch {
    missing_players = []
  }

  const sofascoreInput = formData.get('sofascore_url') as string
  const sofascore_id   = parseSofaId(sofascoreInput)

  const { error } = await supabase.from('matches').insert({
    home_team: formData.get('home_team'),
    away_team: formData.get('away_team'),
    match_time: formData.get('match_time'),
    league_name: formData.get('league_name') || 'Genel',
    status: formData.get('status') || 'yakında',
    home_score: formData.get('home_score') !== '' ? Number(formData.get('home_score')) : null,
    away_score: formData.get('away_score') !== '' ? Number(formData.get('away_score')) : null,
    home_xg: formData.get('home_xg') ? Number(formData.get('home_xg')) : null,
    away_xg: formData.get('away_xg') ? Number(formData.get('away_xg')) : null,
    home_form_score: formData.get('home_form_score') ? Number(formData.get('home_form_score')) : null,
    away_form_score: formData.get('away_form_score') ? Number(formData.get('away_form_score')) : null,
    critical_missing_effect: formData.get('critical_missing_effect') ? Number(formData.get('critical_missing_effect')) : null,
    confidence_score: formData.get('confidence_score') ? Number(formData.get('confidence_score')) : null,
    prediction: formData.get('prediction') || null,
    prediction_confidence: formData.get('prediction_confidence') ? Number(formData.get('prediction_confidence')) : null,
    analysis: formData.get('analysis') || null,
    is_free_preview: formData.get('is_free_preview') === 'true',
    missing_players,
    ...(sofascore_id ? { sofascore_id } : {}),
  })

  if (error) {
    return redirect(`/admin/mac-ekle?error=${encodeURIComponent(error.message)}`)
  }

  return redirect('/admin?mesaj=Maç eklendi')
}

export async function addCoupon(formData: FormData) {
  const supabase = await createClient()

  // Checkbox array (match_ids[]) veya eski textarea (matches) destekle
  const checkboxIds = formData.getAll('match_ids') as string[]
  const textareaVal = formData.get('matches') as string | null
  const matchIds = checkboxIds.length > 0
    ? checkboxIds.filter(Boolean)
    : (textareaVal ?? '').split(',').map(s => s.trim()).filter(Boolean)

  const priceTry = formData.get('price_try') as string
  const { error } = await supabase.from('coupons').insert({
    coupon_type:    formData.get('coupon_type'),
    matches:        matchIds,
    total_rate:     formData.get('total_rate') ? Number(formData.get('total_rate')) : null,
    is_premium:     formData.get('is_premium') === 'true',
    is_editor_pick: formData.get('is_editor_pick') === 'true',
    editor_note:    (formData.get('editor_note') as string)?.trim() || null,
    price_try:      priceTry ? parseInt(priceTry) : null,
  })

  if (error) {
    return redirect(`/admin/kupon-ekle?error=${encodeURIComponent(error.message)}`)
  }

  return redirect('/admin?mesaj=Kupon eklendi')
}

export async function deleteMatch(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('matches').delete().eq('id', id)
  return redirect('/admin?mesaj=Maç silindi')
}

export async function deleteNews(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('news').delete().eq('id', id)
  return redirect('/admin?mesaj=Haber silindi')
}

export async function deleteCoupon(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('coupons').delete().eq('id', id)
  return redirect('/admin?mesaj=Kupon silindi')
}

export async function updateMatch(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  const missingPlayersRaw = formData.get('missing_players') as string
  let missing_players = []
  try { missing_players = missingPlayersRaw ? JSON.parse(missingPlayersRaw) : [] } catch { missing_players = [] }

  const sofascoreInput = formData.get('sofascore_url') as string
  const sofascore_id   = parseSofaId(sofascoreInput)

  const status     = (formData.get('status') || 'yakında') as string
  const prediction = (formData.get('prediction') as string) || null
  const home_score = formData.get('home_score') !== '' ? Number(formData.get('home_score')) : null
  const away_score = formData.get('away_score') !== '' ? Number(formData.get('away_score')) : null

  // Status bitti + skorlar varsa prediction_correct otomatik hesapla
  let prediction_correct: boolean | null = null
  if (status === 'bitti' && prediction && home_score !== null && away_score !== null) {
    prediction_correct = calcPredictionCorrect(prediction, home_score, away_score)
  }

  const { error } = await supabase.from('matches').update({
    home_team: formData.get('home_team'),
    away_team: formData.get('away_team'),
    match_time: formData.get('match_time'),
    league_name: formData.get('league_name') || 'Genel',
    status,
    home_score,
    away_score,
    home_xg: formData.get('home_xg') ? Number(formData.get('home_xg')) : null,
    away_xg: formData.get('away_xg') ? Number(formData.get('away_xg')) : null,
    home_form_score: formData.get('home_form_score') ? Number(formData.get('home_form_score')) : null,
    away_form_score: formData.get('away_form_score') ? Number(formData.get('away_form_score')) : null,
    critical_missing_effect: formData.get('critical_missing_effect') ? Number(formData.get('critical_missing_effect')) : null,
    confidence_score: formData.get('confidence_score') ? Number(formData.get('confidence_score')) : null,
    prediction,
    prediction_confidence: formData.get('prediction_confidence') ? Number(formData.get('prediction_confidence')) : null,
    prediction_correct,
    analysis: formData.get('analysis') || null,
    is_free_preview: formData.get('is_free_preview') === 'true',
    missing_players,
    ...(sofascore_id ? { sofascore_id } : {}),
  }).eq('id', id)

  if (error) return redirect(`/admin/mac-duzenle/${id}?error=${encodeURIComponent(error.message)}`)
  return redirect('/admin?mesaj=Maç güncellendi')
}

export async function triggerBot() {
  const raw   = process.env.GH_PAT ?? ''
  const token = raw.split('').filter(c => { const n = c.charCodeAt(0); return n >= 32 && n <= 126 }).join('').trim() || null
  const repo  = process.env.GITHUB_REPO ?? 'mtgk7/kritik'

  if (!token) return redirect('/admin?error=GH_PAT+eksik')

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/bot.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'master' }),
      }
    )
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return redirect(`/admin?error=${encodeURIComponent(`HTTP ${res.status}: ${body.slice(0, 100)}`)}`)
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return redirect(`/admin?error=${encodeURIComponent(msg)}`)
  }

  return redirect('/admin?mesaj=Bot+tetiklendi')
}

export async function requestCouponPurchase(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/giris?sonra=kuponlar')

  const coupon_id  = formData.get('coupon_id') as string
  const amount_try = parseInt(formData.get('amount_try') as string)

  // Daha önce talep ettiyse tekrar ekleme
  const { data: existing } = await supabase
    .from('coupon_purchases')
    .select('id')
    .eq('coupon_id', coupon_id)
    .eq('user_id', user.id)
    .eq('status', 'bekliyor')
    .single()

  if (!existing) {
    await supabase.from('coupon_purchases').insert({
      coupon_id,
      user_id:    user.id,
      email:      user.email ?? '',
      amount_try,
    })

    await sendTelegram(
      `🛒 <b>Kupon Satın Alma Talebi</b>\n` +
      `Kullanıcı: ${user.email}\n` +
      `Kupon ID: ${coupon_id}\n` +
      `Fiyat: ₺${amount_try}\n\n` +
      `Onayla: Supabase → coupon_purchases tablosu → status = 'onaylandi'`
    )
  }

  return redirect(`/kuponlar/${coupon_id}?talep=gonderildi`)
}

export async function sendWeeklyDigest() {
  const secret  = process.env.ALGORITHM_SECRET ?? ''
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

  if (!secret) return redirect('/admin?error=ALGORITHM_SECRET+eksik')

  try {
    const res = await fetch(`${siteUrl}/api/email/weekly-digest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return redirect(`/admin?error=${encodeURIComponent(data.error ?? `HTTP ${res.status}`)}`)
    }
    return redirect(`/admin?mesaj=${encodeURIComponent(`Haftalık özet ${data.sent ?? 0} kişiye gönderildi`)}`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return redirect(`/admin?error=${encodeURIComponent(msg)}`)
  }
}
