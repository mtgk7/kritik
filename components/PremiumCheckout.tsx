'use client'

import { useState } from 'react'

const PLANS = [
  { id: 'weekly',    label: 'Haftalık', price: '₺149',   original: null,     discount: null,  note: '/hafta' },
  { id: 'monthly',   label: 'Aylık',    price: '₺399',   original: null,     discount: null,  note: '/ay' },
  { id: 'quarterly', label: '3 Aylık',  price: '₺999',   original: '₺1.197', discount: '%17', note: '/3 ay' },
  { id: 'annual',    label: 'Yıllık',   price: '₺3.900', original: '₺4.788', discount: '%19', note: '/yıl' },
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
            padding: '0.7rem 0.5rem', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            border: selected === p.id ? '2px solid var(--color-premium)' : '1.5px solid var(--color-border)',
            background: selected === p.id ? 'var(--color-premium-bg)' : 'var(--color-base)',
            transition: 'border-color 0.15s, background 0.15s',
            position: 'relative',
          }}>
            {p.discount && (
              <div style={{
                position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
                fontSize: '0.55rem', fontWeight: 800, color: 'var(--color-success)',
                background: 'var(--color-success-bg)', borderRadius: '3px',
                padding: '0.1rem 0.35rem', whiteSpace: 'nowrap', letterSpacing: '0.04em',
              }}>
                {p.discount}
              </div>
            )}
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
              {p.label}
            </div>
            {p.original && (
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', textDecoration: 'line-through', lineHeight: 1 }}>
                {p.original}
              </div>
            )}
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.35rem', color: selected === p.id ? 'var(--color-premium)' : 'var(--color-text-primary)', lineHeight: 1, marginTop: '0.1rem' }}>
              {p.price}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--color-text-tertiary)', marginTop: '0.15rem' }}>
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
