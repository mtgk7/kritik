import { meta } from '@/lib/metadata'

export const metadata = meta(
  'Hizmetler',
  'Kritik — Yapay zeka destekli futbol analiz platformu. Ücretsiz ve premium hizmetlerimizi keşfedin.'
)

const FREE_FEATURES = [
  { icon: '🎯', title: 'Haftada 4 Ücretsiz Maç Analizi', desc: 'Her hafta rotasyonla değişen 4 maçın AI tahmini, güven skoru ve xG analizi tamamen ücretsiz.' },
  { icon: '📅', title: 'Tüm Maç Takvimi', desc: 'Süper Lig, Premier Lig, Şampiyonlar Ligi ve daha fazlası — tüm yaklaşan maçları takip et.' },
  { icon: '📰', title: 'Günlük Spor Haberleri', desc: 'Her gün güncellenen haberler: Dünya Kupası, Süper Lig, Avrupa ligleri.' },
  { icon: '♥', title: 'Favori Takım Takibi', desc: 'Takip ettiğin takımların maçlarını filtrele, liste başında vurgulu gör.' },
  { icon: '📊', title: 'İsabet Oranı Panosu', desc: 'Algoritmanın genel doğruluk oranı, lig ve güven bazlı performans istatistikleri.' },
  { icon: '📱', title: 'Telefona Kurulabilir (PWA)', desc: 'Uygulamayı ana ekranına ekle, internet bağlantısı olmadan da açılır.' },
]

const PREMIUM_FEATURES = [
  { icon: '🎯', title: 'Tüm Maçlara Sınırsız Erişim', desc: 'Günlük 4 ücretsiz maçın ötesinde tüm maçların AI tahmini ve analizine tam erişim.' },
  { icon: '📊', title: 'xG & Form Analizi', desc: 'Her maç için beklenen gol (xG), son form skorları ve detaylı istatistikler.' },
  { icon: '⚠️', title: 'Kadro & Sakatlık Alarmı', desc: 'Eksik, sakat ve cezalı oyuncuların maç sonucuna etkisi hesaplanır.' },
  { icon: '📈', title: 'Son 5 Maç Detayı', desc: 'Her iki takımın son 5 maç sonuçları, gol, sarı ve kırmızı kart istatistikleri.' },
  { icon: '🔬', title: 'Derin Maç Analizi', desc: 'Tahmin dağılımı, takım karşılaştırması, kafa kafaya geçmiş ve AI algoritma yorumu.' },
  { icon: '🧠', title: 'Özel Claude AI Analizi', desc: 'Her maç için istek üzerine Claude AI\'nin kapsamlı bahis raporu — risk, değer ve öneri.' },
  { icon: '🤖', title: 'AI Önerileri', desc: 'Algoritmanın ürettiği Banko ve xG Canavarı kombinasyon kuponları.' },
  { icon: '⭐', title: 'Özel Öneriler', desc: 'Güven skoru %70+ yüksek kombinasyon kuponları yalnızca premium üyelere açık.' },
  { icon: '✍️', title: 'Editör Önerileri', desc: 'Uzman editörlerimizin özenle seçtiği öneriler ve analizleri.' },
  { icon: '🔒', title: 'Premium Sürpriz Kupon', desc: 'En yüksek güven skorlu 3 maçın kombinasyonu — yalnızca premium üyelere özel.' },
  { icon: '📲', title: 'Telegram & Push Bildirimleri', desc: 'Yeni kupon ve yüksek güven maçları için anlık bildirim al.' },
]

const STATS = [
  { value: '27+',  label: 'Günlük Maç Analizi' },
  { value: '%80',  label: 'Maks. Güven Skoru' },
  { value: '230+', label: 'Güncel Spor Haberi' },
  { value: '7/24', label: 'Canlı Güncelleme' },
]

const PLANS = [
  { id: 'weekly',    label: 'Haftalık', price: '₺149',   original: null,     discount: null,  period: '/hafta', note: 'Deneme için ideal' },
  { id: 'monthly',   label: 'Aylık',    price: '₺399',   original: null,     discount: null,  period: '/ay',    note: '' },
  { id: 'quarterly', label: '3 Aylık',  price: '₺999',   original: '₺1.197', discount: '%17', period: '/3 ay',  note: '%17 indirim' },
  { id: 'annual',    label: 'Yıllık',   price: '₺3.900', original: '₺4.788', discount: '%19', period: '/yıl',   note: '%19 indirim' },
]

