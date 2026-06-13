import { meta } from '@/lib/metadata'

export const metadata = meta('Mesafeli Satış Sözleşmesi', 'Kritik platformu mesafeli satış koşulları.')

const SATICI = {
  unvan: '[AD SOYAD]',
  tip: 'Bireysel Sosyal İçerik Üreticisi',
  vergiDairesi: 'İzmir Yamanlar Vergi Dairesi',
  adres: '[ADRES]',
  telefon: '[TELEFON]',
  eposta: 'info@oleonolive.com',
}

export default function MesafeliSatisSozlesmesiPage() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '3rem', paddingBottom: '5rem' }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '0.03em',
        textTransform: 'uppercase', color: 'var(--color-text-primary)',
        marginBottom: '0.4rem', lineHeight: 1,
      }}>
        Mesafeli Satış Sözleşmesi
      </h1>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', marginBottom: '2.5rem' }}>
        Son güncelleme: Haziran 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        <Section title="1. Taraflar">
          <p><strong>SATICI</strong></p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li><strong>Unvan:</strong> {SATICI.unvan}</li>
            <li><strong>Faaliyet Türü:</strong> {SATICI.tip}</li>
            <li><strong>Vergi Dairesi:</strong> {SATICI.vergiDairesi}</li>
            <li><strong>Adres:</strong> {SATICI.adres}</li>
            <li><strong>Telefon:</strong> {SATICI.telefon}</li>
            <li><strong>E-posta:</strong> <a href={`mailto:${SATICI.eposta}`} style={{ color: 'var(--color-accent)' }}>{SATICI.eposta}</a></li>
          </ul>
          <p style={{ marginTop: '1rem' }}><strong>ALICI:</strong> Kritik platformuna üye olan ve ödeme gerçekleştiren kişi.</p>
        </Section>

        <Section title="2. Sözleşmenin Konusu">
          <p>
            Bu sözleşme, SATICI tarafından işletilen <strong>kritik-wine.vercel.app</strong> adresindeki
            Kritik platformu üzerinden ALICI'nın satın aldığı dijital premium üyelik hizmetine ilişkin
            koşulları düzenler. 6502 sayılı Tüketicinin Korunması Hakkında Kanun ile Mesafeli Sözleşmeler
            Yönetmeliği kapsamında hazırlanmıştır.
          </p>
        </Section>

        <Section title="3. Hizmet Tanımı">
          <p>ALICI, seçtiği plana göre aşağıdaki dijital içeriklere erişim hakkı satın alır:</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>Editör tarafından hazırlanan günlük kupon önerileri</li>
            <li>xG ve form bazlı derin maç analizleri</li>
            <li>Yapay zeka destekli kupon oluşturucu</li>
            <li>Haftalık isabet istatistikleri</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            Hizmet tamamen dijitaldir; fiziksel bir ürün teslimi yapılmaz.
          </p>
        </Section>

        <Section title="4. Fiyat ve Ödeme">
          <p>
            Güncel plan fiyatları platform üzerinde açıkça belirtilmiştir. Tüm fiyatlara KDV dahildir.
            Ödeme, güvenli ödeme altyapısı üzerinden kredi/banka kartıyla tahsil edilir.
            Sipariş onayı ardından ödeme derhal alınır.
          </p>
        </Section>

        <Section title="5. Hizmetin İfası">
          <p>
            Ödeme başarıyla tamamlandıktan sonra premium erişim aynı oturum içinde aktif hâle gelir.
            Hizmet, seçilen abonelik süresi (haftalık, aylık, 3 aylık veya yıllık) boyunca geçerlidir.
            Abonelikler otomatik olarak yenilenmez.
          </p>
        </Section>

        <Section title="6. Cayma Hakkı">
          <p>
            6502 sayılı Kanun'un 49. maddesi ve Mesafeli Sözleşmeler Yönetmeliği'nin 15/ğ bendi uyarınca,
            dijital içerik niteliğindeki bu hizmette — tüketici tarafından onaylanmış olması ve hizmetin
            ifasına başlanmış olması koşuluyla — <strong>cayma hakkı kullanılamaz</strong>.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Üye, kayıt sırasında bu koşulu kabul ettiğini beyan eder.
          </p>
        </Section>

        <Section title="7. Sorumluluk Reddi">
          <p>
            Platform, istatistiksel analiz sunmaktadır. Sunulan içerikler yatırım tavsiyesi, kumar teşviki
            veya kesin sonuç garantisi niteliği taşımaz. ALICI, tüm kararların kendi sorumluluğunda
            olduğunu kabul eder.
          </p>
        </Section>

        <Section title="8. Uyuşmazlık Çözümü">
          <p>
            Bu sözleşmeden doğacak uyuşmazlıklarda İzmir Tüketici Hakem Heyetleri ve İzmir Tüketici
            Mahkemeleri yetkilidir.
          </p>
        </Section>

        <Section title="9. İletişim">
          <p>
            Her türlü soru ve şikayet için:{' '}
            <a href={`mailto:${SATICI.eposta}`} style={{ color: 'var(--color-accent)' }}>{SATICI.eposta}</a>
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
