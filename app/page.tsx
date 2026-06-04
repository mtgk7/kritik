import { supabaseFetch } from '@/lib/supabase/public'
import { Match, News } from '@/lib/types'
import { meta } from '@/lib/metadata'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Maçlar', 'Yaklaşan maçların xG, form ve güven skoru analizleri.')

export default async function HomePage() {
  const [matches, latestNews] = await Promise.all([
    supabaseFetch<Match>('matches?select=*&order=match_time.asc'),
    supabaseFetch<News>('news?select=*&is_published=eq.true&order=published_at.desc&limit=4'),
  ])

  return (
    <main style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '4rem' }}>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          color: 'var(--color-text-primary)',
          lineHeight: 1,
          marginBottom: '0.4rem',
        }}>
          Yaklaşan Maçlar
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Algoritma analizi tamamlanan maçlar
        </p>
      </div>

      {/* Haberler önizleme */}
      {latestNews.length > 0 && (
        <HomeNewsStrip news={latestNews} />
      )}

      {matches.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {matches.map((match, i) => (
            <MatchRow key={match.id} match={match} isLast={i === matches.length - 1} />
          ))}
        </div>
      )}
    </main>
  )
}

const FALLBACK_IMAGES: Record<string, string> = {
  gunun_haberi:    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80',
  haftanin_haberi: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400&q=80',
  genel:           'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=400&q=80',
}

const CATEGORY_COLOR: Record<string, string> = {
  gunun_haberi:    'var(--color-accent)',
  haftanin_haberi: 'var(--color-premium)',
  genel:           'oklch(52% 0.18 240)',
}

const CATEGORY_LABEL: Record<string, string> = {
  gunun_haberi:    'Bugün',
  haftanin_haberi: 'Bu Hafta',
  genel:           'Haber',
}

function HomeNewsStrip({ news }: { news: News[] }) {
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

      {/* Yatay kaydırma şeridi */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        overflowX: 'auto',
        paddingBottom: '0.75rem',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}>
        {news.map((item) => {
          const accent = CATEGORY_COLOR[item.category] ?? 'var(--color-text-tertiary)'
          const label  = item.tag ?? CATEGORY_LABEL[item.category] ?? ''
          const img    = item.image_url ?? FALLBACK_IMAGES[item.category] ?? FALLBACK_IMAGES.genel
          return (
            <div key={item.id} style={{
              flexShrink: 0,
              width: '220px',
              scrollSnapAlign: 'start',
              background: 'var(--color-surface-2)',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
            }}>
              {/* Fotoğraf */}
              <div style={{
                width: '100%', height: '120px',
                background: `url(${img}) center/cover no-repeat`,
                backgroundColor: 'var(--color-border)',
              }} />
              {/* İçerik */}
              <div style={{ padding: '0.75rem' }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: accent, display: 'block', marginBottom: '0.3rem',
                }}>
                  {label}
                </span>
                <p style={{
                  fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)',
                  lineHeight: 1.35,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {item.title}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MatchRow({ match, isLast }: { match: Match; isLast: boolean }) {
  const conf = match.confidence_score ?? 0
  const confPct = Math.round(conf * 100)

  const confColor =
    conf >= 0.7 ? 'var(--color-success)' :
    conf >= 0.55 ? 'var(--color-warning)' :
    'var(--color-text-tertiary)'

  const matchDate = new Date(match.match_time)
  const today = new Date()
  const isToday = matchDate.toDateString() === today.toDateString()
  const dateLabel = isToday
    ? `Bugün ${matchDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
    : matchDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <a href={`/maclar/${match.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '1.5rem',
      padding: '1.25rem 0',
      borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
      alignItems: 'start',
      cursor: 'pointer',
    }}>
      {/* Sol: Maç bilgisi */}
      <div>
        {/* Takımlar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: 'var(--color-text-primary)',
            lineHeight: 1.1,
          }}>
            {match.home_team}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>vs</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: 'var(--color-text-primary)',
            lineHeight: 1.1,
          }}>
            {match.away_team}
          </span>
          {match.prediction && (
            <span className="badge-prediction">
              {match.prediction}{match.prediction_confidence ? ` %${match.prediction_confidence}` : ''}
            </span>
          )}
          {(match.alternatives ?? []).slice(0, 2).map((alt, i) => (
            <span key={i} style={{
              fontSize: '0.7rem', fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '3px', padding: '0.15rem 0.4rem',
            }}>
              {alt.prediction} %{alt.confidence}
            </span>
          ))}
        </div>

        {/* Meta: tarih, xG */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {dateLabel}
          </span>
          {match.home_xg != null && (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
              xG {match.home_xg.toFixed(2)} / {match.away_xg?.toFixed(2)}
            </span>
          )}
          {match.home_form_score != null && (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
              Form {(match.home_form_score * 100).toFixed(0)} — {((match.away_form_score ?? 0) * 100).toFixed(0)}
            </span>
          )}
        </div>

        {/* Eksik oyuncular */}
        {match.missing_players?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-accent-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Eksik
            </span>
            {match.missing_players.map((p, i) => (
              <span key={i} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', background: 'var(--color-accent-subtle)', borderRadius: '4px', padding: '0.1rem 0.45rem' }}>
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sağ: Güven skoru */}
      {conf > 0 && (
        <div style={{ textAlign: 'right', minWidth: '72px', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '2rem',
            lineHeight: 1,
            color: confColor,
            letterSpacing: '-0.01em',
          }}>
            {confPct}
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.15rem' }}>
            Güven
          </div>
          <div className="confidence-bar" style={{ marginTop: '0.5rem' }}>
            <div className="confidence-bar-fill" style={{ width: `${confPct}%`, background: confColor }} />
          </div>
        </div>
      )}
    </div>
    </a>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: '4rem 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '0.5rem',
      borderTop: '1px solid var(--color-border)',
    }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '1.25rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: 'var(--color-text-tertiary)',
      }}>
        Maç Yok
      </span>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', maxWidth: '36ch' }}>
        Algoritma henüz maç analizi üretmedi. Kısa süre içinde güncellenecek.
      </p>
    </div>
  )
}
