'use client'

import { useState } from 'react'

const KONULAR = [
  'Genel Soru',
  'Teknik Destek',
  'Premium Üyelik',
  'Fatura / Ödeme',
  'Hesap İşlemleri',
  'Diğer',
]

export default function IletisimPage() {
  const [form, setForm] = useState({ ad: '', eposta: '', konu: '', mesaj: '' })
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/iletisim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setErrMsg(data.error ?? 'Bir hata oluştu.'); setState('error'); return }
      setState('success')
    } catch {
      setErrMsg('Bağlantı hatası. Lütfen tekrar deneyin.')
      setState('error')
    }
  }

  return (
    <main style={{ maxWidth: '560px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '3rem', paddingBottom: '5rem' }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '0.03em',
        textTransform: 'uppercase', color: 'var(--color-text-primary)',
        marginBottom: '0.4rem', lineHeight: 1,
      }}>
        Bize Ulaşın
      </h1>
      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
        Sorularınızı, teknik sorunlarınızı veya taleplerinizi aşağıdaki formu doldurarak iletebilirsiniz.
        En kısa sürede geri dönüş yapılır.
      </p>

      {state === 'success' ? (
        <div style={{
          background: 'oklch(25% 0.05 145 / 0.4)',
          border: '1.5px solid var(--color-success)',
          borderRadius: '12px', padding: '2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✓</div>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-success)', marginBottom: '0.5rem' }}>
            Mesajınız İletildi
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            En kısa sürede <strong>info@oleonolive.com</strong> adresinden dönüş yapılacaktır.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Ad Soyad */}
          <Field label="Ad Soyad">
            <input
              type="text" required value={form.ad}
              onChange={e => set('ad', e.target.value)}
              placeholder="Adınız Soyadınız"
              style={inputStyle}
            />
          </Field>

          {/* E-posta */}
          <Field label="E-posta">
            <input
              type="email" required value={form.eposta}
              onChange={e => set('eposta', e.target.value)}
              placeholder="eposta@ornek.com"
              style={inputStyle}
            />
          </Field>

          {/* Konu */}
          <Field label="Konu">
            <select
              required value={form.konu}
              onChange={e => set('konu', e.target.value)}
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">Konu seçin...</option>
              {KONULAR.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>

          {/* Mesaj */}
          <Field label="Mesaj">
            <textarea
              required value={form.mesaj}
              onChange={e => set('mesaj', e.target.value)}
              placeholder="Mesajınızı buraya yazın..."
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }}
            />
          </Field>

          {state === 'error' && (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-accent)', margin: 0 }}>
              ⚠ {errMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={state === 'loading'}
            style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'oklch(97% 0.005 255)',
              background: state === 'loading'
                ? 'var(--color-border-strong)'
                : 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
              border: 'none', borderRadius: '10px', padding: '0.85rem 2rem',
              cursor: state === 'loading' ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {state === 'loading' ? 'Gönderiliyor...' : 'Gönder →'}
          </button>
        </form>
      )}
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1.5px solid var(--color-border)',
  borderRadius: '8px',
  padding: '0.65rem 0.9rem',
  fontSize: '0.9rem',
  color: 'var(--color-text-primary)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}
