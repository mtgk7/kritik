import { meta } from '@/lib/metadata'

export const metadata = meta('Hoş Geldin', 'Kritik\'e hoş geldin.')

export default function HosgeldinPage() {
  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--page-pad)' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(2rem, 6vw, 3rem)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            lineHeight: 1,
            marginBottom: '0.6rem',
          }}>
            <span style={{ color: 'var(--color-text-primary)' }}>HOŞ GELDİN, </span>
            <span style={{ color: 'var(--color-accent)' }}>KRİTİK.</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Hesabın oluşturuldu. Algoritmamız maçları sürekli analiz ediyor — şimdi içeriye gir.
          </p>
        </div>

        {/* Özellik listesi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
          <FeatureItem
            icon="⚽"
            title="Günlük Maç Analizleri"
            desc="xG, form skoru ve sakatlık etkileriyle hesaplanan tahminler."
          />
          <FeatureItem
            icon="🎯"
            title="Güven Skoru"
            desc="Her tahmin için algoritmamızın güven düzeyi."
          />
          <FeatureItem
            icon="🤖"
            title="AI Kuponlar (Premium)"
            desc="Güven eşiği ve lig seçerek algoritmanın ürettiği kişisel kombinasyon kuponları — premium üyelere özel."
          />
          <FeatureItem
            icon="⭐"
            title="Premium: Editör Tahminleri"
            desc="Yüksek güven skorlu maçlar ve özel kuponlar için premium üye ol."
          />
        </div>

        {/* CTA butonları */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <a
            href="/"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.85rem',
              background: 'var(--color-accent)',
              color: 'oklch(97% 0.005 255)',
              textDecoration: 'none',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            Maçları Gör →
          </a>
          <a
            href="/odeme"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.85rem',
              background: 'transparent',
              color: 'var(--color-premium)',
              textDecoration: 'none',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              border: '1.5px solid var(--color-premium)',
              letterSpacing: '0.02em',
            }}
          >
            ⭐ Premium Ol — ₺399/ay
          </a>
        </div>

        <p style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
          Platformu kullanarak{' '}
          <a href="/kullanim-kosullari" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'underline' }}>Kullanım Koşulları</a>
          {' '}ve{' '}
          <a href="/gizlilik-politikasi" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'underline' }}>Gizlilik Politikası</a>
          &apos;nı kabul etmiş sayılırsın.
        </p>
      </div>
    </main>
  )
}

function FeatureItem({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      padding: '0.9rem 1.1rem',
      background: 'var(--color-surface)',
      borderRadius: '10px',
      border: '1px solid var(--color-border)',
      alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '1.3rem', lineHeight: 1, flexShrink: 0, marginTop: '0.1rem' }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          {desc}
        </div>
      </div>
    </div>
  )
}
