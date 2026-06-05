'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleFavorite(formData: FormData) {
  const supabase  = await createClient()
  const matchId   = formData.get('match_id') as string
  const action    = formData.get('action') as 'add' | 'remove'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (action === 'add') {
    await supabase.from('favorites').upsert({ user_id: user.id, match_id: matchId })
  } else {
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('match_id', matchId)
  }

  revalidatePath(`/maclar/${matchId}`)
  revalidatePath('/profil')
}