const COMPARE_ROWS = [
  { label: 'Maç takvimi',                   free: true,           premium: true },
  { label: 'Günlük haberler',               free: true,           premium: true },
  { label: 'AI önerileri',                   free: false,          premium: true },
  { label: 'Favori takım takibi',           free: true,           premium: true },
  { label: 'İsabet oranı panosu',           free: true,           premium: true },
  { label: 'Telefona kurulum (PWA)',         free: true,           premium: true },
  { label: 'Haftada 4 ücretsiz maç detayı', free: true,           premium: true },
  { label: 'Tüm maçlara sınırsız erişim',   free: false,          premium: true },
  { label: 'xG & form analizi',             free: false,          premium: true },
  { label: 'Kadro & sakatlık alarmı',       free: false,          premium: true },
  { label: 'Son 5 maç detayı',              free: false,          premium: true },
  { label: 'Derin maç analizi',             free: false,          premium: true },
  { label: 'Özel Claude AI analizi',        free: false,          premium: true },
  { label: 'Özel öneriler (%70+)',           free: false,          premium: true },
  { label: 'Editör önerileri',              free: false,          premium: true },
  { label: 'Premium Sürpriz Kupon',         free: false,          premium: true },
  { label: 'Telegram & push bildirimleri',  free: false,          premium: true },
]

