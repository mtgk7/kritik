'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateNotifPrefs(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/giris')

  const leagues_raw = formData.get('notif_leagues') as string
  const notif_leagues = leagues_raw
    ? leagues_raw.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const { error } = await supabase.from('users').update({
    notif_min_conf:  Number(formData.get('notif_min_conf') ?? 0.65),
    notif_telegram:  formData.get('notif_telegram') === 'true',
    notif_leagues,
  }).eq('id', user.id)

  if (error) return redirect(`/profil?error=${encodeURIComponent(error.message)}`)
  return redirect('/profil?mesaj=Bildirim tercihleri kaydedildi')
}

export async function updateFavoriteTeams(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/giris')

  const teams = formData.getAll('fav_team') as string[]
  await supabase.from('users').update({ notif_teams: teams }).eq('id', user.id)
  return redirect('/profil?mesaj=Favori takımlar kaydedildi')
}

export async function disconnectTelegram() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/giris')
  await supabase.from('users').update({ telegram_chat_id: null, telegram_verify_token: null }).eq('id', user.id)
  return redirect('/profil?mesaj=Telegram bağlantısı kesildi')
}
