/**
 * BOM-safe Supabase REST fetch yardımcısı.
 * PowerShell pipe, BOM (﻿) ekleyebilir — her kullanımda temizlenir.
 */

function getEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^﻿/, '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/^﻿/, '').trim()
  return { url, key }
}

export async function supabaseFetch<T>(path: string): Promise<T[]> {
  const { url, key } = getEnv()
  if (!url || !key) return []

  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: {
        apikey:        key,
        Authorization: `Bearer ${key}`,
        Accept:        'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}
