'use client'

import { useState } from 'react'
import type { Match } from '@/lib/types'

type KuponItem = {
  matchId: string
  home: string
  away: string
  pred: string
  conf: number
  odds: number
}

function getImpliedOdds(conf: number): number {
  // Güvenden zımni oran hesapla (basit: 100/conf * 1.05 vig)
  return parseFloat(((100 / conf) * 1.05).toFixed(2))
}

function getMarketOdds(m: Match, pred: string): number {
  const mo = m.market_odds
  if (!mo) return getImpliedOdds(m.prediction_confidence ?? 55)
  const map: Record<string, number | undefined> = {
    'MS1': mo.ms1, 'X': mo.x, 'MS2': mo.ms2,
    '2.5 Üst': mo.over25, '2.5 Alt': mo.under25,
  }
  return map[pred] ?? getImpliedOdds(m.prediction_confidence ?? 55)
}

function predLabel(pred: string): string {
  const map: Record<string, string> = {
    MS1: 'Ev Kazanır', X: 'Beraberlik', MS2: 'Deplasman Kazanır',
    '1X': 'Ev Kaybetmez', 'X2': 'Dep Kaybetmez',
    '2.5 Üst': '2.5 Gol Üst', '2.5 Alt': '2.5 Gol Alt',
    'KG Var': 'KG Var', 'KG Yok': 'KG Yok',
  }
  return map[pred] ?? pred
}

const CONF_COLORS: Record<string, string> = {
  high:   'var(--color-success)',
  mid:    'var(--color-warning)',
  low:    'var(--color-text-tertiary)',
}

function confColor(conf: number) {
  return conf >= 70 ? CONF_COLORS.high : conf >= 55 ? CONF_COLORS.mid : CONF_COLORS.low
}

