'use client'

import { useState, useMemo } from 'react'
import { Match } from '@/lib/types'
import { translateTeam } from '@/lib/team-names'

const TIERS = [
  { key: '80+',   min: 0.80, max: 1.01, label: '%80+',   color: 'var(--color-success)' },
  { key: '70-79', min: 0.70, max: 0.80, label: '%70–79', color: 'oklch(52% 0.16 145)' },
  { key: '60-69', min: 0.60, max: 0.70, label: '%60–69', color: 'var(--color-warning)' },
  { key: '55-59', min: 0.55, max: 0.60, label: '%55–59', color: 'oklch(60% 0.12 75)' },
] as const

type TierKey = typeof TIERS[number]['key']
type MatchWithCorrect = Match & { _correct: boolean | null }

export default function KarliTahminlerClient({ matches }: { matches: MatchWithCorrect[] }) {
  const [activeTier, setActiveTier] = useState<TierKey | null>(null)
  const [resultFilter, setResultFilter] = useState<'tümü' | 'doğru' | 'yanlış'>('tümü')

  const evaluated = useMemo(() => matches.filter(m => m._correct !== null), [matches])

  const tierStats = useMemo(() =>
    TIERS.map(t => {
      const sub = evaluated.filter(m => {
        const c = m.confidence_score ?? 0
        return c >= t.min && c < t.max
      })
      const correct = sub.filter(m => m._correct).length
      return {
        ...t,
        total: sub.length,
        correct,
        rate: sub.length > 0 ? Math.round((correct / sub.length) * 100) : 0,
      }
    }).filter(t => t.total > 0),
  [evaluated])

  const displayed = useMemo(() => {
    let list = evaluated
    if (activeTier) {
      const t = TIERS.find(t => t.key === activeTier)!
      list = list.filter(m => (m.confidence_score ?? 0) >= t.min && (m.confidence_score ?? 0) < t.max)
    }
    if (resultFilter === 'doğru')  list = list.filter(m => m._correct === true)
    if (resultFilter === 'yanlış') list = list.filter(m => m._correct === false)
    return list
  }, [evaluated, activeTier, resultFilter])

  const overallRate = evaluated.length > 0
    ? Math.round((evaluated.filter(m => m._correct).length / evaluated.length) * 100)
    : null

  return (
    <div>
      {/* Güven kademesi kartları — tıklanabilir filtre */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '1px',
        background: 'var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '1.75rem',
      }}>
        {tierStats.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTier(activeTier === t.key ? null : t.key)}
            style={{
              background: activeTier === t.key ? 'var(--color-surface-2)' : 'var(--color-base)',
              padding: '1.1rem 1.25rem',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              outline: activeTier === t.key ? `2px solid ${t.color}` : 'none',
              outlineOffset: '-2px',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
              Güven {t.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: t.color }}>
              %{t.rate}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>
              {t.correct}/{t.total} isabet
            </div>
          </button>
        ))}
        {overallRate !== null && (
          <button
            onClick={() => { setActiveTier(null); setResultFilter('tümü') }}
            style={{
              background: !activeTier ? 'var(--color-surface-2)' : 'var(--color-base)',
              padding: '1.1rem 1.25rem',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              outline: !activeTier ? '2px solid var(--color-border-strong)' : 'none',
              outlineOffset: '-2px',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
              Genel
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: overallRate >= 60 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              %{overallRate}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>
              {evaluated.filter(m => m._correct).length}/{evaluated.length} isabet
            </div>
          </button>
        )}
      </div>

      {/* Sonuç filtresi */}
      <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--color-surface-2)', borderRadius: '8px', padding: '0.2rem', marginBottom: '1.75rem', width: 'fit-content' }}>
        {(['tümü', 'doğru', 'yanlış'] as const).map(f => (
          <button key={f} onClick={() => setResultFilter(f)} aria-pressed={resultFilter === f} style={{
            padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none',
            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            background: resultFilter === f ? 'oklch(100% 0 0)' : 'transparent',
            color: resultFilter === f
              ? (f === 'doğru' ? 'var(--color-success)' : f === 'yanlış' ? 'var(--color-accent)' : 'var(--color-text-primary)')
              : 'var(--color-text-tertiary)',
            boxShadow: resultFilter === f ? '0 1px 3px oklch(0% 0 0 / 0.08)' : 'none',
            textTransform: 'capitalize',
          }}>
            {f === 'tümü' ? 'Tümü' : f === 'doğru' ? '✓ Doğru' : '✗ Yanlış'}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-tertiary)', paddingTop: '1rem' }}>
          Bu filtreyle eşleşen tahmin yok.
        </p>
      ) : (
        <>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
            {displayed.length} tahmin listeleniyor
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {displayed.map((m, i) => (
              <MatchItem key={m.id} match={m} isLast={i === displayed.length - 1} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MatchItem({ match: m, isLast }: { match: MatchWithCorrect; isLast: boolean }) {
  const conf = m.confidence_score ?? 0
  const confPct = Math.round(conf * 100)
  const confColor =
    conf >= 0.80 ? 'var(--color-success)' :
    conf >= 0.70 ? 'oklch(52% 0.16 145)' :
    conf >= 0.60 ? 'var(--color-warning)' :
    'oklch(60% 0.12 75)'

  return (
    <a href={`/maclar/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: '1rem',
        padding: '1rem 0',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        alignItems: 'center',
        cursor: 'pointer',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', letterSpacing: '0.02em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
            }}>
              {translateTeam(m.home_team)}
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--color-text-tertiary)' }}>vs</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', letterSpacing: '0.02em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
            }}>
              {translateTeam(m.away_team)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {m.prediction && (
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px',
                background: m._correct ? 'var(--color-success-bg)' : 'var(--color-accent-subtle)',
                color: m._correct ? 'var(--color-success)' : 'var(--color-accent)',
                border: `1px solid ${m._correct ? 'var(--color-success)' : 'var(--color-accent)'}55`,
              }}>
                {m.prediction}
              </span>
            )}
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)' }}>{m.league_name}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>
              {new Date(m.match_time).toLocaleDateString('tr-TR', { timeZone: 'UTC', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {/* Skor */}
        {m.home_score != null && (
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: 'var(--color-text-primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
            {m.home_score}–{m.away_score}
          </div>
        )}

        {/* Güven skoru */}
        <div style={{ textAlign: 'right', minWidth: '44px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: confColor }}>
            {confPct}
          </div>
          <div style={{ fontSize: '0.52rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginTop: '0.1rem' }}>
            Güven
          </div>
        </div>
      </div>
    </a>
  )
}
