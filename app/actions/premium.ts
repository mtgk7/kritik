'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function setPremium(formData: FormData) {
  const supabase = await createClient()
  const userId = formData.get('user_id') as string
  const isPremium = formData.get('is_premium') === 'true'
  const days = Number(formData.get('days') ?? 30)

  const premium_until = isPremium
    ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await supabase
    .from('users')
    .update({ is_premium: isPremium, premium_until })
    .eq('id', userId)

  if (error) {
    return redirect(`/admin/kullanicilar?error=${encodeURIComponent(error.message)}`)
  }

  return redirect('/admin/kullanicilar?mesaj=Kullanıcı güncellendi')
}
