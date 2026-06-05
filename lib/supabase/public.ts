/**
 * BOM-safe Supabase REST fetch yardımcısı.
 * NEXT_PUBLIC_CACHE_TTL (saniye) set edilmişse Next.js data cache kullanır.
 * PowerShell pipe, BOM (﻿) ekleyebilir — her kullanımda temizlenir.
 */

function getEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^﻿/, '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/^﻿/, '').trim()
  return { url, key }
}

const TTL = process.env.NEXT_PUBLIC_CACHE_TTL ? Number(process.env.NEXT_PUBLIC_CACHE_TTL) : 0

export async function supabaseFetch<T>(path: string, ttlOverride?: number): Promise<T[]> {
  const { url, key } = getEnv()
  if (!url || !key) return []

  const ttl = ttlOverride ?? TTL

  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: {
        apikey:        key,
        Authorization: `Bearer ${key}`,
        Accept:        'application/json',
      },
      // Next.js data cache: ttl > 0 ise o kadar saniye önbelleğe al
      next: ttl > 0 ? { revalidate: ttl } : undefined,
      cache: ttl > 0 ? undefined : 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

// Sık değişmeyen veriler için sabit TTL'ler (saniye)
export const CACHE = {
  MATCHES:  30,    // 30 sn — canlı maçlar var, çok bekletme
  COUPONS:  120,   // 2 dk
  NEWS:     300,   // 5 dk
  STATIC:   3600,  // 1 saat (hizmetler, genel sayfalar)
} as const
