import { meta } from '@/lib/metadata'

export const metadata = meta('Kullanım Koşulları', 'Kritik platformunu kullanmadan önce lütfen bu koşulları okuyun.')

export default function KullanimKosullariPage() {
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
        Kullanım Koşulları
      </h1>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', marginBottom: '2.5rem' }}>
        Son güncelleme: Haziran 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <Section title="1. Genel">
          <p>
            Bu platform ("Kritik"), yapay zeka ve istatistiksel algoritmalar kullanarak spor maçlarına yönelik analiz ve tahminler sunar.
            Platformu kullanarak bu koşulları kabul etmiş sayılırsın. Koşulları kabul etmiyorsan platformu kullanmayı bırakman gerekir.
          </p>
        </Section>

        <Section title="2. Sorumluluk Reddi">
          <p>
            Kritik, yalnızca <strong>bilgilendirme amaçlı</strong> bir analiz platformudur.
            Sunulan tahminler ve analizler hiçbir şekilde finansal tavsiye, kumar teşviki veya kesin sonuç garantisi niteliği taşımaz.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Kumar, kişisel finansal kayıplara yol açabilir. Platform, kullanıcıların iddaa oynamasını teşvik etmez.
            Tüm kararlar kullanıcının kendi sorumluluğundadır.
          </p>
        </Section>

        <Section title="3. Yaş Sınırı">
          <p>
            Platformu yalnızca 18 yaş ve üzeri bireyler kullanabilir. Kayıt olarak bu koşulu karşıladığını beyan etmiş sayılırsın.
          </p>
        </Section>

        <Section title="4. Hesap ve Güvenlik">
          <p>
            Hesabının güvenliğinden sen sorumlusun. Şifreni kimseyle paylaşma.
            Hesabınla gerçekleştirilen tüm işlemler sana ait kabul edilir.
            Şüpheli bir aktivite fark edersen hemen bizimle iletişime geç.
          </p>
        </Section>

        <Section title="5. Premium Üyelik">
          <p>
            Premium üyelik, belirtilen süre boyunca premium içeriklere erişim sağlar.
            Ödeme Stripe altyapısı üzerinden güvenli biçimde işlenir.
            Abonelikler otomatik olarak yenilenmez; her dönem için ayrı ödeme gerekir.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            İptal işlemleri destek kanalı üzerinden yapılabilir. İade politikamız: hizmet başladıktan sonra iade yapılmamaktadır.
          </p>
        </Section>

        <Section title="6. İçerik ve Telif Hakkı">
          <p>
            Platformdaki tüm içerik (analizler, tahminler, kuponlar) Kritik'e aittir.
            İzin alınmadan kopyalanamaz, dağıtılamaz veya ticari amaçla kullanılamaz.
          </p>
        </Section>

        <Section title="7. Değişiklikler">
          <p>
            Bu koşulları önceden bildirmeksizin güncelleme hakkımız saklıdır.
            Güncel koşullar her zaman bu sayfada yayımlanır.
          </p>
        </Section>

        <Section title="8. İletişim">
          <p>
            Sorularınız için: <a href="mailto:info@oleonolive.com" style={{ color: 'var(--color-accent)' }}>info@oleonolive.com</a>
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
