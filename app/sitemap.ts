import { supabaseFetch } from '@/lib/supabase/public'
import { Match, Coupon, News } from '@/lib/types'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

export default async function sitemap() {
  const [matches, coupons, news] = await Promise.all([
    supabaseFetch<Match>('matches?select=id,created_at'),
    supabaseFetch<Coupon>('coupons?select=id,created_at'),
    supabaseFetch<News>('news?select=id,published_at&is_published=eq.true'),
  ])

  const statics = [
    { path: '',                  priority: 1.0, freq: 'hourly'  },
    { path: '/sonuclar',         priority: 0.9, freq: 'daily'   },
    { path: '/istatistikler',    priority: 0.9, freq: 'daily'   },
    { path: '/karli-tahminler',  priority: 0.8, freq: 'daily'   },
    { path: '/takip',            priority: 0.8, freq: 'daily'   },
    { path: '/haberler',         priority: 0.7, freq: 'daily'   },
    { path: '/oneriler',         priority: 0.7, freq: 'daily'   },
    { path: '/hizmetler',        priority: 0.6, freq: 'weekly'  },
  ].map(({ path, priority, freq }) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: freq as 'hourly' | 'daily' | 'weekly',
    priority,
  }))

  const matchPages = matches.map(m => ({
    url: `${BASE}/maclar/${m.id}`,
    lastModified: new Date(m.created_at),
    changeFrequency: 'hourly' as const,
    priority: 0.7,
  }))

  const couponPages = coupons.map(c => ({
    url: `${BASE}/oneriler/${c.id}`,
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
