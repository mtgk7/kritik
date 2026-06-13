'use client'

import { useState } from 'react'
import { AiKuponMatch } from '@/lib/types'
import { translateTeam } from '@/lib/team-names'

type Result = {
  matches: AiKuponMatch[]
  summary: string
  totalOdds: number
  criteria: { minConfidence: number; league: string; count: number }
}

const CONF_OPTIONS = [
  { value: '0.55', label: '%55+', desc: 'İyi güven' },
  { value: '0.65', label: '%65+', desc: 'Yüksek güven' },
  { value: '0.70', label: '%70+', desc: 'Güçlü sinyal' },
]

const LEAGUE_OPTIONS = [
  { value: 'tümü',          label: 'Tümü' },
  { value: 'Süper Lig',     label: 'Süper Lig' },
  { value: 'Dünya Kupası',  label: 'Dünya Kupası 2026' },
  { value: 'Premier League',label: 'Premier Lig' },
  { value: 'Bundesliga',    label: 'Bundesliga' },
]

const COUNT_OPTIONS = [2, 3, 4, 5]

const PRED_LABEL: Record<string, string> = {
  ms1: 'MS1', ms2: 'MS2', x: 'Beraberlik',
  '2.5 üst': '2.5 Üst', '2.5 alt': '2.5 Alt',
  'kg var': 'KG Var', 'kg yok': 'KG Yok',
}

function predLabel(p: string) {
  return PRED_LABEL[p.toLowerCase()] ?? p
}

function getOdd(m: AiKuponMatch): number | null {
  const pred = (m.prediction ?? '').toLowerCase()
  const mo = m.market_odds
  if (!mo) return null
  if (pred === 'ms1') return mo.ms1 ?? null
  if (pred === 'ms2') return mo.ms2 ?? null
  if (pred === 'x')   return mo.x ?? null
  if (pred.includes('üst')) return mo.over25 ?? null
  if (pred.includes('alt')) return mo.under25 ?? null
  return null
}

