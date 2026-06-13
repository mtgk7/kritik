import { meta } from '@/lib/metadata'

export const metadata = meta('Kullanım Şartları ve Üyelik Sözleşmesi', 'Kritik platformunu kullanmadan önce lütfen bu koşulları okuyun.')

export default function KullanimKosullariPage() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '3rem', paddingBottom: '5rem' }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '0.03em',
        textTransform: 'uppercase', color: 'var(--color-text-primary)',
        marginBottom: '0.4rem', lineHeight: 1,
      }}>
        Kullanım Şartları ve Üyelik Sözleşmesi
      </h1>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', marginBottom: '2.5rem' }}>
        Son güncelleme: Haziran 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        <Section title="1. Taraflar ve Platform Tanımı">
          <p>
            Bu sözleşme; <strong>[AD SOYAD]</strong> (Bireysel Sosyal İçerik Üreticisi, İzmir Yamanlar
            Vergi Dairesi, e-posta: info@kritikanaliz.com) ile <strong>kritik-wine.vercel.app</strong>{' '}
            adresindeki Kritik platformuna üye olan kullanıcı ("Üye") arasında kurulur.
            Platforma kayıt olarak bu sözleşmeyi okuduğunu ve kabul ettiğini beyan etmiş sayılırsın.
          </p>
        </Section>

        <Section title="2. Sorumluluk Reddi">
          <p>
            Kritik, yalnızca <strong>bilgilendirme amaçlı</strong> istatistiksel analiz sunan bir platformdur.
            Sunulan tahminler, analizler ve kuponlar hiçbir şekilde yatırım tavsiyesi, kumar teşviki
            veya kesin sonuç garantisi niteliği taşımaz.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Tüm kararlar kullanıcının kendi sorumluluğundadır. Platform, kullanıcıların yaşayabileceği
            mali kayıplardan sorumlu tutulamaz.
          </p>
        </Section>

        <Section title="3. Yaş Sınırı">
          <p>
            Platforma yalnızca 18 yaş ve üzeri bireyler üye olabilir. Kayıt olarak bu koşulu
            karşıladığını beyan etmiş sayılırsın.
          </p>
        </Section>

        <Section title="4. Hesap Güvenliği">
          <p>
            Hesabının güvenliğinden sen sorumlusun. Şifreni kimseyle paylaşma. Hesabınla gerçekleştirilen
            tüm işlemler sana ait kabul edilir. Şüpheli bir aktivite fark edersen derhal{' '}
            <a href="mailto:info@kritikanaliz.com" style={{ color: 'var(--color-accent)' }}>info@kritikanaliz.com</a>{' '}
            adresine bildir.
          </p>
        </Section>

        <Section title="5. Premium Üyelik">
          <p>
            Premium üyelik, seçilen süre boyunca premium içeriklere erişim hakkı sağlar.
            Abonelikler otomatik olarak yenilenmez; her dönem için ayrı ödeme gerekir.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Dijital içerik niteliği taşıyan bu hizmette — hizmetin ifasına başlanmış olması koşuluyla —
            cayma hakkı kullanılamaz (6502 sayılı Kanun md. 49 / Mesafeli Sözleşmeler Yönetmeliği md. 15/ğ).
            İptal ve diğer talepler destek e-postası üzerinden iletilmelidir.
          </p>
        </Section>

        <Section title="6. Kullanım Kuralları">
          <p>Aşağıdaki eylemler kesinlikle yasaktır:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>Platform içeriklerini izinsiz kopyalamak, dağıtmak veya ticari amaçla kullanmak</li>
            <li>Başka kullanıcıların hesaplarına yetkisiz erişim denemek</li>
            <li>Platform altyapısını aşırı yükleyecek ya da sekteye uğratacak işlemler yapmak</li>
            <li>Gerçek dışı bilgilerle hesap oluşturmak</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            Bu kurallara aykırı davranan üyelerin hesapları önceden bildirim yapılmaksızın askıya alınabilir.
          </p>
        </Section>

        <Section title="7. Fikri Mülkiyet">
          <p>
            Platformdaki tüm içerik (analizler, tahminler, kuponlar, tasarım) platform sahibine aittir.
            İzin alınmadan çoğaltılamaz, yayımlanamaz veya ticari amaçla kullanılamaz.
          </p>
        </Section>

        <Section title="8. Değişiklikler">
          <p>
            Bu şartları önceden bildirmeksizin güncelleme hakkı saklıdır. Güncel metin her zaman
            bu sayfada yayımlanır. Güncelleme sonrası platformu kullanmaya devam etmek yeni şartların
            kabulü anlamına gelir.
          </p>
        </Section>

        <Section title="9. Uygulanacak Hukuk">
          <p>
            Bu sözleşme Türk Hukuku'na tabidir. Uyuşmazlıklarda İzmir Mahkemeleri ve İcra Daireleri
            yetkilidir.
          </p>
        </Section>

        <Section title="10. İletişim">
          <p>
            Sorularınız için:{' '}
            <a href="mailto:info@kritikanaliz.com" style={{ color: 'var(--color-accent)' }}>info@kritikanaliz.com</a>
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
