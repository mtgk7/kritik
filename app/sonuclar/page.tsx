import { supabaseFetch, CACHE } from '@/lib/supabase/public'
import { Match } from '@/lib/types'
import { meta } from '@/lib/metadata'
import ResultsListClient from '@/components/ResultsListClient'

export const dynamic  = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Sonuçlar', 'Biten maçlar ve tahminlerimizin sonuçları.')

export default async function SonuclarPage() {
  const now = new Date().toISOString()
  const matches = await supabaseFetch<Match>(
    `matches?select=*&match_time=lt.${now}&status=neq.canlı&order=match_time.desc&limit=200`,
    CACHE.MATCHES,
  )

  const withPrediction = matches.filter(m => m.prediction)

  return (
    <main style={{ padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '4rem', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.03em',
          textTransform: 'uppercase', color: 'var(--color-text-primary)',
          lineHeight: 1, marginBottom: '0.4rem',
        }}>
          Sonuçlar
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          {withPrediction.length > 0
            ? `${withPrediction.length} maç için algoritma tahmini ve gerçekleşen sonuç`
            : 'Henüz biten analiz edilmiş maç yok.'}
        </p>
      </div>

      {matches.length === 0 ? (
        <div style={{ padding: '4rem 0', borderTop: '1px solid var(--color-border)' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem',
            textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-tertiary)',
            display: 'block', marginBottom: '0.5rem',
          }}>
            Maç Yok
          </span>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', maxWidth: '36ch' }}>
            Henüz biten maç kaydı bulunmuyor.
          </p>
        </div>
      ) : (
        <ResultsListClient matches={matches} />
      )}
    </main>
  )
}
