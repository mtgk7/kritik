import { createClient } from '@/lib/supabase/server'
import { setPremium } from '@/app/actions/premium'
import { User } from '@/lib/types'

export default async function KullanicılarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mesaj?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <a href="/admin" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>← Admin</a>

      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '2rem', lineHeight: 1 }}>
        Kullanıcılar
      </h1>

      {params.mesaj && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-success-bg)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 500 }}>
          ✓ {params.mesaj}
        </div>
      )}
      {(params.error || error) && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)' }}>
          {params.error ?? 'Kullanıcılar yüklenemedi. Admin hesabıyla giriş yaptığınızdan emin olun.'}
        </div>
      )}

      {!users?.length ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>Henüz kullanıcı yok.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {(users as User[]).map((user, i) => {
            const premiumAktif = user.is_premium && user.premium_until
              ? new Date(user.premium_until) > new Date()
              : false
            const isLast = i === users.length - 1

            return (
              <div key={user.id} style={{
                padding: '1.1rem 0',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                      {user.email}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                      Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}
                      {premiumAktif && user.premium_until && (
                        <span style={{ color: 'var(--color-premium)', marginLeft: '0.75rem' }}>
                          Premium — {new Date(user.premium_until).toLocaleDateString('tr-TR')}'e kadar
                        </span>
                      )}
                    </p>
                  </div>

                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '0.2rem 0.55rem', borderRadius: '4px',
                    background: premiumAktif ? 'var(--color-premium-bg)' : 'var(--color-surface-2)',
                    color: premiumAktif ? 'var(--color-premium)' : 'var(--color-text-tertiary)',
                  }}>
                    {premiumAktif ? '⭐ Premium' : 'Ücretsiz'}
                  </span>
                </div>

                <form action={setPremium} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <input type="hidden" name="user_id" value={user.id} />
                  <select name="is_premium" defaultValue={user.is_premium ? 'true' : 'false'} style={{ padding: '0.4rem 0.65rem', border: '1.5px solid var(--color-border)', borderRadius: '6px', fontSize: '0.78rem', background: 'oklch(100% 0 0)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
                    <option value="true">Premium Yap</option>
                    <option value="false">Premium Kaldır</option>
                  </select>
                  <select name="days" style={{ padding: '0.4rem 0.65rem', border: '1.5px solid var(--color-border)', borderRadius: '6px', fontSize: '0.78rem', background: 'oklch(100% 0 0)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
                    <option value="7">7 gün</option>
                    <option value="30">30 gün</option>
                    <option value="90">90 gün</option>
                    <option value="365">1 yıl</option>
                  </select>
                  <button type="submit" style={{ padding: '0.4rem 0.85rem', background: 'var(--color-header)', color: 'var(--color-text-on-dark)', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Kaydet
                  </button>
                </form>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
