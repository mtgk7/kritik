import { supabaseFetch } from '@/lib/supabase/public'
import { News } from '@/lib/types'
import { meta } from '@/lib/metadata'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Haberler', 'Günün ve haftanın öne çıkan maç haberleri ve analizleri.')

const FALLBACK: Record<string, string> = {
  gunun_haberi:    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80',
  haftanin_haberi: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=600&q=80',
  genel:           'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=600&q=80',
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

export default async function HaberlerPage() {
  const allNews = await supabaseFetch<News>('news?select=*&is_published=eq.true&order=published_at.desc')

  const gunun    = allNews.filter(n => n.category === 'gunun_haberi')
  const haftanin = allNews.filter(n => n.category === 'haftanin_haberi')
  const genel    = allNews.filter(n => n.category === 'genel')

  return (
    <main style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '4rem' }}>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.03em',
          textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '0.4rem',
        }}>
          Haberler
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Günün ve haftanın öne çıkan gelişmeleri
        </p>
      </div>

      {allNews.length === 0 ? (
        <p style={{ color: 'var(--color-text-tertiary)', paddingTop: '2rem' }}>Henüz haber yok.</p>
      ) : (
        <>
          {gunun.length > 0 && (
            <NewsSection title="Günün Öne Çıkanları" items={gunun} accent={CAT_COLOR.gunun_haberi} />
          )}
          {haftanin.length > 0 && (
            <NewsSection title="Haftanın Öne Çıkanları" items={haftanin} accent={CAT_COLOR.haftanin_haberi} />
          )}
          {genel.length > 0 && (
            <NewsSection title="Genel" items={genel} accent={CAT_COLOR.genel} />
          )}
        </>
      )}
    </main>
  )
}

function NewsSection({ title, items, accent }: { title: string; items: News[]; accent: string }) {
  const visible  = items.slice(0, 10)
  const hasMore  = items.length > 10

  return (
    <section style={{ marginBottom: '3.5rem' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ width: '3px', height: '18px', borderRadius: '2px', background: accent }} />
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem',
          letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)',
          flex: 1,
        }}>
          {title}
        </h2>
        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>
          {items.length} haber
        </span>
      </div>

      {/* Yatay kaydırma */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        overflowX: 'auto',
        paddingBottom: '0.75rem',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {visible.map((item) => (
          <NewsCard key={item.id} item={item} accent={accent} />
        ))}

        {/* "Tümünü Gör" kartı */}
        {hasMore && (
          <a href="#" style={{
            flexShrink: 0, width: '180px', scrollSnapAlign: 'start',
            background: 'var(--color-surface-2)', borderRadius: '10px',
            border: `1.5px dashed ${accent}`, textDecoration: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '0.5rem', padding: '1.5rem',
            minHeight: '240px',
          }}>
            <span style={{ fontSize: '1.5rem' }}>→</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: accent, textAlign: 'center', letterSpacing: '0.05em' }}>
              +{items.length - 10} haber daha
            </span>
          </a>
        )}
      </div>
    </section>
  )
}

function NewsCard({ item, accent }: { item: News; accent: string }) {
  const img   = item.image_url ?? FALLBACK[item.category] ?? FALLBACK.genel
  const label = item.tag ?? CAT_LABEL[item.category] ?? ''

  const now    = new Date()
  const pub    = new Date(item.published_at)
  const diffH  = Math.floor((now.getTime() - pub.getTime()) / 3600000)
  const time   = diffH < 1 ? 'Az önce' : diffH < 24 ? `${diffH} saat önce` : pub.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })

  return (
    <div style={{
      flexShrink: 0, width: '240px', scrollSnapAlign: 'start',
      background: 'oklch(100% 0 0)', borderRadius: '10px',
      border: '1px solid var(--color-border)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Fotoğraf */}
      <div style={{
        width: '100%', height: '135px', flexShrink: 0,
        backgroundImage: `url(${img})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        backgroundColor: 'var(--color-surface-2)',
      }} />

      {/* İçerik */}
      <div style={{ padding: '0.85rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: accent,
        }}>
          {label}
        </span>
        <p style={{
          fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)',
          lineHeight: 1.35, flex: 1,
          display: '-webkit-box', WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {item.title}
        </p>
        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', marginTop: 'auto' }}>
          {time}
        </span>
      </div>
    </div>
  )
}
