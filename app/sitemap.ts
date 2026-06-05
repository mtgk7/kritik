import { supabaseFetch } from '@/lib/supabase/public'
import { Match, Coupon, News } from '@/lib/types'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

export default async function sitemap() {
  const [matches, coupons, news] = await Promise.all([
    supabaseFetch<Match>('matches?select=id,created_at'),
    supabaseFetch<Coupon>('coupons?select=id,created_at'),
    supabaseFetch<News>('news?select=id,published_at&is_published=eq.true'),
  ])

  const statics = ['', '/haberler', '/kuponlar', '/hizmetler'].map(path => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  const matchPages = matches.map(m => ({
    url: `${BASE}/maclar/${m.id}`,
    lastModified: new Date(m.created_at),
    changeFrequency: 'hourly' as const,
    priority: 0.7,
  }))

  const couponPages = coupons.map(c => ({
    url: `${BASE}/kuponlar/${c.id}`,
    lastModified: new Date(c.created_at),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }))

  const newsPages = news.map(n => ({
    url: `${BASE}/haberler/${n.id}`,
    lastModified: new Date(n.published_at),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [...statics, ...matchPages, ...couponPages, ...newsPages]
}
