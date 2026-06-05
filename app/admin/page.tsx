import { createClient } from '@/lib/supabase/server'
import { Match, Coupon } from '@/lib/types'
import { deleteMatch, deleteCoupon } from '@/app/actions/admin'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ mesaj?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const [{ data: matches }, { data: coupons }] = await Promise.all([
    supabase.from('matches').select('*').order('match_time', { ascending: false }).limit(20),
    supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <main style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1 }}>
          Admin
        </h1>
      </div>

      {params.mesaj && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--color-success-bg)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 500 }}>
          ✓ {params.mesaj}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '3rem' }}>
        <AdminBtn href="/admin/mac-ekle" label="+ Maç Ekle" primary />
        <AdminBtn href="/admin/kupon-ekle" label="+ Kupon Ekle" />
        <AdminBtn href="/admin/haber-ekle" label="+ Haber Ekle" />
        <AdminBtn href="/admin/kullanicilar" label="Kullanıcılar" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

        {/* Son Maçlar */}
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
            Son Maçlar
          </h2>
          {!matches?.length ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', padding: '1rem 0', borderTop: '1px solid var(--color-border)' }}>Veri yok.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(matches as Match[]).map((m, i) => (
                <div key={m.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
                  gap: '1rem', padding: '0.75rem 0', alignItems: 'center',
                  borderBottom: i === matches.length - 1 ? 'none' : '1px solid var(--color-border)',
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {m.home_team} — {m.away_team}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                    {new Date(m.match_time).toLocaleDateString('tr-TR')}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {m.confidence_score != null ? `%${Math.round(m.confidence_score * 100)}` : '—'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {m.prediction ?? '—'}
                  </span>
                  <form action={deleteMatch}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" style={{
                      fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-accent)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem',
                      fontFamily: 'var(--font-body)',
                    }}>
                      Sil
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Son Kuponlar */}
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
            Son Kuponlar
          </h2>
          {!coupons?.length ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', padding: '1rem 0', borderTop: '1px solid var(--color-border)' }}>Veri yok.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(coupons as Coupon[]).map((c, i) => (
                <div key={c.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
                  gap: '1rem', padding: '0.75rem 0', alignItems: 'center',
                  borderBottom: i === coupons.length - 1 ? 'none' : '1px solid var(--color-border)',
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {c.coupon_type}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {c.total_rate?.toFixed(2) ?? '—'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: c.is_premium ? 'var(--color-premium)' : 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                    {c.is_premium ? 'Premium' : 'Ücretsiz'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at).toLocaleDateString('tr-TR')}
                  </span>
                  <form action={deleteCoupon}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" style={{
                      fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-accent)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem',
                      fontFamily: 'var(--font-body)',
                    }}>
                      Sil
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}

function AdminBtn({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        padding: '0.5rem 1rem',
        fontSize: '0.82rem',
        fontWeight: 600,
        textDecoration: 'none',
        borderRadius: '7px',
        background: primary ? 'var(--color-accent)' : 'var(--color-surface-2)',
        color: primary ? 'oklch(97% 0.005 255)' : 'var(--color-text-primary)',
        border: primary ? 'none' : '1px solid var(--color-border)',
      }}
    >
      {label}
    </a>
  )
}