export default function AiKuponClient() {
  const [conf, setConf]       = useState('0.55')
  const [league, setLeague]   = useState('tümü')
  const [count, setCount]     = useState(3)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<Result | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function build() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ai-kupon-oneri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minConfidence: parseFloat(conf), league, count }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Bir hata oluştu.'); return }
      setResult(data)
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Kriter Seçici */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '14px',
        border: '1px solid var(--color-border)',
        padding: '1.75rem',
        marginBottom: '2rem',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem' }}>
          Kriterler
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Güven Eşiği */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.6rem' }}>
              Minimum Güven Skoru
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CONF_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setConf(opt.value)} style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                  border: conf === opt.value ? '2px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                  background: conf === opt.value ? 'var(--color-accent-subtle)' : 'var(--color-base)',
                  color: conf === opt.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontWeight: conf === opt.value ? 700 : 500,
                  fontSize: '0.88rem',
                  transition: 'all 0.15s',
                }}>
                  {opt.label}
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 400, marginTop: '0.1rem' }}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Lig */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.6rem' }}>
              Lig
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {LEAGUE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setLeague(opt.value)} style={{
                  padding: '0.45rem 0.9rem', borderRadius: '8px', cursor: 'pointer',
                  border: league === opt.value ? '2px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                  background: league === opt.value ? 'var(--color-accent-subtle)' : 'var(--color-base)',
                  color: league === opt.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontWeight: league === opt.value ? 700 : 500,
                  fontSize: '0.82rem',
                  transition: 'all 0.15s',
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Maç Sayısı */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.6rem' }}>
              Önerideki Maç Sayısı
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {COUNT_OPTIONS.map(n => (
                <button key={n} onClick={() => setCount(n)} style={{
                  width: '44px', height: '44px', borderRadius: '8px', cursor: 'pointer',
                  border: count === n ? '2px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                  background: count === n ? 'var(--color-accent-subtle)' : 'var(--color-base)',
                  color: count === n ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontWeight: count === n ? 700 : 500,
                  fontSize: '1rem',
                  transition: 'all 0.15s',
                }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={build}
          disabled={loading}
          style={{
            marginTop: '1.75rem',
            width: '100%',
            padding: '0.85rem',
            borderRadius: '10px',
            border: 'none',
            background: loading ? 'var(--color-border)' : 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
            color: 'oklch(97% 0.005 255)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            cursor: loading ? 'default' : 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? '⏳ Analiz yapılıyor...' : '🤖 Öneri Oluştur'}
        </button>
      </div>

      {/* Hata */}
      {error && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: '10px', background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Sonuç */}
      {result && (
        <div>
          {/* Kupon başlığı */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.2rem' }}>
                AI Öneri — {result.criteria.count} maç · {result.criteria.league}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: 'var(--color-success)', letterSpacing: '-0.02em' }}>
                  {result.totalOdds.toFixed(2)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Toplam Oran
                </span>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', display: 'flex', gap: '0.75rem' }}>
              <span>Min güven: %{Math.round(result.criteria.minConfidence * 100)}</span>
            </div>
          </div>

          {/* Maç kartları */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: '1.5rem' }}>
            {result.matches.map((m, i) => {
              const confPct   = Math.round((m.confidence_score ?? 0) * 100)
              const confColor = confPct >= 70 ? 'var(--color-success)' : confPct >= 55 ? 'var(--color-warning)' : 'var(--color-text-tertiary)'
              const mo        = m.market_odds
              const pred      = (m.prediction ?? '').toLowerCase()
              const isLast    = i === result.matches.length - 1

              const oddsRow: { label: string; val?: number; active: boolean }[] = [
                { label: '1', val: mo?.ms1, active: pred === 'ms1' },
                { label: '0', val: mo?.x,   active: pred === 'x' },
                { label: '2', val: mo?.ms2, active: pred === 'ms2' },
                { label: 'Alt', val: mo?.under25, active: pred.includes('alt') },
                { label: 'Üst', val: mo?.over25,  active: pred.includes('üst') },
              ]
              const hasOdds = oddsRow.some(o => o.val)

              return (
                <div key={m.id} style={{
                  borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                  background: 'var(--color-base)',
                }}>
                  <a href={`/maclar/${m.id}`} style={{
                    display: 'block', textDecoration: 'none', color: 'inherit',
                    padding: '1rem 1.25rem 0.6rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.45rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {translateTeam(m.home_team)} <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 500, fontSize: '0.7em' }}>vs</span> {translateTeam(m.away_team)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                          {m.league_name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-accent)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          {predLabel(m.prediction)}
                        </div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: confColor }}>
                          %{confPct} güven
                        </div>
                      </div>
                    </div>

                    {m.reasoning && (
                      <p style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 0.5rem', borderLeft: '2px solid var(--color-border-strong)', paddingLeft: '0.6rem' }}>
                        {m.reasoning}
                      </p>
                    )}
                  </a>

                  {/* Oran satırı */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 1.25rem 0.85rem', flexWrap: 'wrap' }}>
                    {hasOdds ? oddsRow.map(o => o.val ? (
                      <span key={o.label} style={{
                        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                        padding: '0.3rem 0.6rem', borderRadius: '6px', minWidth: '42px',
                        background: o.active ? 'var(--color-accent)' : 'var(--color-surface-2)',
                        border: `1px solid ${o.active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      }}>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.06em', color: o.active ? 'oklch(97% 0.005 255)' : 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{o.label}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: o.active ? 'oklch(97% 0.005 255)' : 'var(--color-text-primary)' }}>{o.val.toFixed(2)}</span>
                      </span>
                    ) : null) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>Oran bilgisi yok</span>
                    )}
                    <a
                      href="https://www.iddaa.com/program/futbol"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginLeft: 'auto',
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.3rem 0.7rem', borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.7rem', fontWeight: 600,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      iddaa.com ↗
                    </a>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Özet */}
          {result.summary && (
            <div style={{
              padding: '1.1rem 1.25rem',
              background: 'var(--color-surface-2)',
              borderRadius: '10px',
              borderLeft: '3px solid var(--color-success)',
              marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                Algoritma Özeti
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: 0 }}>
                {result.summary}
              </p>
            </div>
          )}

          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: 1.55 }}>
            Bu öneriler yalnızca algoritmik analize dayanır. Bahis oynamadan önce kendi değerlendirmenizi yapın.
          </p>
        </div>
      )}
    </div>
  )
}
