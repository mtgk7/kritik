'use client'

import { useState } from 'react'
import type { Match } from '@/lib/types'

type Entry = Match & { _correct: boolean | null; odds: number; pl: number; cumPL: number }

export default function TakipClient({ timeline }: { timeline: Entry[] }) {
  const [stake, setStake] = useState(100)
  const [showAll, setShowAll]   = useState(false)

  const total   = timeline.length
  const correct = timeline.filter(m => m._correct).length
  const pct     = total > 0 ? Math.round(correct / total * 100) : 0
  const finalPL = total > 0 ? Math.round(timeline[timeline.length - 1].cumPL / 100 * stake) : 0
  const plColor = finalPL >= 0 ? 'var(--color-success)' : 'var(--color-accent)'

  // Son 10 maç formu
  const last10 = timeline.slice(-10)

  const displayed = showAll ? [...timeline].reverse() : [...timeline].reverse().slice(0, 15)

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
          Tahmin Takip
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          Kritik tahminlerini takip etseydin ne kazanırdın?
        </p>
      </div>

      {/* KPI kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Toplam Tahmin', value: total, unit: '' },
          { label: 'Doğru', value: correct, unit: '' },
          { label: 'İsabet Oranı', value: pct, unit: '%' },
        ].map(k => (
          <div key={k.label} style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--color-surface)' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.9rem', color: 'var(--color-text-primary)', lineHeight: 1 }}>{k.value}{k.unit}</div>
          </div>
        ))}
        {/* P&L kart */}
        <div style={{ padding: '1.25rem', border: `1px solid ${finalPL >= 0 ? 'oklch(54% 0.18 145 / 0.25)' : 'oklch(54% 0.22 25 / 0.25)'}`, borderRadius: '10px', background: finalPL >= 0 ? 'oklch(54% 0.18 145 / 0.06)' : 'oklch(54% 0.22 25 / 0.06)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>Hipotetik Kazanç</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.9rem', color: plColor, lineHeight: 1 }}>
            {finalPL >= 0 ? '+' : ''}{(finalPL).toLocaleString('tr-TR')}₺
          </div>
        </div>
      </div>

      {/* Bahis tutarı ayarı */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--color-surface)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Bahis tutarını değiştir:</span>
        {[50, 100, 200, 500].map(v => (
          <button key={v} onClick={() => setStake(v)} style={{
            padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-body)',
            background: stake === v ? 'var(--color-accent)' : 'var(--color-border)',
            color: stake === v ? 'oklch(97% 0.005 255)' : 'var(--color-text-secondary)',
          }}>₺{v}</button>
        ))}
        <input type="number" value={stake} onChange={e => setStake(Number(e.target.value))} min={10} style={{
          width: '80px', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1.5px solid var(--color-border)',
          background: 'var(--color-base)', color: 'var(--color-text-primary)', fontSize: '0.82rem', fontWeight: 600,
          fontFamily: 'var(--font-body)', outline: 'none',
        }} />
      </div>

      {/* Son form */}
      {last10.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-display)' }}>Son Form</span>
          {last10.map((m, i) => (
            <div key={i} title={`${m.home_team} vs ${m.away_team} — ${m.prediction}`} style={{
              width: '28px', height: '28px', borderRadius: '6px',
              background: m._correct ? 'var(--color-success)' : 'var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: 800, color: 'oklch(97% 0.005 255)',
            }}>{m._correct ? '✓' : '✗'}</div>
          ))}
        </div>
      )}

      {/* Tahmin listesi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {displayed.map((m, i) => {
          const scaled = Math.round(m.pl / 100 * stake)
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: '8px',
              background: m._correct ? 'oklch(54% 0.18 145 / 0.06)' : 'oklch(54% 0.22 25 / 0.04)',
              border: `1px solid ${m._correct ? 'oklch(54% 0.18 145 / 0.14)' : 'var(--color-border)'}`,
            }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '5px', flexShrink: 0,
                background: m._correct ? 'var(--color-success)' : 'var(--color-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 800, color: 'oklch(97% 0.005 255)' }}>
                {m._correct ? '✓' : '✗'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.home_team} vs {m.away_team}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                  {m.prediction} · {m.odds.toFixed(2)} oran · {new Date(m.match_time).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: scaled >= 0 ? 'var(--color-success)' : 'var(--color-accent)' }}>
                  {scaled >= 0 ? '+' : ''}{scaled.toLocaleString('tr-TR')}₺
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!showAll && timeline.length > 15 && (
        <button onClick={() => setShowAll(true)} style={{
          width: '100%', marginTop: '1rem', padding: '0.75rem', borderRadius: '8px',
          border: '1.5px solid var(--color-border)', background: 'transparent',
          color: 'var(--color-text-secondary)', fontSize: '0.82rem', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          Tümünü Göster ({timeline.length} tahmin)
        </button>
      )}

      <p style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', marginTop: '1.5rem', lineHeight: 1.6 }}>
        Bu sayfa tamamen bilgi amaçlıdır. Kritik gerçek bahis tavsiyesi vermez. Hipotetik kazanç, her tahmine eşit bahis girildiğinde oluşacak hipotetik sonuçtur.
      </p>
    </main>
  )
}
