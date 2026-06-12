'use client'

import { useState } from 'react'

type Props = {
  matchId: string
  homeTeam: string
  awayTeam: string
  isPremium: boolean
  initialAnalysis: string | null
}

export default function OzelAnalizClient({ matchId, homeTeam, awayTeam, isPremium, initialAnalysis }: Props) {
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>(initialAnalysis ? 'done' : 'idle')
  const [analysis, setAnalysis] = useState<string | null>(initialAnalysis)
  const [errMsg, setErrMsg]   = useState('')

  async function requestAnalysis() {
    setStatus('loading')
    setErrMsg('')
    try {
      const res  = await fetch('/api/ozel-analiz', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ matchId }),
      })
      const data = await res.json()
      if (!res.ok) { setErrMsg(data.error ?? 'Hata oluştu.'); setStatus('error'); return }
      setAnalysis(data.analysis)
      setStatus('done')
    } catch {
      setErrMsg('Bağlantı hatası. Tekrar deneyin.')
      setStatus('error')
    }
  }

  return (
    <section style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem',
        letterSpacing: '0.09em', textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)', marginBottom: '1rem',
      }}>
        Derin AI Analizi
      </h2>

      {!isPremium ? (
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--color-premium-bg)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⭐</span>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-premium)', marginBottom: '0.2rem' }}>
              Premium özelliği
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {homeTeam} — {awayTeam} için Claude AI'nin derin bahis analizini görmek için premium üyelik gerekli.
            </p>
            <a href="/odeme" style={{
              display: 'inline-block', marginTop: '0.65rem',
              fontSize: '0.78rem', fontWeight: 700, color: 'oklch(97% 0.005 255)',
              background: 'var(--color-accent)', textDecoration: 'none',
              padding: '0.4rem 1rem', borderRadius: '6px',
            }}>
              Premium Ol →
            </a>
          </div>
        </div>
      ) : status === 'done' && analysis ? (
        <div style={{
          padding: '1.5rem',
          background: 'var(--color-surface-2)',
          borderRadius: '12px',
          borderLeft: '3px solid oklch(52% 0.18 240)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'oklch(52% 0.18 240)' }}>
              Claude AI Derin Analiz
            </span>
          </div>
          {analysis.split(/\n{2,}/).filter(p => p.trim()).map((para, i) => (
            <p key={i} style={{
              fontSize: i === 0 ? '0.92rem' : '0.86rem',
              fontWeight: i === 0 ? 500 : 400,
              color: i === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              lineHeight: 1.7, marginBottom: i < 2 ? '0.85rem' : 0,
            }}
              dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '1.5rem',
          background: 'var(--color-surface-2)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Bu maç için Claude AI'nin kapsamlı bahis analizini al — güç dengesi, oran değeri, risk faktörleri ve net öneri.
          </p>
          {errMsg && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-accent)', marginBottom: '0.75rem' }}>{errMsg}</p>
          )}
          <button
            onClick={requestAnalysis}
            disabled={status === 'loading'}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '8px',
              background: status === 'loading' ? 'var(--color-border)' : 'oklch(52% 0.18 240)',
              color: 'oklch(97% 0.005 255)', border: 'none',
              fontSize: '0.85rem', fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)', letterSpacing: '0.02em',
              transition: 'background 0.15s', opacity: status === 'loading' ? 0.7 : 1,
            }}
          >
            {status === 'loading' ? 'Analiz Üretiliyor...' : 'Derin Analiz Al →'}
          </button>
          {status === 'loading' && (
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
              Claude AI analiz üretiyor, yaklaşık 15-20 saniye...
            </p>
          )}
        </div>
      )}
    </section>
  )
}
