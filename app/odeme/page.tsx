import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PremiumCheckout from '@/components/PremiumCheckout'
import { meta } from '@/lib/metadata'

export const metadata = meta('Ödeme', 'Premium üyeliğini aktifleştir.')

export default async function OdemePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/giris?sonra=odeme')

  const [{ data: profile }, { data: pending }] = await Promise.all([
    supabase.from('users').select('is_premium, premium_until').eq('id', user.id).single(),
    supabase.from('pending_approvals').select('days, amount_try').eq('user_id', user.id).maybeSingle(),
  ])

  const isPremium = profile?.is_premium && profile?.premium_until
    ? new Date(profile.premium_until) > new Date()
    : false

  if (isPremium) redirect('/profil')

  return (
    <main style={{
      minHeight: '80vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--page-pad)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{
            fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '0.75rem',
          }}>
            Son Adım
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
            letterSpacing: '0.03em', textTransform: 'uppercase',
            color: 'var(--color-text-primary)', lineHeight: 1.05, marginBottom: '0.6rem',
          }}>
            Üyeliğini Aktifleştir
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Planını seç, ödemeyi tamamla — admin onayının ardından premium özelliklere erişim sağlanır.
          </p>
        </div>

        {/* Onay bekliyor */}
        {pending ? (
          <div style={{
            padding: '1.5rem',
            background: 'var(--color-warning-bg)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>⏳</span>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '0.3rem' }}>
                Ödemeniz onay bekliyor
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {pending.days} günlük premium ödemeniz alındı
                {pending.amount_try ? ` (₺${pending.amount_try})` : ''}.
                Admin onayının ardından hesabınız otomatik aktifleşecek.
              </p>
            </div>
          </div>
        ) : (
          /* Checkout */
          <div style={{
            padding: '1.5rem',
            background: 'var(--color-surface-2)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[
                'Tüm maçlara sınırsız AI analizi',
                'Yüksek güven skorlu premium kuponlar',
                'xG, form ve sakatlık raporları',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
            <PremiumCheckout />
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
          Ücretsiz devam etmek için{' '}
          <a href="/" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>maçlara göz at →</a>
        </p>

      </div>
    </main>
  )
}
