import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User } from '@/lib/types'
import { signOut } from '@/app/actions/auth'
import PremiumCheckout from '@/components/PremiumCheckout'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) redirect('/giris')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const p = profile as User

  const premiumAktif = p?.is_premium && p?.premium_until
    ? new Date(p.premium_until) > new Date()
    : false

  const kalanGun = p?.premium_until && premiumAktif
    ? Math.ceil((new Date(p.premium_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const kayitTarihi = new Date(p?.created_at ?? authUser.created_at)
    .toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '5rem' }}>

      {/* Başlık */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '0.03em',
          textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1,
        }}>
          Profilim
        </h1>
      </div>

      {/* Kullanıcı kartı */}
      <div style={{
        padding: '1.5rem',
        background: 'var(--color-surface-2)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        marginBottom: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
              {p?.email ?? authUser.email}
            </p>
            {p?.username && (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)' }}>@{p.username}</p>
            )}
          </div>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', padding: '0.25rem 0.65rem', borderRadius: '99px',
            background: premiumAktif ? 'var(--color-premium-bg)' : 'var(--color-border)',
            color: premiumAktif ? 'var(--color-premium)' : 'var(--color-text-tertiary)',
            flexShrink: 0,
          }}>
            {premiumAktif ? '⭐ Premium' : 'Ücretsiz'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>Kayıt tarihi</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{kayitTarihi}</span>
          </div>

          {premiumAktif && kalanGun !== null && p?.premium_until && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>Premium bitiş</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-premium)' }}>
                {new Date(p.premium_until).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                <span style={{ fontWeight: 400, marginLeft: '0.35rem' }}>({kalanGun} gün)</span>
              </span>
            </div>
          )}

          {!premiumAktif && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>Üyelik</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>Ücretsiz plan</span>
            </div>
          )}
        </div>
      </div>

      {/* Premium CTA veya durum */}
      {premiumAktif ? (
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--color-premium-bg)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.25rem' }}>⭐</span>
          <div>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-premium)', marginBottom: '0.15rem' }}>
              Premium üyeliğin aktif
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
              Tüm premium kupona ve analizlere erişimin var.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '1.5rem',
          background: 'var(--color-surface-2)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          marginBottom: '1.25rem',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: 'var(--color-text-primary)', marginBottom: '0.5rem',
          }}>
            Premium'a Geç
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Yüksek güven skorlu kombinasyon kuponlarına, detaylı xG analizlerine
            ve sakatlık alarmlarına tam erişim sağla.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
            {['Premium kuponlara tam erişim', 'Günlük yüksek güven analizleri', 'Sakatlık ve ceza alarmları'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-premium)', flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
          <PremiumCheckout />
        </div>
      )}

      {/* Çıkış yap */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
        <form action={signOut}>
          <button type="submit" style={{
            fontSize: '0.82rem', fontWeight: 600,
            color: 'var(--color-accent)',
            background: 'none', border: 'none',
            cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-body)',
          }}>
            Çıkış Yap →
          </button>
        </form>
      </div>

    </main>
  )
}
