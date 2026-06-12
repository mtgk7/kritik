'use client'

import { useRef, useState, useEffect } from 'react'
import { News } from '@/lib/types'

const FALLBACK: Record<string, string> = {
  gunun_haberi:    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=85',
  haftanin_haberi: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1200&q=85',
  genel:           'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=1200&q=85',
}
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

export default function NewsCarousel({ news }: { news: News[] }) {
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth)
      setActive(i)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const goTo = (i: number) => {
    if (!ref.current) return
    ref.current.scrollTo({ left: i * ref.current.clientWidth, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: '3rem' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
          letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-primary)',
        }}>
          Öne Çıkanlar
        </h2>
        <a href="/haberler" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}>
          Tümünü Gör →
        </a>
      </div>

      {/* Carousel çerçevesi */}
      <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
        <div
          ref={ref}
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {news.map((item) => {
            const img    = item.image_url ?? FALLBACK[item.category] ?? FALLBACK.genel
            const accent = CAT_COLOR[item.category] ?? 'var(--color-accent)'
            const label  = item.tag ?? CAT_LABEL[item.category] ?? ''
            const now    = new Date()
            const pub    = new Date(item.published_at)
            const diffH  = Math.floor((now.getTime() - pub.getTime()) / 3600000)
            const time   = diffH < 1 ? 'Az önce' : diffH < 24 ? `${diffH} saat önce` : pub.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })

            return (
              <a
                key={item.id}
                href={`/haberler/${item.id}`}
                style={{ flexShrink: 0, width: '100%', scrollSnapAlign: 'start', textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                {/* Büyük fotoğraf */}
                <div style={{
                  width: '100%',
                  aspectRatio: '16 / 7',
                  backgroundImage: `url(${img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: 'var(--color-border)',
                  position: 'relative',
                }}>
                  {/* Gradient overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, oklch(10% 0.01 255 / 0.75) 0%, transparent 55%)',
                  }} />
                  {/* Kategori badge üstte */}
                  <span style={{
                    position: 'absolute', top: '0.85rem', left: '0.85rem',
                    fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'oklch(97% 0.005 255)',
                    background: accent, borderRadius: '4px', padding: '0.2rem 0.55rem',
                  }}>
                    {label}
                  </span>
                </div>

                {/* Başlık + meta */}
                <div style={{ padding: '1rem 1.1rem 1.1rem' }}>
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.2,
                    marginBottom: '0.4rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.title}
                  </p>
                  {item.summary && (
                    <p style={{
                      fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      marginBottom: '0.5rem',
                    }}>
                      {item.summary}
                    </p>
                  )}
                  <span suppressHydrationWarning style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>{time}</span>
                </div>
              </a>
            )
          })}
        </div>
      </div>

      {/* Nokta indikatörleri */}
      {news.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem' }}>
          {news.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Haber ${i + 1}`}
              style={{
                width: active === i ? '18px' : '6px',
                height: '6px',
                borderRadius: '99px',
                background: active === i ? 'var(--color-accent)' : 'var(--color-border-strong)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'width 0.25s ease, background 0.2s ease',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
