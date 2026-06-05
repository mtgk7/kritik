import { supabaseFetch } from '@/lib/supabase/public'
import { News } from '@/lib/types'
import { meta } from '@/lib/metadata'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Haberler', 'Günün ve haftanın öne çıkan maç haberleri ve analizleri.')

const FALLBACK: Record<string, string> = {
  gunun_haberi:    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80',
  haftanin_haberi: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=900&q=80',
  genel:           'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=900&q=80',
}

const SPORT_ORDER = ['Futbol', 'Basketbol', 'Diğer Sporlar']

const TOPIC_COLOR: Record<string, string> = {
  'Dünya Kupası':     'var(--color-accent)',
  'Süper Lig':        'oklch(62% 0.20 145)',
  'Premier Lig':      'oklch(60% 0.20 260)',
  'La Liga':          'oklch(64% 0.22 30)',
  'Bundesliga':       'oklch(70% 0.18 60)',
  'Serie A':          'oklch(60% 0.20 15)',
  'Şampiyonlar Ligi': 'oklch(66% 0.16 280)',
  'Transfer':         'var(--color-premium)',
  'NBA':              'oklch(64% 0.22 30)',
  'EuroLeague':       'oklch(60% 0.20 260)',
  'BSL':              'oklch(62% 0.20 145)',
  'Genel':            'oklch(72% 0.02 255)',
}

function timeAgo(dateStr: string): string {
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000)
  if (diffH < 1) return 'Az önce'
  if (diffH < 24) return `${diffH} saat önce`
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function img(item: News) {
  return item.image_url ?? FALLBACK[item.category] ?? FALLBACK.genel
}

export default async function HaberlerPage() {
  const allNews = await supabaseFetch<News>('news?select=*&is_published=eq.true&order=published_at.desc')

  const hero    = allNews.slice(0, 5)
  const rest    = allNews.slice(5)

  // Spor → konu grupları (kalan haberler)
  const bySport: Record<string, Record<string, News[]>> = {}
  for (const item of rest) {
    const s = item.sport ?? 'Futbol'
    const t = item.topic ?? 'Genel'
    if (!bySport[s]) bySport[s] = {}
    if (!bySport[s][t]) bySport[s][t] = []
    bySport[s][t].push(item)
  }
  const sports = SPORT_ORDER.filter(s => bySport[s] && Object.keys(bySport[s]).length > 0)

  return (
    <main style={{ width: '100%', maxWidth: 'var(--page-max)', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* Başlık */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '0.03em',
          textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1,
        }}>
          Haberler
        </h1>
      </div>

      {allNews.length === 0 ? (
        <p style={{ color: 'var(--color-text-tertiary)', paddingTop: '2rem' }}>Henüz haber yok.</p>
      ) : (
        <>
          {/* ── Öne Çıkanlar: 1 büyük + 4 küçük ─────────────────────── */}
          {hero.length > 0 && (
            <div className="news-hero">
              <OverlayCard item={hero[0]} big />
              {hero.length > 1 && (
                <div className="news-hero-side">
                  {hero.slice(1, 5).map(item => (
                    <OverlayCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Kategori bölümleri ──────────────────────────────────── */}
          {sports.map(sport => {
            const topics = Object.keys(bySport[sport])
            return (
              <div key={sport} style={{ marginBottom: '1rem' }}>
                {topics.map(topic => (
                  <TopicBlock
                    key={topic}
                    title={topic}
                    sport={sport}
                    items={bySport[sport][topic]}
                    accent={TOPIC_COLOR[topic] ?? 'var(--color-text-tertiary)'}
                  />
                ))}
              </div>
            )
          })}
        </>
      )}
    </main>
  )
}

/* ── Görsel-üstü kart (hero) ─────────────────────────────────────── */
function OverlayCard({ item, big }: { item: News; big?: boolean }) {
  const accent = TOPIC_COLOR[item.topic] ?? 'var(--color-accent)'
  return (
    <a href={`/haberler/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        position: 'relative',
        height: '100%',
        minHeight: big ? '420px' : '160px',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundImage: `url(${img(item)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'var(--color-border)',
      }}>
        {/* Karartma */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, oklch(12% 0.02 255 / 0.9) 0%, oklch(12% 0.02 255 / 0.2) 55%, transparent 100%)',
        }} />
        {/* İçerik */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: big ? '1.5rem' : '0.85rem' }}>
          <span style={{
            display: 'inline-block',
            fontSize: big ? '0.65rem' : '0.55rem', fontWeight: 800,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'oklch(98% 0.005 255)', background: accent,
            borderRadius: '4px', padding: '0.2rem 0.5rem', marginBottom: '0.5rem',
          }}>
            {item.topic ?? item.tag ?? 'Haber'}
          </span>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: big ? 'clamp(1.25rem, 3vw, 1.9rem)' : '0.92rem',
            letterSpacing: '0.01em', lineHeight: 1.2,
            color: 'oklch(98% 0.005 255)',
            textTransform: big ? 'uppercase' : 'none',
            display: '-webkit-box', WebkitLineClamp: big ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.title}
          </h3>
          {big && item.summary && (
            <p style={{
              fontSize: '0.85rem', color: 'oklch(85% 0.01 255)', marginTop: '0.5rem', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.summary}
            </p>
          )}
          <span style={{ display: 'block', fontSize: big ? '0.72rem' : '0.62rem', color: 'oklch(75% 0.01 255)', marginTop: '0.4rem' }}>
            {item.tag ? `${item.tag} · ` : ''}{timeAgo(item.published_at)}
          </span>
        </div>
      </div>
    </a>
  )
}

/* ── Konu bloğu: başlık + kart ızgarası ──────────────────────────── */
function TopicBlock({ title, sport, items, accent }: { title: string; sport: string; items: News[]; accent: string }) {
  if (items.length === 0) return null
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      {/* Başlık şeridi */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <div style={{ width: '4px', height: '20px', borderRadius: '2px', background: accent, flexShrink: 0 }} />
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem',
          letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-primary)',
        }}>
          {title}
        </h2>
        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {sport}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>{items.length} haber</span>
      </div>

      {/* Kart ızgarası */}
      <div className="news-card-grid">
        {items.slice(0, 8).map(item => (
          <GridCard key={item.id} item={item} accent={accent} />
        ))}
      </div>
    </section>
  )
}

/* ── Üstte görsel, altta metin kartı ─────────────────────────────── */
function GridCard({ item, accent }: { item: News; accent: string }) {
  return (
    <a href={`/haberler/${item.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{
        borderRadius: '10px', overflow: 'hidden',
        border: '1px solid var(--color-border)',
        background: 'var(--color-base)',
        height: '100%', display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.15s',
      }}>
        <div style={{
          width: '100%', aspectRatio: '16/10',
          backgroundImage: `url(${img(item)})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: 'var(--color-surface-2)',
        }} />
        <div style={{ padding: '0.85rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{
            fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: accent,
          }}>
            {item.topic ?? item.tag ?? 'Haber'}
          </span>
          <p style={{
            fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)',
            lineHeight: 1.35, flex: 1,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.title}
          </p>
          <span style={{ fontSize: '0.66rem', color: 'var(--color-text-tertiary)', marginTop: 'auto' }}>
            {item.tag ? `${item.tag} · ` : ''}{timeAgo(item.published_at)}
          </span>
        </div>
      </div>
    </a>
  )
}
