export default function PremiumBasariliPage() {
  return (
    <main style={{ maxWidth: '480px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>⭐</div>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', letterSpacing: '0.04em',
        textTransform: 'uppercase', color: 'var(--color-premium)',
        lineHeight: 1.1, marginBottom: '1rem',
      }}>
        Premium Aktif!
      </h1>
      <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: 1.65, marginBottom: '2rem' }}>
        Ödemen alındı. Yüksek güven skorlu kombinasyon önerilerine ve tüm premium analizlere artık erişimin var.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/kuponlar" style={{
          fontSize: '0.88rem', fontWeight: 600,
          color: 'oklch(97% 0.005 255)', background: 'var(--color-accent)',
          textDecoration: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem',
        }}>
          Önerileri Gör →
        </a>
        <a href="/profil" style={{
          fontSize: '0.88rem', fontWeight: 600,
          color: 'var(--color-text-primary)', background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          textDecoration: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem',
        }}>
          Profilim
        </a>
      </div>
    </main>
  )
}
