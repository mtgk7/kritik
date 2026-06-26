import { supabaseFetch, CACHE } from '@/lib/supabase/public'
import { createClient } from '@/lib/supabase/server'
import { Match, News } from '@/lib/types'
import { meta } from '@/lib/metadata'
import NewsSidebar from '@/components/NewsSidebar'
import AdSlot from '@/components/AdSlot'
import MatchListClient from '@/components/MatchListClient'
import { translateTeam } from '@/lib/team-names'
import { LEAGUES } from '@/lib/leagues'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Maçlar', 'Yaklaşan maçların xG, form ve güven skoru analizleri.')

export default async function HomePage() {
  const now = new Date().toISOString()
  const [matches, latestNews, recentFinished] = await Promise.all([
    supabaseFetch<Match>(`matches?select=*&or=(status.eq.canlı,match_time.gte.${now})&order=match_time.asc`, CACHE.MATCHES),
    supabaseFetch<News>('news?select=*&is_published=eq.true&order=published_at.desc&limit=8', CACHE.NEWS),
    supabaseFetch<Pick<Match, 'id' | 'home_team' | 'away_team' | 'prediction' | 'home_score' | 'away_score' | 'prediction_correct' | 'league_name'>>(
      'matches?select=id,home_team,away_team,prediction,home_score,away_score,prediction_correct,league_name&status=eq.bitti&prediction=not.is.null&home_score=not.is.null&order=match_time.desc&limit=50',
      CACHE.MATCHES
    ),
  ])

  // Algoritma isabet hesabı
  type FinishedMatch = Pick<Match, 'id' | 'home_team' | 'away_team' | 'prediction' | 'home_score' | 'away_score' | 'prediction_correct' | 'league_name'>
  function isPredCorrect(m: FinishedMatch): boolean | null {
    if (m.prediction_correct !== null && m.prediction_correct !== undefined) return m.prediction_correct
    if (!m.prediction || m.home_score == null || m.away_score == null) return null
    const p = m.prediction.toLowerCase()
    const h = m.home_score, a = m.away_score
    if (p === 'ms1') return h > a
    if (p === 'ms2') return a > h
    if (p === 'x') return h === a
    if (p.includes('2.5 üst')) return h + a > 2
    if (p.includes('2.5 alt')) return h + a <= 2
    if (p.includes('kg var')) return h > 0 && a > 0
    if (p.includes('kg yok')) return h === 0 || a === 0
    return null
  }
  const evaluated = recentFinished
    .map(m => ({ ...m, _correct: isPredCorrect(m) }))
    .filter(m => m._correct !== null)
  const algoTotal   = evaluated.length
  const algoCorrect = evaluated.filter(m => m._correct).length
  const recentResults = evaluated.slice(0, 5)

  let isPremium = false
  let favTeams: string[] = []
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('is_premium,premium_until,notif_teams')
        .eq('id', user.id)
        .single()
      isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
      favTeams  = profile?.notif_teams ?? []
    }
  } catch {}

  // Premium olmayan kullanıcılar için tahmin verisini sunucu tarafında maskele
  const visibleMatches = isPremium
    ? matches
    : matches.map(m =>
        m.is_free_preview
          ? m
          : { ...m, prediction: m.prediction ? '__locked__' : null, prediction_confidence: null },
      )

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kritik',
    url: SITE,
    description: 'Yapay zeka destekli futbol maç tahminleri. Süper Lig, Premier Lig, Şampiyonlar Ligi ve daha fazlası için xG, form ve güven skoru analizleri.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <main style={{ padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <div className={latestNews.length > 0 ? 'home-grid' : undefined}>

        {/* Sol: Maçlar */}
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.03em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)',
              lineHeight: 1, marginBottom: '0.5rem',
            }}>
              Maçlar
            </h1>
            <AlgoritmaBant total={algoTotal} correct={algoCorrect} />
          </div>

          {matches.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <MatchListClient matches={visibleMatches} isPremium={isPremium} favTeams={favTeams} />
              <SonSonuclar results={recentResults} />
              <div style={{ marginTop: '2.5rem' }}>
                <AdSlot
                  slot={process.env.NEXT_PUBLIC_AD_SLOT_FEED ?? ''}
                  format="fluid"
                  layoutKey="-fb+5w+4e-db+86"
                />
              </div>
            </>
          )}
        </div>

        {/* Sağ: Haberler + Reklam */}
        {latestNews.length > 0 && (
          <div className="home-sidebar" style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <NewsSidebar news={latestNews} />
            <AdSlot
              slot={process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR ?? ''}
              format="autorelaxed"
            />
          </div>
        )}
      </div>

      {/* SEO footer — lig linkleri */}
      <nav aria-label="Lig tahminleri" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
          Lig Tahminleri
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.6rem' }}>
          {LEAGUES.map(l => (
            <a key={l.slug} href={`/lig/${l.slug}`} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 600 }}>
              {l.name} Tahminleri
            </a>
          ))}
          <a href="/tahminler/bugun" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 600 }}>Bugünkü Tahminler</a>
          <a href="/tahminler/yarin" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 600 }}>Yarınki Tahminler</a>
        </div>
      </nav>
    </main>
    </>
  )
}

type FinishedResult = {
  id: string
  home_team: string
  away_team: string
  prediction: string | null
  home_score: number | null
  away_score: number | null
  _correct: boolean | null
  league_name: string
}

function AlgoritmaBant({ total, correct }: { total: number; correct: number }) {
  if (total < 5) return (
    <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
      Algoritma analizi tamamlanan yaklaşan maçlar
    </p>
  )
  const pct = Math.round((correct / total) * 100)
  const color = pct >= 60 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-accent)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
        Algoritma tahmini
      </span>
      <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--color-text-tertiary)', flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color, letterSpacing: '0.02em' }}>
        %{pct} isabetli
      </span>
      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
        son {total} maç
      </span>
      <a href="/istatistikler" style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none', marginLeft: '0.1rem' }}>
        → Detaylar
      </a>
    </div>
  )
}

function SonSonuclar({ results }: { results: FinishedResult[] }) {
  if (results.length === 0) return null
  return (
    <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.09em',
          textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-display)',
        }}>
          Son Tahminler
        </span>
        <a href="/istatistikler" style={{ fontSize: '0.72rem', color: 'var(--color-accent)', textDecoration: 'none' }}>
          Tümü →
        </a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {results.map((r, i) => (
          <a key={r.id} href={`/maclar/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.5rem 1fr auto auto',
              gap: '0.6rem',
              padding: '0.6rem 0',
              alignItems: 'center',
              borderBottom: i < results.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem',
                color: r._correct ? 'var(--color-success)' : 'var(--color-accent)',
                lineHeight: 1,
              }}>
                {r._correct ? '✓' : '✗'}
              </span>
              <span style={{
                fontSize: '0.8rem', color: 'var(--color-text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {translateTeam(r.home_team)} – {translateTeam(r.away_team)}
              </span>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem',
                color: 'var(--color-text-primary)', whiteSpace: 'nowrap',
              }}>
                {r.home_score}–{r.away_score}
              </span>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-tertiary)',
                whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {r.prediction}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
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
