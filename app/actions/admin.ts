'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

export async function addMatch(formData: FormData) {
  const supabase = await createClient()

  const missingPlayersRaw = formData.get('missing_players') as string
  let missing_players = []
  try {
    missing_players = missingPlayersRaw ? JSON.parse(missingPlayersRaw) : []
  } catch {
    missing_players = []
  }

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
  })

  if (error) {
    return redirect(`/admin/mac-ekle?error=${encodeURIComponent(error.message)}`)
  }

  return redirect('/admin?mesaj=Maç eklendi')
}

export async function addCoupon(formData: FormData) {
  const supabase = await createClient()

  const matchIds = (formData.get('matches') as string)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const { error } = await supabase.from('coupons').insert({
    coupon_type:    formData.get('coupon_type'),
    matches:        matchIds,
    total_rate:     formData.get('total_rate') ? Number(formData.get('total_rate')) : null,
    is_premium:     formData.get('is_premium') === 'true',
    is_editor_pick: formData.get('is_editor_pick') === 'true',
    editor_note:    (formData.get('editor_note') as string)?.trim() || null,
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
