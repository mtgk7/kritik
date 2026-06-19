'use client'

import { useState, useMemo } from 'react'
import { Match } from '@/lib/types'
import { translateTeam } from '@/lib/team-names'

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

type Props = { matches: Match[]; isPremium: boolean; favTeams?: string[] }

export default function MatchListClient({ matches, isPremium, favTeams = [] }: Props) {
  const [search, setSearch]     = useState('')
  const [league, setLeague]     = useState('Tümü')
  const [confIdx, setConfIdx]   = useState(0)
  const [favOnly, setFavOnly]   = useState(false)

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
      if (q && !m.home_team.toLowerCase().includes(q) && !m.away_team.toLowerCase().includes(q)
             && !translateTeam(m.home_team).toLowerCase().includes(q) && !translateTeam(m.away_team).toLowerCase().includes(q)) return false
      if (favOnly && favTeams.length > 0 && !favTeams.includes(m.home_team) && !favTeams.includes(m.away_team)) return false
      return true
    })
  }, [matches, league, confIdx, search, favOnly, favTeams])

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
            aria-label="Takım ara"
            style={{
              width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.1rem',
              border: '1.5px solid var(--color-border)', borderRadius: '7px',
              fontSize: '0.82rem',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
              background: 'var(--color-base)',
              outline: 'none',
            }}
          />
        </div>

        {/* Güven filtresi */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--color-surface-2)', borderRadius: '8px', padding: '0.2rem' }}>
          {CONF_FILTERS.map((f, i) => (
            <button key={f.label} onClick={() => setConfIdx(i)} aria-pressed={confIdx === i} style={{
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

        {/* Favori takımlar filtresi */}
        {favTeams.length > 0 && (
          <button onClick={() => setFavOnly(v => !v)} aria-pressed={favOnly} style={{
            padding: '0.3rem 0.7rem', borderRadius: '6px', border: 'none',
            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            background: favOnly ? 'var(--color-accent)' : 'var(--color-surface-2)',
            color: favOnly ? 'oklch(97% 0.005 255)' : 'var(--color-text-tertiary)',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}>
            <span>♥</span> Favori Takımlarım
          </button>
        )}

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
                transition: 'all 0.15s',
              }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sonuç sayısı */}
      {(search || league !== 'Tümü' || confIdx > 0 || favOnly) && sorted.length > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
          {sorted.length} maç bulundu
        </p>
      )}

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
                    isFavTeam={favTeams.includes(match.home_team) || favTeams.includes(match.away_team)}
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

function FormChip({ score }: { score: number }) {
  const isGood = score >= 2.0
  const isOk   = score >= 1.2
  const color  = isGood ? 'oklch(55% 0.18 145)' : isOk ? 'oklch(65% 0.18 75)' : 'oklch(55% 0.18 25)'
  return (
    <span style={{
      fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.38rem',
      borderRadius: '4px', lineHeight: 1, flexShrink: 0,
      background: color + '22', color, border: `1px solid ${color}55`,
    }}>
      {score.toFixed(1)}
    </span>
  )
}

function MatchRow({ match, isLast, unlocked, isFavTeam }: { match: Match; isLast: boolean; unlocked: boolean; isFavTeam: boolean }) {
  const conf     = match.confidence_score ?? 0
  const confPct  = Math.round(conf * 100)
  const isLive   = match.status === 'canlı'
  const isFinished = match.status === 'bitti'
  const hasScore = isFinished && match.home_score != null && match.away_score != null

  const confColor =
    conf >= 0.7  ? 'var(--color-success)'  :
    conf >= 0.55 ? 'var(--color-warning)'  :
    'var(--color-text-tertiary)'

  const TZ = 'Europe/Istanbul'
  const matchDate = new Date(match.match_time)
  const todayStr  = new Date().toLocaleDateString('tr-TR', { timeZone: TZ, day: 'numeric', month: 'numeric', year: 'numeric' })
  const matchStr  = matchDate.toLocaleDateString('tr-TR', { timeZone: TZ, day: 'numeric', month: 'numeric', year: 'numeric' })
  const isToday   = todayStr === matchStr
  const dateLabel = isToday
    ? `Bugün ${matchDate.toLocaleTimeString('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}`
    : matchDate.toLocaleDateString('tr-TR', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

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
            {isFavTeam && <span style={{ fontSize: '0.65rem', color: 'var(--color-accent)', lineHeight: 1 }}>♥</span>}
            {isLive && <span className="badge-live">Canlı</span>}
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', letterSpacing: '0.02em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
            }}>
              {translateTeam(match.home_team)}
            </span>
            {!isFinished && unlocked && match.home_form_score != null && (
              <FormChip score={match.home_form_score} />
            )}
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>vs</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', letterSpacing: '0.02em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
            }}>
              {translateTeam(match.away_team)}
            </span>
            {!isFinished && unlocked && match.away_form_score != null && (
              <FormChip score={match.away_form_score} />
            )}
            {!isFinished && match.prediction && (
              match.prediction === '__locked__' ? (
                <span aria-hidden="true" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.04em',
                  borderRadius: '4px', padding: '0.2rem 0.5rem',
                  background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)',
                }}>
                  <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden="true">
                    <rect x="0.5" y="4.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M2.5 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  Premium
                </span>
              ) : (
                <span className="badge-prediction" style={{ fontSize: '0.7rem' }}>
                  {match.prediction}{match.prediction_confidence ? ` %${match.prediction_confidence}` : ''}
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

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
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
            {/* Piyasa oranları — herkese açık */}
            {!isFinished && match.market_odds && (match.market_odds.ms1 ?? match.market_odds.ms2) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{match.market_odds.ms1?.toFixed(2)}</span>
                <span>·</span>
                <span>{match.market_odds.x?.toFixed(2)}</span>
                <span>·</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{match.market_odds.ms2?.toFixed(2)}</span>
              </span>
            )}
            {/* Alt/Üst 2.5 zımni olasılık */}
            {!isFinished && match.market_odds?.over25 && (() => {
              const pct = Math.round((1 / match.market_odds!.over25!) * 100)
              const col = pct >= 60 ? 'oklch(55% 0.18 145)' : pct >= 50 ? 'oklch(65% 0.18 75)' : 'var(--color-text-tertiary)'
              return (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '0.12rem 0.38rem',
                  borderRadius: '4px', background: col + '18', color: col,
                  border: `1px solid ${col}44`,
                }}>
                  Üst 2.5 %{pct}
                </span>
              )
            })()}
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
