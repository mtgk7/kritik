import { meta } from '@/lib/metadata'

export const metadata = meta('Sayfa Bulunamadı')

export default function NotFound() {
  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--page-pad)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(5rem, 15vw, 9rem)',
          lineHeight: 1,
          color: 'var(--color-border)',
          letterSpacing: '-0.02em',
          marginBottom: '1rem',
        }}>
          404
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.5rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--color-text-primary)',
          marginBottom: '0.6rem',
        }}>
          Sayfa Bulunamadı
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', maxWidth: '30ch', margin: '0 auto 2rem' }}>
          Aradığın sayfa mevcut değil veya kaldırılmış olabilir.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.65rem 1.5rem',
            background: 'var(--color-accent)',
            color: 'oklch(97% 0.005 255)',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          Ana Sayfaya Dön
        </a>
      </div>
    </main>
  )
}
