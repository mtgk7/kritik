import { supabaseFetch } from '@/lib/supabase/public'
import { createClient } from '@/lib/supabase/server'
import { Match, News } from '@/lib/types'
import { meta } from '@/lib/metadata'
import NewsSidebar from '@/components/NewsSidebar'
import AdSlot from '@/components/AdSlot'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Maçlar', 'Yaklaşan maçların xG, form ve güven skoru analizleri.')

const LEAGUE_ORDER = [
  'Süper Lig',
  'Dünya Kupası 2026',
  'Şampiyonlar Ligi',
  'Premier Lig',
  'La Liga',
  'Bundesliga',
  'Serie A',
  'Ligue 1',
  'Avrupa Ligi',
  'Genel',
]

export default async function HomePage() {
  const [matches, latestNews] = await Promise.all([
    supabaseFetch<Match>('matches?select=*&order=match_time.asc'),
    supabaseFetch<News>('news?select=*&is_published=eq.true&order=published_at.desc&limit=8'),
  ])

  // Premium üyelik kontrolü
  let isPremium = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('is_premium,premium_until')
        .eq('id', user.id)
        .single()
      isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
    }
  } catch {}

  // Durum sırala: canlı → yakında → bitti
  const sorted = [...matches].sort((a, b) => {
    const order = { canlı: 0, yakında: 1, bitti: 2 }
    return (order[a.status] ?? 1) - (order[b.status] ?? 1)
  })

  // Turnuvaya göre grupla
  const byLeague: Record<string, Match[]> = {}
  for (const m of sorted) {
    const key = m.league_name ?? 'Genel'
    if (!byLeague[key]) byLeague[key] = []
    byLeague[key].push(m)
  }
  const leagues = LEAGUE_ORDER.filter(l => byLeague[l]?.length > 0)
    .concat(Object.keys(byLeague).filter(l => !LEAGUE_ORDER.includes(l)))

  return (
    <main style={{ padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '4rem' }}>

      {/* İki sütunlu layout */}
      <div className={latestNews.length > 0 ? 'home-grid' : undefined}>

        {/* Sol: Maçlar */}
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.03em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)',
              lineHeight: 1, marginBottom: '0.4rem',
            }}>
              Maçlar
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Algoritma analizi tamamlanan yaklaşan maçlar
            </p>
          </div>

          {matches.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {leagues.map((league, leagueIdx) => (
                <section key={league}>
                  {/* Turnuva başlığı */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    marginBottom: '0', paddingBottom: '0.6rem',
                    borderBottom: '2px solid var(--color-border)',
                  }}>
                    <h2 style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700,
                      fontSize: '0.88rem', letterSpacing: '0.09em',
                      textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
                      flex: 1,
                    }}>
                      {league}
                    </h2>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                      {byLeague[league].length} maç
                    </span>
                  </div>

                  {/* Maç listesi */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {byLeague[league].map((match, i, arr) => (
                      <MatchRow key={match.id} match={match} isLast={i === arr.length - 1} unlocked={isPremium || match.is_free_preview} />
                    ))}
                  </div>
                </section>
              ))}

              {/* Maç listesi altı yatay reklam */}
              <AdSlot
                slot={process.env.NEXT_PUBLIC_AD_SLOT_FEED ?? ''}
                format="horizontal"
                style={{ minHeight: '90px', background: 'var(--color-surface-2)', borderRadius: '8px' }}
              />
            </div>
          )}
        </div>

        {/* Sağ: Haberler + Reklam (sidebar) */}
        {latestNews.length > 0 && (
          <div className="home-sidebar" style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <NewsSidebar news={latestNews} />
            {/* Sidebar reklam — 300x250 veya responsive */}
            <AdSlot
              slot={process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR ?? ''}
              format="rectangle"
              style={{ minHeight: '250px', background: 'var(--color-surface-2)', borderRadius: '8px' }}
            />
          </div>
        )}
      </div>
    </main>
  )
}