export default function HizmetlerPage() {
  return (
    <div style={{ background: 'var(--color-base)' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--color-header)',
        padding: 'clamp(3rem, 8vw, 6rem) var(--page-pad)',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--color-text-on-dark-2)',
          marginBottom: '1.25rem',
        }}>
          Yapay Zeka Destekli Futbol Analizi
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(2.8rem, 9vw, 6rem)',
          letterSpacing: '0.03em', textTransform: 'uppercase',
          color: 'var(--color-text-on-dark)', lineHeight: 1.0,
          marginBottom: '1.5rem',
        }}>
          Tahmin değil,{' '}
          <span style={{ color: 'var(--color-accent)' }}>analiz.</span>
        </h1>
        <p style={{
          fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
          color: 'var(--color-text-on-dark-2)', lineHeight: 1.7,
          maxWidth: '560px', margin: '0 auto 2.5rem',
        }}>
          Detaylı takım istatistikleri ve eksik oyuncu etkileriyle optimize edilmiş
          algoritmik tahminler. Karar vermeden önce 'Kritik Analiz' bölümünü inceleyin.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/odeme" style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.95rem', letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'oklch(97% 0.005 255)',
            background: 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
            textDecoration: 'none', borderRadius: '8px', padding: '0.75rem 2rem',
            boxShadow: '0 2px 8px oklch(30% 0.1 35 / 0.5)',
          }}>
            ⭐ Premium Ol
          </a>
          <a href="/" style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.95rem', letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'var(--color-text-on-dark)',
            background: 'oklch(22% 0.016 255)',
            border: '1px solid oklch(30% 0.016 255)',
            textDecoration: 'none', borderRadius: '8px', padding: '0.75rem 2rem',
          }}>
            Maçları Gör →
          </a>
        </div>
      </section>

      {/* ── İstatistikler ─────────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--color-header-2)',
        padding: '1.75rem var(--page-pad)',
        borderBottom: '1px solid oklch(25% 0.016 255)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0', maxWidth: '900px', margin: '0 auto',
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '1rem',
              borderRight: i < STATS.length - 1 ? '1px solid oklch(30% 0.016 255)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '2rem', lineHeight: 1, color: 'var(--color-accent)',
                letterSpacing: '-0.01em',
              }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-on-dark-2)', marginTop: '0.3rem', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Özellik Kartları ──────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(3rem, 6vw, 5rem) var(--page-pad)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: 'var(--color-text-primary)', lineHeight: 1,
          }}>
            Ne Sunuyoruz?
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Ücretsiz başla, istediğinde premium'a geç.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem', maxWidth: '1000px', margin: '0 auto',
        }}>
          {/* Ücretsiz Kart */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                Ücretsiz Plan
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: 'var(--color-text-primary)' }}>₺0</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)' }}>/süresiz</span>
              </div>
              <a href="/kayit" style={{
                display: 'block', marginTop: '1.25rem', textAlign: 'center',
                fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)',
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                textDecoration: 'none', borderRadius: '8px', padding: '0.6rem',
              }}>
                Ücretsiz Başla
              </a>
            </div>
            <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {FREE_FEATURES.map((f, i) => (
                <FeatureRow key={i} icon={f.icon} title={f.title} desc={f.desc} />
              ))}
            </div>
          </div>

          {/* Premium Kart */}
          <div style={{ border: '2px solid var(--color-premium)', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: '1rem', right: '1rem',
              fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'oklch(20% 0.08 35)', background: 'oklch(82% 0.12 68)',
              borderRadius: '4px', padding: '0.2rem 0.55rem',
            }}>
              En Popüler
            </div>
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid oklch(85% 0.06 68 / 0.3)', background: 'var(--color-premium-bg)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-premium)', marginBottom: '0.5rem' }}>
                Premium Plan
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: 'var(--color-premium)' }}>₺149</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)' }}>/haftadan · aylık ₺399</span>
              </div>
              <a href="/odeme" style={{
                display: 'block', marginTop: '1.25rem', textAlign: 'center',
                fontSize: '0.85rem', fontWeight: 700, color: 'oklch(97% 0.005 255)',
                background: 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
                textDecoration: 'none', borderRadius: '8px', padding: '0.6rem',
              }}>
                ⭐ Premium Ol
              </a>
            </div>
            <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Ücretsizin tüm özellikleri +
              </div>
              {PREMIUM_FEATURES.map((f, i) => (
                <FeatureRow key={i} icon={f.icon} title={f.title} desc={f.desc} premium />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Karşılaştırma Tablosu ─────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(2rem, 5vw, 4rem) var(--page-pad)', background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '0.04em',
            textTransform: 'uppercase', color: 'var(--color-text-primary)',
            textAlign: 'center', marginBottom: '2rem', lineHeight: 1,
          }}>
            Özellik Karşılaştırması
          </h2>

          <div style={{ borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            {/* Başlık satırı */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px',
              background: 'var(--color-header)', padding: '0.75rem 1.25rem',
              gap: '0.5rem', alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-on-dark-2)' }}>Özellik</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-on-dark-2)', textAlign: 'center' }}>Ücretsiz</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-premium)', textAlign: 'center' }}>Premium</span>
            </div>

            {COMPARE_ROWS.map((row, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 80px',
                padding: '0.7rem 1.25rem', gap: '0.5rem', alignItems: 'center',
                background: i % 2 === 0 ? 'var(--color-base)' : 'var(--color-surface-2)',
                borderTop: '1px solid var(--color-border)',
              }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{row.label}</span>
                <span style={{ textAlign: 'center', fontSize: '1rem', color: row.free ? 'var(--color-success)' : 'var(--color-border-strong)' }}>
                  {row.free ? '✓' : '—'}
                </span>
                <span style={{ textAlign: 'center', fontSize: '1rem', color: row.premium ? 'var(--color-premium)' : 'var(--color-border-strong)' }}>
                  {row.premium ? '✓' : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Premium Planlar ───────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(3rem, 6vw, 5rem) var(--page-pad)', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '0.5rem',
          }}>
            Premium Planlar
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            İstediğin planı seç, istediğin zaman yükselt.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem', maxWidth: '900px', margin: '0 auto 2.5rem',
        }}>
          {PLANS.map((p) => (
            <a key={p.id} href="/odeme" style={{
              display: 'block', textDecoration: 'none',
              border: p.id === 'monthly' ? '2px solid var(--color-premium)' : '1px solid var(--color-border)',
              borderRadius: '12px', padding: '1.5rem',
              background: p.id === 'monthly' ? 'var(--color-premium-bg)' : 'var(--color-base)',
              textAlign: 'center', position: 'relative',
            }}>
              {p.note && (
                <div style={{
                  position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                  fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'oklch(20% 0.08 35)', background: 'oklch(82% 0.12 68)',
                  borderRadius: '4px', padding: '0.2rem 0.6rem', whiteSpace: 'nowrap',
                }}>
                  {p.note}
                </div>
              )}
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: p.id === 'monthly' ? 'var(--color-premium)' : 'var(--color-text-tertiary)', marginBottom: '0.85rem' }}>
                {p.label}
              </div>
              {p.original && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)', textDecoration: 'line-through' }}>
                    {p.original}
                  </span>
                  {p.discount && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-success)',
                      background: 'var(--color-success-bg)', borderRadius: '4px',
                      padding: '0.1rem 0.4rem', letterSpacing: '0.04em',
                    }}>
                      {p.discount}
                    </span>
                  )}
                </div>
              )}
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.4rem', lineHeight: 1, color: p.id === 'monthly' ? 'var(--color-premium)' : 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                {p.price}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginTop: '0.3rem' }}>
                {p.period}
              </div>
            </a>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <a href="/odeme" style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'oklch(97% 0.005 255)',
            background: 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
            textDecoration: 'none', borderRadius: '10px', padding: '0.85rem 2.5rem',
            display: 'inline-block',
            boxShadow: '0 4px 12px oklch(30% 0.1 35 / 0.4)',
          }}>
            Hemen Başla →
          </a>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.75rem' }}>
            Stripe ile güvenli ödeme · Admin onayı ile aktifleşir
          </p>
        </div>
      </section>

    </div>
  )
}

function FeatureRow({ icon, title, desc, premium }: { icon: string; title: string; desc: string; premium?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0, lineHeight: 1.3 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: premium ? 'var(--color-premium)' : 'var(--color-text-primary)', marginBottom: '0.15rem' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', lineHeight: 1.45 }}>{desc}</div>
      </div>
    </div>
  )
}
