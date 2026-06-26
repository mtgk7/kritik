import { supabaseFetch, CACHE } from '@/lib/supabase/public'
import { Match } from '@/lib/types'
import { meta } from '@/lib/metadata'
import KarliTahminlerClient from '@/components/KarliTahminlerClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta(
  'Kârlı Tahminler',
  'Algoritmanın yüksek güven verdiği geçmiş tahminler ve kademe bazlı isabet oranları.',
)

function isPredCorrect(m: Match): boolean | null {
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

export default async function KarliTahminlerPage() {
  const matches = await supabaseFetch<Match>(
    'matches?select=id,home_team,away_team,match_time,league_name,confidence_score,prediction,prediction_confidence,home_score,away_score,prediction_correct&status=eq.bitti&confidence_score=gte.0.55&prediction=not.is.null&home_score=not.is.null&order=confidence_score.desc&limit=200',
    CACHE.MATCHES,
  )

  const withResult = matches.map(m => ({ ...m, _correct: isPredCorrect(m) }))

  return (
    <main style={{ maxWidth: '860px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.03em',
          textTransform: 'uppercase', color: 'var(--color-text-primary)',
          lineHeight: 1, marginBottom: '0.4rem',
        }}>
          Kârlı Tahminler
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Algoritmanın ≥%55 güven verdiği geçmiş tahminler ve gerçek sonuçları
        </p>
      </div>

      {withResult.length === 0 ? (
        <div style={{ padding: '4rem 0', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-tertiary)' }}>
            Henüz yeterli veri yok.
          </p>
        </div>
      ) : (
        <KarliTahminlerClient matches={withResult} />
      )}
    </main>
  )
}
