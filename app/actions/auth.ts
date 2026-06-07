'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendTelegram } from '@/lib/telegram'

export async function signUp(formData: FormData) {
  const supabase  = await createClient()
  const email     = formData.get('email') as string
  const password  = formData.get('password') as string
  const refCode   = (formData.get('ref') as string)?.trim().toUpperCase() || null

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return redirect(`/kayit?error=${encodeURIComponent(error.message)}`)

  const userId = data.user?.id
  if (userId) {
    let referredBy: string | null = null
    if (refCode) {
      const { data: refUser } = await supabase
        .from('users').select('id').eq('referral_code', refCode).single()
      if (refUser) referredBy = refUser.id
    }

    await supabase.from('users').upsert({
      id: userId, email,
      is_premium: false,
      referred_by: referredBy,
    })

    // Referral bonusu: davet eden +7 gün premium
    if (referredBy) {
      const { data: refProfile } = await supabase
        .from('users').select('premium_until').eq('id', referredBy).single()
      const base = refProfile?.premium_until && new Date(refProfile.premium_until) > new Date()
        ? new Date(refProfile.premium_until)
        : new Date()
      base.setDate(base.getDate() + 7)
      await supabase.from('users').update({ is_premium: true, premium_until: base.toISOString() }).eq('id', referredBy)
      await sendTelegram(`🎁 <b>Referral Bonusu</b>\nBirini davet ettin → +7 gün premium!\nDavet edilen: ${email}`)
    }

    await sendTelegram(`👤 <b>Yeni Üye</b>\n${email}${referredBy ? ' (referral)' : ''}`)
  }

  return redirect(`/giris?mesaj=${encodeURIComponent('Kayıt başarılı, giriş yapabilirsiniz.')}`)
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return redirect(`/giris?error=${encodeURIComponent(error.message)}`)

  return redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/giris')
}
