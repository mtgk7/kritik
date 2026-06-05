'use client'

import { useState, useMemo } from 'react'
import { Match } from '@/lib/types'

const LEAGUE_ORDER = [
  'Süper Lig', 'Dünya Kupası 2026', 'Şampiyonlar Ligi',
  'Premier Lig', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
  'Avrupa Ligi', 'Genel',
]

const CONF_FILTERS = [
  { label: 'Tümü',  min: 0 },
  { label: '%55+',  min: 0.55 },
  { label: '%70+',  min: 0.70 },
]

type Props = { matches: Match[]; isPremium: boolean }

export default function MatchListClient({ matches, isPremium }: Props) {
  const [search, setSearch]   = useState('')
  const [league, setLeague]   = useState('Tümü')
  const [confIdx, setConfIdx] = useState(0)

  const leagues = useMemo(() => {
    const set = new Set(matches.map(m => m.league_name ?? 'Genel'))
    return ['Tümü', ...LEAGUE_ORDER.filter(l => set.has(l)),
      ...[...set].filter(l => !LEAGUE_ORDER.includes(l))]
  }, [matches])

  const filtered = useMemo(() => {
    const q     = search.trim().toLowerCase()
    const minC  = CONF_FILTERS[confIdx].min
    return matches.filter(m => {
      if (league !== 'Tümü' && (m.league_name ?? 'Genel') !== league) return false
      if (minC > 0 && (m.confidence_score ?? 0) < minC) return false
      if (q && !m.home_team.toLowerCase().includes(q) && !m.away_team.toLowerCase().includes(q)) return false
      return true
    })
  }, [matches, league, confIdx, search])

  // Status sırala: canlı → yakında → bitti
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const o = { canlı: 0, yakında: 1, bitti: 2 } as Record<string, number>
    return (o[a.status] ?? 1) - (o[b.status] ?? 1)
  }), [filtered])

  // Turnuvaya göre grupla
  const byLeague = useMemo(() => {
    const map: Record<string, Match[]> = {}
    for (const m of sorted) {
      const k = m.league_name ?? 'Genel'
      if (!map[k]) map[k] = []
      map[k].push(m)
    }
    return map
  }, [sorted])

  const leagueKeys = LEAGUE_ORDER.filter(l => byLeague[l]?.length > 0)
    .concat(Object.keys(byLeague).filter(l => !LEAGUE_ORDER.includes(l)))

  return (
    <div>
      {/* Arama + Filtreler */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1.75rem', alignItems: 'center' }}>
        {/* Arama */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '150px', maxWidth: '260px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Takım ara..."
            style={{
              width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.1rem',
              border: '1.5px solid var(--color-border)', borderRadius: '7px',
              fontSize: '0.82rem', color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)', background: 'oklch(100% 0 0)',
              outline: 'none',
            }}
          />
        </div>

        {/* Güven filtresi */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--color-surface-2)', borderRadius: '8px', padding: '0.2rem' }}>
          {CONF_FILTERS.map((f, i) => (
            <button key={f.label} onClick={() => setConfIdx(i)} style={{
              padding: '0.3rem 0.7rem', borderRadius: '6px', border: 'none',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              background: confIdx === i ? 'oklch(100% 0 0)' : 'transparent',
              color: confIdx === i ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              boxShadow: confIdx === i ? '0 1px 3px oklch(0% 0 0 / 0.08)' : 'none',
              transition: 'all 0.15s',
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Lig filtresi */}
        {leagues.length > 2 && (
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {leagues.map(l => (
              <button key={l} onClick={() => setLeague(l)} style={{
                padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none',
                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                background: league === l ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: league === l ? 'oklch(97% 0.005 255)' : 'var(--color-text-tertiary)',
                transition: 'all 0.15s',
              }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sonuç */}
      {sorted.length === 0 ? (
        <div style={{ padding: '3rem 0', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-tertiary)' }}>
            {search ? `"${search}" için maç bulunamadı.` : 'Filtrelerle eşleşen maç yok.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {leagueKeys.map(lg => (
            <section key={lg}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                marginBottom: '0', paddingBottom: '0.6rem',
                borderBottom: '2px solid var(--color-border)',
              }}>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: '0.88rem', letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--color-text-tertiary)', flex: 1,
                }}>
                  {lg}
                </h2>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                  {byLeague[lg].length} maç
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {byLeague[lg].map((match, i, arr) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    isLast={i === arr.length - 1}
                    unlocked={isPremium || match.is_free_preview}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function MatchRow({ match, isLast, unlocked }: { match: Match; isLast: boolean; unlocked: boolean }) {
  const conf     = match.confidence_score ?? 0
  const confPct  = Math.round(conf * 100)
  const isLive   = match.status === 'canlı'
  const isFinished = match.status === 'bitti'
  const hasScore = isFinished && match.home_score != null && match.away_score != null

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
