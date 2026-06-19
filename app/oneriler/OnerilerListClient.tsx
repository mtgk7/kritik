'use client'

import { useState, useMemo } from 'react'
import { Coupon } from '@/lib/types'
import { requestCouponPurchase } from '@/app/actions/admin'

const ALL_CATEGORIES = [
  { label: 'Tümü',       value: null },
  { label: 'Banko',      value: 'Banko' },
  { label: 'BTTS',       value: 'BTTS' },
  { label: 'Alt/Üst 2.5', value: 'Alt/Üst 2.5' },
  { label: 'Alt/Üst 1.5', value: 'Alt/Üst 1.5' },
  { label: 'Korner',     value: 'Korner' },
  { label: 'xG',         value: 'xG Canavarı' },
  { label: 'Sürpriz',    value: 'Premium Sürpriz' },
]

const typeLabels: Record<string, string> = {
  'Banko':            'Banko',
  'xG Canavarı':      'xG Canavarı',
  'Premium Sürpriz':  'Sürpriz',
  'BTTS':             'BTTS',
  'Alt/Üst 2.5':      'Alt/Üst 2.5',
  'Alt/Üst 1.5':      'Alt/Üst 1.5',
  'Korner':           'Korner',
}

const typeColors: Record<string, string> = {
  'Banko':            'var(--color-success)',
  'xG Canavarı':      'oklch(52% 0.18 240)',
  'Premium Sürpriz':  'var(--color-premium)',
  'BTTS':             'oklch(58% 0.2 300)',
  'Alt/Üst 2.5':      'oklch(60% 0.18 200)',
  'Alt/Üst 1.5':      'oklch(55% 0.15 185)',
  'Korner':           'oklch(62% 0.16 55)',
}

type Props = {
  free: Coupon[]
  premium: Coupon[]
  isPremium: boolean
  isLoggedIn: boolean
}

export default function OnerilerListClient({ free, premium, isPremium, isLoggedIn }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const allCoupons = useMemo(() => [...free, ...premium], [free, premium])
  const existingTypes = useMemo(() => new Set(allCoupons.map(c => c.coupon_type)), [allCoupons])

  const visibleCategories = ALL_CATEGORIES.filter(
    c => c.value === null || existingTypes.has(c.value as Coupon['coupon_type'])
  )

  const filteredFree = useMemo(() =>
    activeCategory ? free.filter(c => c.coupon_type === activeCategory) : free,
    [free, activeCategory]
  )
  const filteredPremium = useMemo(() =>
    activeCategory ? premium.filter(c => c.coupon_type === activeCategory) : premium,
    [premium, activeCategory]
  )

  return (
    <>
      {/* Kategori filtre tabları */}
      {visibleCategories.length > 2 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '0.25rem', background: 'var(--color-surface-2)', borderRadius: '10px', width: 'fit-content' }}>
          {visibleCategories.map(cat => {
            const isActive = activeCategory === cat.value
            const color = cat.value ? (typeColors[cat.value] ?? 'var(--color-accent)') : 'var(--color-accent)'
            return (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.value)}
                style={{
                  padding: '0.35rem 0.85rem', borderRadius: '7px', border: 'none',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  background: isActive ? color : 'transparent',
                  color: isActive ? 'oklch(97% 0.005 255)' : 'var(--color-text-tertiary)',
                  transition: 'all 0.15s',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Ücretsiz */}
      <section style={{ marginBottom: '3rem' }}>
        <SectionLabel>Ücretsiz</SectionLabel>
        {filteredFree.length === 0 ? (
          <EmptySection text="Bu kategoride ücretsiz öneri yok." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filteredFree.map((c, i) => (
              <CouponRow key={c.id} coupon={c} isLast={i === filteredFree.length - 1} />
            ))}
          </div>
        )}
      </section>

      {/* Premium */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <SectionLabel>Premium</SectionLabel>
          {!isPremium && <span className="badge-premium">⭐ Üye ol</span>}
        </div>

        {filteredPremium.length === 0 ? (
          <EmptySection text="Bu kategoride premium öneri henüz eklenmedi." />
        ) : isPremium ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filteredPremium.map((c, i) => (
              <CouponRow key={c.id} coupon={c} isLast={i === filteredPremium.length - 1} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredPremium.filter(c => c.price_try).map(c => (
              <div key={c.id} style={{
                padding: '1.25rem 1.5rem', background: 'var(--color-surface)',
                borderRadius: '12px', border: '1.5px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                    {c.coupon_type}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    {c.matches.length} maç {c.total_rate ? `· Oran ${c.total_rate.toFixed(2)}` : ''}
                  </div>
                </div>
                <form action={requestCouponPurchase} style={{ margin: 0 }}>
                  <input type="hidden" name="coupon_id" value={c.id} />
                  <input type="hidden" name="amount_try" value={c.price_try!} />
                  <button type="submit" style={{
                    padding: '0.55rem 1.1rem', background: 'var(--color-accent)',
                    color: 'oklch(97% 0.005 255)', border: 'none', borderRadius: '8px',
                    fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                    Satın Al · ₺{c.price_try}
                  </button>
                </form>
              </div>
            ))}

            {filteredPremium.some(c => !c.price_try) && (
              <div style={{
                padding: '2rem 1.5rem', background: 'var(--color-premium-bg)',
                borderRadius: '12px', border: '2px solid var(--color-border)', textAlign: 'center',
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <svg width="28" height="34" viewBox="0 0 28 34" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                    <rect x="1" y="13" width="26" height="20" rx="4" stroke="var(--color-premium)" strokeWidth="1.8"/>
                    <path d="M7 13V9a7 7 0 0 1 14 0v4" stroke="var(--color-premium)" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
                  {filteredPremium.filter(c => !c.price_try).length} Premium Öneri Daha Mevcut
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  Tüm premium önerilere erişmek için premium üyeliğe geç.
                </p>
                <a href={isLoggedIn ? '/odeme' : '/kayit'} style={{
                  display: 'inline-block', fontSize: '0.88rem', fontWeight: 700,
                  color: 'oklch(97% 0.005 255)',
                  background: 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
                  textDecoration: 'none', borderRadius: '8px', padding: '0.65rem 1.75rem',
                }}>
                  ⭐ {isLoggedIn ? 'Premium Al' : 'Kayıt Ol'}
                </a>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem',
    }}>
      {children}
    </div>
  )
}

function EmptySection({ text }: { text: string }) {
  return (
    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', padding: '1.5rem 0', borderTop: '1px solid var(--color-border)' }}>
      {text}
    </p>
  )
}

function CouponRow({ coupon, isLast }: { coupon: Coupon; isLast: boolean }) {
  const accentColor = typeColors[coupon.coupon_type] ?? 'var(--color-text-tertiary)'
  return (
    <a href={`/oneriler/${coupon.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.25rem',
        padding: '1.1rem 0',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '3px', height: '36px', borderRadius: '99px', background: accentColor, flexShrink: 0 }} />
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
              letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
            }}>
              {typeLabels[coupon.coupon_type] ?? coupon.coupon_type}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.15rem' }}>
              {coupon.matches.length} maç
            </div>
          </div>
        </div>

        <div />

        {coupon.total_rate != null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem',
              lineHeight: 1, color: accentColor, letterSpacing: '-0.01em',
            }}>
              {coupon.total_rate.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.15rem' }}>
              Oran
            </div>
          </div>
        )}
      </div>
    </a>
  )
}
