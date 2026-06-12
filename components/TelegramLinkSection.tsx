'use client'

import { useState } from 'react'

type Props = {
  chatId: number | null
  disconnectAction: () => Promise<void | never>
}

export default function TelegramLinkSection({ chatId, disconnectAction }: Props) {
  const [loading, setLoading] = useState(false)
  const [link, setLink]       = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function getLink() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/telegram/link', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Hata oluştu.'); return }
      setLink(data.link)
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  if (chatId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-success)', fontSize: '1rem' }}>✅</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-success)' }}>Telegram bağlı</span>
        </div>
        <form action={disconnectAction} style={{ margin: 0 }}>
          <button type="submit" style={{
            fontSize: '0.75rem', color: 'var(--color-text-tertiary)',
            background: 'none', border: '1px solid var(--color-border)',
            borderRadius: '6px', padding: '0.3rem 0.65rem',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            Bağlantıyı Kes
          </button>
        </form>
      </div>
    )
  }

  if (link) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
          Aşağıdaki butona tıkla → bot açılacak → <strong>BAŞLAT</strong> butonuna bas.
        </p>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.55rem 1.1rem', borderRadius: '8px',
            background: 'oklch(52% 0.18 240)', color: 'oklch(97% 0.005 255)',
            textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
            width: 'fit-content',
          }}
        >
          Telegram Bot'u Aç →
        </a>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
          Bağlandıktan sonra sayfayı yenile.
        </p>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-accent)', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>
          {error}
        </p>
      )}
      <button
        onClick={getLink}
        disabled={loading}
        style={{
          padding: '0.55rem 1.1rem', borderRadius: '8px',
          background: 'oklch(52% 0.18 240)', color: 'oklch(97% 0.005 255)',
          border: 'none', fontSize: '0.85rem', fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
          fontFamily: 'var(--font-body)',
        }}
      >
        {loading ? 'Hazırlanıyor...' : 'Telegram Bağla'}
      </button>
    </div>
  )
}
