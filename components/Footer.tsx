const DISCLAIMER = 'Burada yer alan veriler tamamen istatistiksel analizlerdir, yatırım tavsiyesi niteliği taşımaz ve kesin kazanç garantisi vermez.'

const LEGAL_LINKS = [
  { href: '/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi' },
  { href: '/kullanim-kosullari',        label: 'Kullanım Şartları' },
  { href: '/gizlilik-politikasi',       label: 'Gizlilik & KVKK' },
]

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--color-border)',
      background: 'var(--color-surface-2)',
      marginTop: 'auto',
    }}>
      {/* Ana gövde */}
      <div style={{
        maxWidth: 'var(--page-max)',
        margin: '0 auto',
        padding: '2.5rem var(--page-pad)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '2rem',
      }}>
        {/* Sol — marka */}
        <div>
          <p style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1.25rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--color-text-primary)', marginBottom: '0.5rem',
          }}>
            KRİTİK
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', lineHeight: 1.6, maxWidth: '220px' }}>
            xG verileri ve istatistiksel algoritmalarla desteklenmiş spor analiz platformu.
          </p>
        </div>

        {/* Orta — yasal bağlantılar */}
        <div>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.85rem' }}>
            Yasal
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {LEGAL_LINKS.map(l => (
              <a key={l.href} href={l.href} style={{
                fontSize: '0.82rem', color: 'var(--color-text-secondary)',
                textDecoration: 'none',
              }}>
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Sağ — iletişim */}
        <div>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.85rem' }}>
            İletişim
          </p>
          <a href="mailto:info@oleonolive.com" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'block', marginBottom: '1rem' }}>
            info@oleonolive.com
          </a>
          <a href="/iletisim" style={{
            display: 'inline-block',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase',
            color: 'var(--color-text-primary)',
            border: '1.5px solid var(--color-border-strong)',
            borderRadius: '7px', padding: '0.45rem 1rem',
            textDecoration: 'none',
          }}>
            Bize Ulaşın →
          </a>
        </div>
      </div>

      {/* Alt bar */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        padding: '1rem var(--page-pad)',
        maxWidth: 'var(--page-max)',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
          © {new Date().getFullYear()} Kritik — Bireysel Sosyal İçerik Üreticisi · Vergi Dairesi: İzmir Yamanlar
        </p>
        <p style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', margin: 0, lineHeight: 1.6 }}>
          ⚠️ {DISCLAIMER}
        </p>
      </div>
    </footer>
  )
}
