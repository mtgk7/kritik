'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--page-pad)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(4rem, 12vw, 7rem)',
          lineHeight: 1,
          color: 'var(--color-border)',
          letterSpacing: '-0.02em',
          marginBottom: '1rem',
        }}>
          Hata
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.4rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--color-text-primary)',
          marginBottom: '0.6rem',
        }}>
          Bir şeyler ters gitti
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', maxWidth: '36ch', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi dene veya ana sayfaya dön.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'var(--color-accent)',
              color: 'oklch(97% 0.005 255)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tekrar Dene
          </button>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.65rem 1.5rem',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Ana Sayfaya Dön
          </a>
        </div>
      </div>
    </main>
  )
}
