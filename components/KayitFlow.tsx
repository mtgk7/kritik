'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { signUp } from '@/app/actions/auth'

const PLANS = [
  {
    id:       'free',
    label:    'Ücretsiz',
    price:    '₺0',
    period:   '/süresiz',
    original: null,
    discount: null,
    desc:     'Haftada 4 maç analizi, haberler, favori takım takibi',
    premium:  false,
  },
  {
    id:       'weekly',
    label:    'Haftalık',
    price:    '₺149',
    period:   '/hafta',
    original: null,
    discount: null,
    desc:     'Deneme için ideal — 7 gün tam erişim',
    premium:  true,
  },
  {
    id:       'monthly',
    label:    'Aylık',
    price:    '₺399',
    period:   '/ay',
    original: null,
    discount: null,
    desc:     'En popüler — sınırsız maç & öneri erişimi',
    premium:  true,
  },
  {
    id:       'quarterly',
    label:    '3 Aylık',
    price:    '₺999',
    period:   '/3 ay',
    original: '₺1.197',
    discount: '%17',
    desc:     '3 ayda bir ödeme, kesintisiz analiz',
    premium:  true,
  },
  {
    id:       'annual',
    label:    'Yıllık',
    price:    '₺3.900',
    period:   '/yıl',
    original: '₺4.788',
    discount: '%19',
    desc:     'En avantajlı — yılın tamamı premium',
    premium:  true,
  },
]

type Props = {
  refCode?: string
  error?: string
}

export default function KayitFlow({ refCode, error: initError }: Props) {
  const [step, setStep]         = useState<1 | 2>(1)
  const [selectedPlan, setPlan] = useState<string | null>(null)

  const plan = PLANS.find(p => p.id === selectedPlan)

  if (step === 1) {
    return (
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '0.4rem',
          }}>
            Planını Seç
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Ücretsiz başlayabilir ya da direkt premium geçebilirsin. İstediğin zaman değiştirebilirsin.
          </p>
        </div>

        {/* Ücretsiz plan */}
        <button
          onClick={() => { setPlan('free'); setStep(2) }}
          style={{
            width: '100%', marginBottom: '0.75rem',
            padding: '1rem 1.25rem', borderRadius: '10px', cursor: 'pointer',
            border: '1.5px solid var(--color-border)', background: 'var(--color-base)',
            textAlign: 'left', fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-text-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
              Ücretsiz Başla
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
              Haftada 4 maç analizi · haberler · favori takım takibi
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: 'var(--color-text-primary)' }}>₺0</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>/süresiz</div>
          </div>
        </button>

        {/* Ayraç */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-premium)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ⭐ Premium Planlar
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        </div>

        {/* Premium planlar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {PLANS.filter(p => p.premium).map(p => (
            <button
              key={p.id}
              onClick={() => { setPlan(p.id); setStep(2) }}
              style={{
                width: '100%', padding: '1rem 1.25rem', borderRadius: '10px', cursor: 'pointer',
                border: p.id === 'monthly' ? '2px solid var(--color-premium)' : '1.5px solid var(--color-border)',
                background: p.id === 'monthly' ? 'var(--color-premium-bg)' : 'var(--color-base)',
                textAlign: 'left', fontFamily: 'var(--font-body)', position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {p.id === 'monthly' && (
                <div style={{
                  position: 'absolute', top: '-9px', left: '1rem',
                  fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'oklch(20% 0.08 35)', background: 'oklch(82% 0.12 68)',
                  borderRadius: '4px', padding: '0.15rem 0.5rem',
                }}>
                  En Popüler
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: p.id === 'monthly' ? 'var(--color-premium)' : 'var(--color-text-primary)' }}>
                    {p.label}
                  </span>
                  {p.discount && (
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 800, color: 'var(--color-success)',
                      background: 'var(--color-success-bg)', borderRadius: '3px',
                      padding: '0.1rem 0.35rem',
                    }}>
                      {p.discount}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{p.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {p.original && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textDecoration: 'line-through', lineHeight: 1 }}>
                    {p.original}
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: p.id === 'monthly' ? 'var(--color-premium)' : 'var(--color-text-primary)' }}>
                  {p.price}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>{p.period}</div>
              </div>
            </button>
          ))}
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          Zaten hesabın var mı?{' '}
          <a href="/giris" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>Giriş Yap</a>
        </p>
      </div>
    )
  }

  /* ── Step 2: Hesap Formu ─────────────────────────────────────────────── */
  return (
    <div style={{ width: '100%', maxWidth: '380px' }}>

      {/* Geri + seçilen plan özeti */}
      <div style={{ marginBottom: '1.75rem' }}>
        <button
          onClick={() => setStep(1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '0.82rem', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1rem',
          }}
        >
          ← Planı Değiştir
        </button>

        {plan && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: '8px',
            background: plan.premium ? 'var(--color-premium-bg)' : 'var(--color-surface-2)',
            border: `1.5px solid ${plan.premium ? 'var(--color-premium)' : 'var(--color-border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: plan.premium ? 'var(--color-premium)' : 'var(--color-text-tertiary)' }}>
                {plan.premium ? '⭐ ' : ''}{plan.label} Plan
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: plan.premium ? 'var(--color-premium)' : 'var(--color-text-primary)' }}>
              {plan.price}<span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--color-text-tertiary)' }}>{plan.period}</span>
            </span>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '0.3rem',
        }}>
          Hesap Oluştur
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
          {plan?.premium ? 'Hesabını oluşturduktan sonra ödeme adımına geçeceksin.' : 'Ücretsiz hesabınla hemen başla.'}
        </p>
      </div>

      {initError && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)', fontWeight: 500 }}>
          {initError}
        </div>
      )}

      {refCode && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-success-bg)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 500 }}>
          🎁 Davet bağlantısıyla geldin — hoş geldin!
        </div>
      )}

      <form action={signUp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="hidden" name="plan" value={selectedPlan ?? 'free'} />
        {refCode && <input type="hidden" name="ref" value={refCode} />}

        <Field label="E-posta" name="email" type="email" />
        <Field label="Şifre" name="password" type="password" minLength={6} hint="En az 6 karakter" />
        {!refCode && (
          <Field label="Davet Kodu (opsiyonel)" name="ref" type="text" placeholder="XXXX1234" />
        )}

        <SubmitButton isPremium={plan?.premium ?? false} />
      </form>

      <p style={{ marginTop: '1.25rem', fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
        Kayıt olarak{' '}
        <a href="/kullanim-kosullari" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'underline' }}>Kullanım Koşulları</a>
        {' '}ve{' '}
        <a href="/gizlilik-politikasi" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'underline' }}>Gizlilik Politikası</a>
        &apos;nı kabul etmiş sayılırsın.
      </p>
    </div>
  )
}

function SubmitButton({ isPremium }: { isPremium: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
      style={{ marginTop: '0.5rem', opacity: pending ? 0.7 : 1, cursor: pending ? 'not-allowed' : 'pointer' }}
    >
      {pending ? 'Lütfen bekleyin...' : isPremium ? 'Hesap Oluştur ve Ödemeye Geç →' : 'Hesap Oluştur →'}
    </button>
  )
}

function Field({ label, name, type, minLength, hint, placeholder }: {
  label: string; name: string; type: string; minLength?: number; hint?: string; placeholder?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
        {label}
      </label>
      <input name={name} type={type} required={name !== 'ref'} minLength={minLength} placeholder={placeholder} className="form-input" />
      {hint && <p style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>{hint}</p>}
    </div>
  )
}
