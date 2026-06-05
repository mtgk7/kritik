'use client'

import { useState } from 'react'

const PLANS = [
  { id: 'monthly',   label: 'Aylık',    price: '₺149',  note: '/ay' },
  { id: 'quarterly', label: '3 Aylık',  price: '₺379',  note: '/3 ay' },
  { id: 'annual',    label: 'Yıllık',   price: '₺1.199', note: '/yıl' },
]

export default function PremiumCheckout() {
  const [selected, setSelected] = useState('monthly')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleCheckout() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Hata oluştu.')
      window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen hata.')
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Plan seçimi */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {PLANS.map(p => (
          <button key={p.id} onClick={() => setSelected(p.id)} style={{
            flex: 1, minWidth: '90px',
            padding: '0.65rem 0.5rem', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            border: selected === p.id ? '2px solid var(--color-premium)' : '1.5px solid var(--color-border)',
            background: selected === p.id ? 'var(--color-premium-bg)' : 'var(--color-base)',
            transition: 'border-color 0.15s, background 0.15s',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '0.2rem' }}>
              {p.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: selected === p.id ? 'var(--color-premium)' : 'var(--color-text-primary)', lineHeight: 1 }}>
              {p.price}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '0.1rem' }}>
              {p.note}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)', marginBottom: '0.75rem' }}>{error}</p>
      )}

      <button onClick={handleCheckout} disabled={loading} style={{
        width: '100%', padding: '0.75rem',
        background: loading ? 'var(--color-border)' : 'var(--color-accent)',
        color: 'oklch(97% 0.005 255)',
        border: 'none', borderRadius: '8px',
        fontSize: '0.9rem', fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-body)',
        transition: 'background 0.15s',
        letterSpacing: '0.02em',
      }}>
        {loading ? 'Yönlendiriliyor...' : 'Premium Al →'}
      </button>

      <p style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: '0.65rem' }}>
        Stripe ile güvenli ödeme · İptal istediğin zaman
      </p>
    </div>
  )
}