export default function KuponClient({ matches }: { matches: Match[] }) {
  const [kupon, setKupon] = useState<KuponItem[]>([])
  const [stake, setStake] = useState(100)

  const totalOdds   = kupon.reduce((acc, k) => acc * k.odds, 1)
  const potWin      = Math.round(stake * totalOdds)
  const avgConf     = kupon.length > 0
    ? Math.round(kupon.reduce((s, k) => s + k.conf, 0) / kupon.length)
    : 0
  // Kombine kazanma ihtimali = tüm güvenlerin çarpımı
  const combinedPct = kupon.length > 0
    ? Math.round(kupon.reduce((p, k) => p * (k.conf / 100), 1) * 100)
    : 0

  function addToKupon(m: Match) {
    if (kupon.find(k => k.matchId === m.id)) return
    const pred  = m.prediction ?? 'MS1'
    const conf  = m.prediction_confidence ?? 55
    const odds  = getMarketOdds(m, pred)
    setKupon(prev => [...prev, { matchId: m.id, home: m.home_team, away: m.away_team, pred, conf, odds }])
  }

  function removeFromKupon(matchId: string) {
    setKupon(prev => prev.filter(k => k.matchId !== matchId))
  }

  function changePred(matchId: string, pred: string, m: Match) {
    const conf = m.prediction_confidence ?? 55
    const odds = getMarketOdds(m, pred)
    setKupon(prev => prev.map(k => k.matchId === matchId ? { ...k, pred, conf, odds } : k))
  }

  const inKupon = (id: string) => kupon.some(k => k.matchId === id)

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
          Kupon Simülatörü
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          Maçları seç, kombineni oluştur, potansiyel kazancını gör.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Sol — Maç listesi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {matches.length === 0 && (
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>Bugün tahmin olan maç yok.</p>
          )}
          {matches.map(m => {
            const selected = inKupon(m.id)
            const conf     = m.prediction_confidence ?? 0
            const pred     = m.prediction ?? '—'
            const mt       = new Date(m.match_time)
            const timeStr  = mt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

            return (
              <div key={m.id} style={{
                padding: '1rem 1.25rem',
                border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: '10px',
                background: selected ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
                onClick={() => selected ? removeFromKupon(m.id) : addToKupon(m)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      {timeStr}  ·  {m.league_name}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                      {m.home_team} <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>vs</span> {m.away_team}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: confColor(conf) }}>
                      {pred} %{conf}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)' }}>
                      {selected ? '− Çıkar' : '+ Kupona Ekle'}
                    </span>
                  </div>
                </div>

                {/* Alternatifler */}
                {selected && m.alternatives && m.alternatives.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {[{ prediction: pred, confidence: conf }, ...m.alternatives].map((a, i) => {
                      const active = kupon.find(k => k.matchId === m.id)?.pred === a.prediction
                      return (
                        <button key={i}
                          onClick={() => changePred(m.id, a.prediction, m)}
                          style={{
                            padding: '0.25rem 0.65rem', borderRadius: '6px', border: 'none',
                            background: active ? 'var(--color-accent)' : 'var(--color-border)',
                            color: active ? 'oklch(97% 0.005 255)' : 'var(--color-text-secondary)',
                            fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                          }}>
                          {a.prediction} %{a.confidence}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Sağ — Kupon özeti */}
        <div style={{ position: 'sticky', top: '5rem' }}>
          <div style={{ border: '1.5px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Başlık */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Kuponym ({kupon.length})
              </span>
            </div>

            {kupon.length === 0 ? (
              <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.82rem' }}>
                Maçlara tıklayarak kupon oluştur
              </div>
            ) : (
              <>
                {/* Seçili maçlar */}
                <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {kupon.map(k => (
                    <div key={k.matchId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {k.home} vs {k.away}
                        </div>
                        <div>{predLabel(k.pred)} — <span style={{ color: 'var(--color-accent)' }}>{k.pred}</span></div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem', flexShrink: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{k.odds.toFixed(2)}</span>
                        <button onClick={() => removeFromKupon(k.matchId)} style={{
                          background: 'none', border: 'none', color: 'var(--color-text-tertiary)',
                          fontSize: '0.68rem', cursor: 'pointer', padding: 0,
                        }}>× çıkar</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Toplam oran + kazanç */}
                <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--color-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    <span>Toplam oran</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{totalOdds.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    <span>Kombinasyon şansı</span>
                    <span style={{ fontWeight: 700, color: confColor(combinedPct) }}>%{combinedPct}</span>
                  </div>

                  {/* Bahis tutarı */}
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                      Bahis Tutarı (₺)
                    </label>
                    <input
                      type="number"
                      min={10}
                      value={stake}
                      onChange={e => setStake(Number(e.target.value))}
                      style={{
                        width: '100%', padding: '0.5rem 0.75rem', borderRadius: '7px',
                        border: '1.5px solid var(--color-border)', background: 'var(--color-base)',
                        color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 600,
                        fontFamily: 'var(--font-body)', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Potansiyel kazanç */}
                  <div style={{
                    background: 'var(--color-accent-subtle)',
                    border: '1px solid oklch(54% 0.22 25 / 0.18)',
                    borderRadius: '8px', padding: '1rem',
                    display: 'flex', flexDirection: 'column', gap: '0.25rem',
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                      Potansiyel Kazanç
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', color: 'var(--color-text-primary)', letterSpacing: '0.02em' }}>
                      ₺{potWin.toLocaleString('tr-TR')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      ₺{stake} × {totalOdds.toFixed(2)} oran
                    </div>
                  </div>

                  <button
                    onClick={() => setKupon([])}
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '7px',
                      border: '1.5px solid var(--color-border)', background: 'transparent',
                      color: 'var(--color-text-secondary)', fontSize: '0.8rem',
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    }}>
                    Kuponu Temizle
                  </button>
                </div>
              </>
            )}
          </div>

          {kupon.length > 0 && (
            <p style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', marginTop: '0.75rem', lineHeight: 1.5 }}>
              Oranlar gösterge amaçlıdır. Gerçek bahis oranları için İddaa/Misli/Nesine'yi kontrol edin. Kritik bahis tavsiyesi vermez.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