function MatchRow({ match, isLast, unlocked }: { match: Match; isLast: boolean; unlocked: boolean }) {
  const conf = match.confidence_score ?? 0
  const confPct = Math.round(conf * 100)
  const isLive     = match.status === 'canlı'
  const isFinished = match.status === 'bitti'
  const hasScore   = isFinished && match.home_score != null && match.away_score != null

  const confColor =
    conf >= 0.7  ? 'var(--color-success)'  :
    conf >= 0.55 ? 'var(--color-warning)'  :
    'var(--color-text-tertiary)'

  const matchDate = new Date(match.match_time)
  const today     = new Date()
  const isToday   = matchDate.toDateString() === today.toDateString()
  const dateLabel = isToday
    ? `Bugün ${matchDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
    : matchDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <a href={`/maclar/${match.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.25rem',
        padding: '1.1rem 0',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        alignItems: 'start', cursor: 'pointer',
      }}>
        <div>
          {/* Takımlar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            {isLive && <span className="badge-live">Canlı</span>}
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', letterSpacing: '0.02em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
            }}>
              {match.home_team}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>vs</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', letterSpacing: '0.02em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
            }}>
              {match.away_team}
            </span>
            {!isFinished && match.prediction && (
              unlocked ? (
                <span className="badge-prediction" style={{ fontSize: '0.7rem' }}>
                  {match.prediction}{match.prediction_confidence ? ` %${match.prediction_confidence}` : ''}
                </span>
              ) : (
                <span className="badge-prediction" style={{ fontSize: '0.7rem', filter: 'blur(4px)', userSelect: 'none' }}>
                  {match.prediction} %{match.prediction_confidence || 60}
                </span>
              )
            )}
            {!isFinished && match.is_free_preview && (
              <span style={{
                fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--color-success)', background: 'var(--color-success-bg)',
                borderRadius: '4px', padding: '0.1rem 0.4rem',
              }}>
                Ücretsiz
              </span>
            )}
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {!isLive && (
              <span style={{ fontSize: '0.75rem', color: isFinished ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', fontWeight: 500 }}>
                {dateLabel}
              </span>
            )}
            {!isFinished && unlocked && match.home_xg != null && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                xG {match.home_xg.toFixed(2)} / {match.away_xg?.toFixed(2)}
              </span>
            )}
            {!isFinished && unlocked && match.missing_players?.length > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-accent-text)', fontWeight: 600 }}>
                {match.missing_players.length} eksik
              </span>
            )}
            {!isFinished && !unlocked && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>
                AI tahmin · xG · kadro — <span style={{ color: 'var(--color-premium)', fontWeight: 600 }}>Premium</span>
              </span>
            )}
          </div>
        </div>

        {/* Sağ: skor veya güven */}
        {hasScore ? (
          <div style={{ textAlign: 'right', minWidth: '60px', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: 'var(--color-text-primary)' }}>
              {match.home_score}–{match.away_score}
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.1rem' }}>
              Sonuç
            </div>
          </div>
        ) : conf > 0 && !isFinished && !unlocked ? (
          <div style={{ textAlign: 'right', minWidth: '60px', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: 'var(--color-border-strong)', filter: 'blur(6px)', userSelect: 'none' }}>
              {confPct}
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-premium)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.1rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
              <svg width="8" height="10" viewBox="0 0 9 11" fill="none"><rect x="0.5" y="4.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2.5 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              Premium
            </div>
          </div>
        ) : conf > 0 && !isFinished ? (
          <div style={{ textAlign: 'right', minWidth: '60px', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: confColor }}>
              {confPct}
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.1rem' }}>
              Güven
            </div>
            <div className="confidence-bar" style={{ marginTop: '0.35rem' }}>
              <div className="confidence-bar-fill" style={{ width: `${confPct}%`, background: confColor }} />
            </div>
          </div>
        ) : null}
      </div>
    </a>
  )
}

function EmptyState() {
  return (
    <div style={{ padding: '4rem 0', borderTop: '1px solid var(--color-border)' }}>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem',
        textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-tertiary)',
        display: 'block', marginBottom: '0.5rem',
      }}>
        Maç Yok
      </span>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', maxWidth: '36ch' }}>
        Algoritma henüz maç analizi üretmedi.
      </p>
    </div>
  )
}
