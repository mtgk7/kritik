import { supabaseFetch } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { News } from '@/lib/types'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

const FALLBACK_IMG: Record<string, string> = {
  gunun_haberi:    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80',
  haftanin_haberi: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&q=80',
  genel:           'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=1200&q=80',
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const rows = await supabaseFetch<News>(`news?select=title,summary,image_url,category,published_at,tag&id=eq.${id}&is_published=eq.true&limit=1`)
  const item = rows[0]
  if (!item) return {}

  const img  = item.image_url ?? FALLBACK_IMG[item.category] ?? FALLBACK_IMG.genel
  const desc = (item.summary ?? '').slice(0, 155) || 'Kritik spor haberleri ve analizleri.'

  return {
    title:       `${item.title} — Kritik`,
    description: desc,
    openGraph: {
      title:         item.title,
      description:   desc,
      url:           `${SITE}/haberler/${id}`,
      type:          'article',
      publishedTime: item.published_at,
      images:        [{ url: img, width: 1200, height: 630, alt: item.title }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       item.title,
      description: desc,
      images:      [img],
    },
  }
}

export default async function HaberDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const rows = await supabaseFetch<News>(`news?select=*&id=eq.${id}&is_published=eq.true&limit=1`)
  const data = rows[0] ?? null

  if (!data) notFound()

  const item = data as News

  const pub   = new Date(item.published_at)
  const now   = new Date()
  const diffH = Math.floor((now.getTime() - pub.getTime()) / 3600000)
  const time  = diffH < 1 ? 'Az önce'
    : diffH < 24 ? `${diffH} saat önce`
    : pub.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const CAT_COLOR: Record<string, string> = {
    gunun_haberi:    'var(--color-accent)',
    haftanin_haberi: 'var(--color-premium)',
    genel:           'oklch(52% 0.18 240)',
  }
  const CAT_LABEL: Record<string, string> = {
    gunun_haberi:    'Bugün',
    haftanin_haberi: 'Bu Hafta',
    genel:           'Haber',
  }
  const FALLBACK: Record<string, string> = {
    gunun_haberi:    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80',
    haftanin_haberi: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&q=80',
    genel:           'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=1200&q=80',
  }

  const accent = CAT_COLOR[item.category] ?? 'var(--color-accent)'
  const label  = item.tag ?? CAT_LABEL[item.category] ?? ''
  const img    = item.image_url ?? FALLBACK[item.category] ?? FALLBACK.genel

  // İçerik: content varsa kullan, yoksa summary
  const bodyText = item.content && item.content.length > item.summary.length
    ? item.content
    : item.summary

  // Paragrafları böl
  const paragraphs = bodyText
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '5rem' }}>

      <a href="/haberler" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
        ← Haberler
      </a>

      {/* Kategori + tarih */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'oklch(97% 0.005 255)',
          background: accent, borderRadius: '4px', padding: '0.2rem 0.55rem',
        }}>
          {label}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{time}</span>
        {item.tag && (
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
            Kaynak: {item.tag}
          </span>
        )}
      </div>

      {/* Başlık */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        color: 'var(--color-text-primary)',
        lineHeight: 1.1,
        marginBottom: '1.75rem',
      }}>
        {item.title}
      </h1>

      {/* Kapak görseli */}
      <div style={{
        width: '100%', aspectRatio: '16/7',
        backgroundImage: `url(${img})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: 'var(--color-surface-2)',
        borderRadius: '12px',
        marginBottom: '2rem',
      }} />

      {/* İçerik */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{
            fontSize: i === 0 ? '1rem' : '0.92rem',
            fontWeight: i === 0 ? 500 : 400,
            color: i === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            lineHeight: 1.7,
            borderLeft: i === 0 ? `3px solid ${accent}` : 'none',
            paddingLeft: i === 0 ? '1rem' : '0',
          }}>
            {p}
          </p>
        ))}
      </div>

      {/* Kaynak linki */}
      {item.source_url && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--color-surface-2)',
          borderRadius: '10px',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.2rem' }}>
              Kaynak
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {item.tag ?? 'Orijinal haber'}
            </div>
          </div>
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'oklch(97% 0.005 255)',
              background: 'var(--color-accent)',
              textDecoration: 'none',
              borderRadius: '7px',
              padding: '0.45rem 1rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Haberin tamamını oku →
          </a>
        </div>
      )}

      {/* Kaynak URL yoksa sadece kaynak adı göster */}
      {!item.source_url && item.tag && (
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          Kaynak: {item.tag}
        </div>
      )}

    </main>
  )
}
