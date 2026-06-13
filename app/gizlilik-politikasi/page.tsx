import { meta } from '@/lib/metadata'

export const metadata = meta('Gizlilik ve KVKK Politikası', 'Kişisel verilerinizin nasıl işlendiğini öğrenin.')

export default function GizlilikPolitikasiPage() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '3rem', paddingBottom: '5rem' }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '0.03em',
        textTransform: 'uppercase', color: 'var(--color-text-primary)',
        marginBottom: '0.4rem', lineHeight: 1,
      }}>
        Gizlilik ve KVKK Politikası
      </h1>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', marginBottom: '2.5rem' }}>
        Son güncelleme: Haziran 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        <Section title="1. Veri Sorumlusu">
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu:{' '}
            <strong>[AD SOYAD]</strong> (Bireysel Sosyal İçerik Üreticisi, İzmir Yamanlar Vergi Dairesi).
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            İletişim:{' '}
            <a href="mailto:info@kritikanaliz.com" style={{ color: 'var(--color-accent)' }}>info@kritikanaliz.com</a>
          </p>
        </Section>

        <Section title="2. Toplanan Kişisel Veriler">
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li><strong>Hesap verileri:</strong> E-posta adresi, şifre (hashlenmiş, düz metin saklanmaz)</li>
            <li><strong>Kullanım verileri:</strong> Favori takımlar, ziyaret edilen sayfalar, tercihler</li>
            <li><strong>Ödeme verileri:</strong> Ödeme altyapısı üzerinden işlenir; kart bilgileri platform sunucularında tutulmaz</li>
            <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı türü (Google Analytics aracılığıyla anonimleştirilmiş)</li>
            <li><strong>Push bildirim aboneliği:</strong> Tarayıcı tarafından üretilen abone token'ı</li>
          </ul>
        </Section>

        <Section title="3. İşleme Amaçları ve Hukuki Dayanakları">
          <p>Kişisel verileriniz KVKK md. 5 kapsamında aşağıdaki amaçlarla işlenmektedir:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>Hesap oluşturma ve kimlik doğrulama (sözleşmenin ifası)</li>
            <li>Premium üyelik yönetimi (sözleşmenin ifası)</li>
            <li>Push bildirimleri ve e-posta özetleri (açık rıza)</li>
            <li>Platform güvenliği ve hata ayıklama (meşru menfaat)</li>
            <li>Anonim kullanım istatistikleri (meşru menfaat)</li>
          </ul>
        </Section>

        <Section title="4. Verilerin Aktarıldığı Taraflar">
          <p>Kişisel verileriniz yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz. Kullanılan alt işlemciler:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li><strong>Supabase</strong> — kimlik doğrulama ve veritabanı (ABD, SCCs ile korumalı)</li>
            <li><strong>Vercel</strong> — uygulama barındırma (ABD, SCCs ile korumalı)</li>
            <li><strong>Google Analytics</strong> — anonim trafik analizi</li>
            <li><strong>Sentry</strong> — hata izleme (yalnızca teknik veriler)</li>
          </ul>
        </Section>

        <Section title="5. Veri Güvenliği">
          <p>
            Tüm veriler HTTPS ile şifrelenerek iletilir. Şifreler bcrypt ile hashlenir, düz metin olarak
            saklanmaz. Supabase Row Level Security (RLS) ile her kullanıcı yalnızca kendi verilerine erişebilir.
          </p>
        </Section>

        <Section title="6. Çerezler">
          <p>
            Platform, oturum yönetimi için zorunlu çerezler kullanır. Bu çerezler olmadan hizmet
            işlevsel olarak çalışamaz. Google Analytics, anonimleştirilmiş trafik analizi amacıyla
            isteğe bağlı çerez kullanabilir.
          </p>
        </Section>

        <Section title="7. KVKK Kapsamındaki Haklarınız">
          <p>KVKK md. 11 uyarınca aşağıdaki haklara sahipsiniz:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme</li>
            <li>Verilerin silinmesini veya yok edilmesini talep etme</li>
            <li>Düzeltme/silme işlemlerinin üçüncü kişilere bildirilmesini isteme</li>
            <li>Otomatik sistemler aracılığıyla aleyhinize sonuç doğurabilecek analizlere itiraz etme</li>
            <li>Kanuna aykırı işleme nedeniyle uğradığınız zararın giderilmesini talep etme</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            Taleplerinizi{' '}
            <a href="mailto:info@kritikanaliz.com" style={{ color: 'var(--color-accent)' }}>info@kritikanaliz.com</a>{' '}
            adresine iletebilirsiniz. Talepler en geç 30 gün içinde yanıtlanır.
          </p>
        </Section>

        <Section title="8. Veri Saklama Süresi">
          <p>
            Hesabınız aktif olduğu sürece verileriniz saklanır. Hesap silme talebinden sonra kişisel
            verileriniz 30 gün içinde kalıcı olarak silinir; yasal zorunluluk gerektiren veriler
            ilgili mevzuatta öngörülen süre boyunca muhafaza edilir.
          </p>
        </Section>

        <Section title="9. Politika Güncellemeleri">
          <p>
            Bu politika önceden bildirmeksizin güncellenebilir. Önemli değişikliklerde kayıtlı
            e-posta adresinize bildirim yapılır. Güncel metin her zaman bu sayfada yayımlanır.
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
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: '1.05rem', letterSpacing: '0.05em',
        textTransform: 'uppercase', color: 'var(--color-text-primary)',
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
