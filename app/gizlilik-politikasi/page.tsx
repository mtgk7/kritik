import { meta } from '@/lib/metadata'

export const metadata = meta('Gizlilik Politikası', 'Kişisel verilerinizin nasıl işlendiğini öğrenin.')

export default function GizlilikPolitikasiPage() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '3rem', paddingBottom: '5rem' }}>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        color: 'var(--color-text-primary)',
        marginBottom: '0.4rem',
        lineHeight: 1,
      }}>
        Gizlilik Politikası
      </h1>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', marginBottom: '2.5rem' }}>
        Son güncelleme: Haziran 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <Section title="1. Toplanan Veriler">
          <p>Kritik, hizmet sunabilmek için aşağıdaki verileri toplar:</p>
          <ul style={{ marginTop: '0.6rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li><strong>Hesap verileri:</strong> E-posta adresi, şifre (hashlenmiş)</li>
            <li><strong>Kullanım verileri:</strong> Favori maçlar, ziyaret edilen sayfalar</li>
            <li><strong>Ödeme verileri:</strong> Stripe üzerinden işlenir; kart bilgileri Kritik sunucularında saklanmaz</li>
            <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı türü (Google Analytics aracılığıyla)</li>
          </ul>
        </Section>

        <Section title="2. Verilerin Kullanım Amacı">
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>Hesap oluşturma ve kimlik doğrulama</li>
            <li>Premium üyelik yönetimi</li>
            <li>Haftalık e-posta özetleri (abonelik seçeneğiyle)</li>
            <li>Platform güvenliği ve hata ayıklama</li>
            <li>Anonim kullanım istatistikleri</li>
          </ul>
        </Section>

        <Section title="3. Veri Paylaşımı">
          <p>
            Kişisel verileriniz yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz.
            Kullandığımız alt işlemciler:
          </p>
          <ul style={{ marginTop: '0.6rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li><strong>Supabase</strong> — kimlik doğrulama ve veritabanı</li>
            <li><strong>Stripe</strong> — ödeme işlemleri</li>
            <li><strong>Resend</strong> — e-posta gönderimi</li>
            <li><strong>Vercel</strong> — uygulama barındırma</li>
            <li><strong>Google Analytics</strong> — anonim kullanım analizi</li>
          </ul>
        </Section>

        <Section title="4. Veri Güvenliği">
          <p>
            Tüm veriler HTTPS ile şifrelenerek iletilir. Şifreler bcrypt ile hashlenir ve asla düz metin olarak saklanmaz.
            Supabase Row Level Security (RLS) ile her kullanıcı yalnızca kendi verilerine erişebilir.
          </p>
        </Section>

        <Section title="5. Çerezler">
          <p>
            Platform, oturum yönetimi için zorunlu çerezler kullanır.
            Google Analytics, anonimleştirilmiş trafik analizi için çerez kullanabilir.
          </p>
        </Section>

        <Section title="6. Haklarınız">
          <p>KVKK kapsamında şu haklara sahipsiniz:</p>
          <ul style={{ marginTop: '0.6rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>Hakkınızda işlenen verilere erişim</li>
            <li>Hatalı verilerin düzeltilmesini talep etme</li>
            <li>Verilerinizin silinmesini talep etme</li>
            <li>Veri işlemeye itiraz etme</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            Hesabınızı ve tüm verilerinizi silmek için bizimle iletişime geçin.
          </p>
        </Section>

        <Section title="7. Veri Saklama Süresi">
          <p>
            Hesabınız aktif olduğu sürece verileriniz saklanır.
            Hesap silme talebinden sonra veriler 30 gün içinde kalıcı olarak silinir.
          </p>
        </Section>

        <Section title="8. İletişim">
          <p>
            Gizlilik konusundaki sorularınız için: <a href="mailto:info@oleonolive.com" style={{ color: 'var(--color-accent)' }}>info@oleonolive.com</a>
          </p>
        </Section>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '1.05rem',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--color-text-primary)',
        marginBottom: '0.65rem',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.75 }}>
        {children}
      </div>
    </section>
  )
}
