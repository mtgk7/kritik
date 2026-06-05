import { News } from '@/lib/types'

const FALLBACK: Record<string, string> = {
  gunun_haberi:    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&q=80',
  haftanin_haberi: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=300&q=80',
  genel:           'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=300&q=80',
}
const CAT_COLOR: Record<string, string> = {
  gunun_haberi:    'var(--color-accent)',
  haftanin_haberi: 'var(--color-premium)',
  genel:           'oklch(52% 0.18 240)',
}

export default function NewsSidebar({ news }: { news: News[] }) {
  return (
    <aside>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
          letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-primary)',
        }}>
          Haberler
        </h2>
        <a href="/haberler" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}>
          Tümü →
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {news.map((item, i) => {
          const img    = item.image_url ?? FALLBACK[item.category] ?? FALLBACK.genel
          const accent = CAT_COLOR[item.category] ?? 'var(--color-accent)'
          const now    = new Date()
          const pub    = new Date(item.published_at)
          const diffH  = Math.floor((now.getTime() - pub.getTime()) / 3600000)
          const time   = diffH < 1 ? 'Az önce' : diffH < 24 ? `${diffH} sa` : pub.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
          const isLast = i === news.length - 1

          return (
            <a key={item.id} href={`/haberler/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '64px 1fr', gap: '0.75rem',
                padding: '0.85rem 0',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                alignItems: 'start',
              }}>
                <div style={{
                  width: '64px', height: '48px', flexShrink: 0, borderRadius: '6px',
                  backgroundImage: `url(${img})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  backgroundColor: 'var(--color-surface-2)',
                }} />
                <div>
                  {item.tag && (
                    <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, display: 'block', marginBottom: '0.2rem' }}>
                      {item.tag}
                    </span>
                  )}
                  <p style={{
                    fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-primary)',
                    lineHeight: 1.3, margin: 0,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {item.title}
                  </p>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem', display: 'block' }}>
                    {time}
                  </span>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </aside>
  )
}
