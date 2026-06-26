'use client'

import { useMemo, useState } from 'react'
import { Match } from '@/lib/types'
import { translateTeam } from '@/lib/team-names'

function labelPrediction(p: string, homeTeam: string, awayTeam: string): string {
  const l = p.toLowerCase().trim()
  if (l === 'ms1') return `${translateTeam(homeTeam)} Kazanır`
  if (l === 'ms2') return `${translateTeam(awayTeam)} Kazanır`
  if (l === 'x' || l === 'beraberlik') return 'Beraberlik'
  return p
}

const LEAGUE_ORDER = [
  'Süper Lig', 'Dünya Kupası 2026', 'Şampiyonlar Ligi',
  'Premier Lig', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
  'Avrupa Ligi', 'Genel',
]

type Props = { matches: Match[] }

export default function ResultsListClient({ matches }: Props) {
  const [league, setLeague] = useState('Tümü')
  const [filter, setFilter] = useState<'tümü' | 'doğru' | 'yanlış'>('tümü')

  const leagues = useMemo(() => {
    const set = new Set(
      matches
        .filter(m => m.prediction_correct !== null)
        .map(m => m.league_name ?? 'Genel'),
    )
    return ['Tümü', ...LEAGUE_ORDER.filter(l => set.has(l)),
      ...[...set].filter(l => !LEAGUE_ORDER.includes(l))]
  }, [matches])

  const decided = useMemo(
    () => matches.filter(m => m.prediction && m.prediction_correct !== null),
    [matches],
  )
  const correct = decided.filter(m => m.prediction_correct === true).length
  const wrong   = decided.filter(m => m.prediction_correct === false).length
  const rate    = decided.length > 0 ? Math.round((correct / decided.length) * 100) : null

  const filtered = useMemo(() => {
    return matches.filter(m => {
      if (m.prediction_correct === null) return false  // sonucu belli olmayanları gizle
      if (league !== 'Tümü' && (m.league_name ?? 'Genel') !== league) return false
      if (filter === 'doğru'  && m.prediction_correct !== true)  return false
      if (filter === 'yanlış' && m.prediction_correct !== false) return false
      return true
    })
  }, [matches, league, filter])

  // Tarihe göre grupla (en yeni önce)
  const byDate = useMemo(() => {
    const map: Record<string, Match[]> = {}
    for (const m of filtered) {
      const d = new Date(m.match_time).toLocaleDateString('tr-TR', {
        timeZone: 'UTC',
        day: 'numeric', month: 'long', year: 'numeric',
      })
      if (!map[d]) map[d] = []
      map[d].push(m)
    }
    return map
  }, [filtered])

  const dateKeys = Object.keys(byDate).sort((a, b) => {
    const da = new Date(byDate[a][0].match_time)
    const db = new Date(byDate[b][0].match_time)
    return db.getTime() - da.getTime()
  })

  return (
    <div>
      {/* Son form şeridi */}
      {decided.length > 0 && (() => {
        const last = decided.slice(0, 7)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-display)' }}>
              Son Form
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {last.map((m, i) => (
                <div key={i} style={{
                  width: '24px', height: '24px', borderRadius: '5px', flexShrink: 0,
                  background: m.prediction_correct ? 'var(--color-success)' : 'var(--color-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 800, color: 'oklch(97% 0.005 255)',
                }}>
                  {m.prediction_correct ? '✓' : '✗'}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* İstatistik başlığı */}
      {decided.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '1px',
          background: 'var(--color-border)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '2rem',
        }}>
          <StatCell label="Analiz Edilen" value={String(decided.length)} />
          <StatCell label="Doğru"  value={String(correct)} color="var(--color-success)" />
          <StatCell label="Yanlış" value={String(wrong)}   color="var(--color-accent)" />
          {rate !== null && (
            <StatCell
              label="Başarı Oranı"
              value={`%${rate}`}
              color={rate >= 60 ? 'var(--color-success)' : rate >= 45 ? 'var(--color-warning)' : 'var(--color-accent)'}
            />
          )}
        </div>
      )}

      {/* Filtreler */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1.75rem', alignItems: 'center' }}>
        {/* Sonuç filtresi */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--color-surface-2)', borderRadius: '8px', padding: '0.2rem' }}>
          {(['tümü', 'doğru', 'yanlış'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} style={{
              padding: '0.3rem 0.7rem', borderRadius: '6px', border: 'none',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              background: filter === f ? 'oklch(100% 0 0)' : 'transparent',
              color: filter === f
                ? (f === 'doğru' ? 'var(--color-success)' : f === 'yanlış' ? 'var(--color-accent)' : 'var(--color-accent)')
                : 'var(--color-text-tertiary)',
              boxShadow: filter === f ? '0 1px 3px oklch(0% 0 0 / 0.08)' : 'none',
              textTransform: 'capitalize',
            }}>
              {f === 'tümü' ? 'Tümü' : f === 'doğru' ? '✓ Doğru' : '✗ Yanlış'}
            </button>
          ))}
        </div>

        {/* Lig filtresi */}
        {leagues.length > 2 && (
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {leagues.map(l => (
              <button key={l} onClick={() => setLeague(l)} aria-pressed={league === l} style={{
                padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none',
                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                background: league === l ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: league === l ? 'oklch(97% 0.005 255)' : 'var(--color-text-tertiary)',
              }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-tertiary)', paddingTop: '2rem' }}>
          Filtrelerle eşleşen maç bulunamadı.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {dateKeys.map(date => (
            <section key={date}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                paddingBottom: '0.6rem', marginBottom: '0',
                borderBottom: '2px solid var(--color-border)',
              }}>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: '0.88rem', letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--color-text-tertiary)', flex: 1,
                }}>
                  {date}
                </h2>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                  {byDate[date].length} maç
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {byDate[date].map((m, i, arr) => (
                  <ResultRow key={m.id} match={m} isLast={i === arr.length - 1} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultRow({ match: m, isLast }: { match: Match; isLast: boolean }) {
  const hasScore   = m.home_score != null && m.away_score != null
  const isCorrect  = m.prediction_correct === true
  const isWrong    = m.prediction_correct === false
  const isPending  = m.prediction_correct === null

  const conf    = m.confidence_score ?? 0
  const confPct = Math.round(conf * 100)

  return (
    <a href={`/maclar/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '1rem',
        padding: '1rem 0',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        alignItems: 'center',
        cursor: 'pointer',
      }}>
        {/* Sol: takımlar + tahmin */}
        <div>
          {/* Takım adları */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(0.95rem, 2.2vw, 1.15rem)', letterSpacing: '0.02em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
            }}>
              {translateTeam(m.home_team)}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>vs</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(0.95rem, 2.2vw, 1.15rem)', letterSpacing: '0.02em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
            }}>
              {translateTeam(m.away_team)}
            </span>
          </div>

          {/* Tahmin + güven + lig */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {m.prediction && (
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                letterSpacing: '0.03em',
                padding: '0.15rem 0.5rem', borderRadius: '4px',
                background: isCorrect
                  ? 'var(--color-success-bg)'
                  : isWrong
                  ? 'var(--color-accent-subtle)'
                  : 'var(--color-surface-2)',
                color: isCorrect
                  ? 'var(--color-success)'
                  : isWrong
                  ? 'var(--color-accent)'
                  : 'var(--color-text-secondary)',
                border: `1px solid ${isCorrect ? 'var(--color-success)' : isWrong ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}>
                {labelPrediction(m.prediction, m.home_team, m.away_team)}
                {m.prediction_confidence ? ` %${m.prediction_confidence}` : ''}
              </span>
            )}
            {confPct > 0 && (
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                güven %{confPct}
              </span>
            )}
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)' }}>
              {m.league_name ?? 'Genel'}
            </span>
          </div>
        </div>

        {/* Sağ: skor + sonuç rozeti */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {hasScore && (
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1.6rem', lineHeight: 1,
              color: 'var(--color-text-primary)',
              marginBottom: '0.3rem',
            }}>
              {m.home_score}–{m.away_score}
            </div>
          )}
          {m.prediction && (
            <div style={{
              fontSize: '0.6rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: isCorrect
                ? 'var(--color-success)'
                : isWrong
                ? 'var(--color-accent)'
                : 'var(--color-text-tertiary)',
            }}>
              {isCorrect ? '✓ Doğru' : isWrong ? '✗ Yanlış' : isPending ? '— Bekleniyor' : ''}
            </div>
          )}
        </div>
      </div>
    </a>
  )
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--color-base)', padding: '1.1rem 1.25rem' }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.35rem' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: '1.6rem', lineHeight: 1,
        color: color ?? 'var(--color-text-primary)',
        letterSpacing: '-0.01em',
      }}>
        {value}
      </div>
    </div>
  )
}
