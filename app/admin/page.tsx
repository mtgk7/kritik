import { createClient } from '@/lib/supabase/server'
import { Match, Coupon, News } from '@/lib/types'
import {
  deleteMatch, deleteCoupon, deleteNews, triggerBot, triggerScores, sendWeeklyDigest,
  approvePendingApproval, rejectPendingApproval,
  approveCouponPurchase, rejectCouponPurchase,
} from '@/app/actions/admin'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ mesaj?: string; error?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: matches }, { data: coupons }, { data: news },
    { count: toplamUye }, { count: aktifPremium }, { count: yeniUye },
    { count: toplamMac }, { count: yaklasMac },
    { count: dogruTahmin }, { count: toplamTahmin },
    { count: pushAbone }, { count: bekleyenOdeme },
    { data: pendingApprovals },
    { data: couponPurchases },
  ] = await Promise.all([
    supabase.from('matches').select('*').order('match_time', { ascending: false }).limit(20),
    supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(10),
    supabase.from('news').select('*').order('created_at', { ascending: false }).limit(15),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_premium', true).gt('premium_until', new Date().toISOString()),
    supabase.from('users').select('*', { count: 'exact', head: true }).gt('created_at', week),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'yakında'),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('prediction_correct', true),
    supabase.from('matches').select('*', { count: 'exact', head: true }).not('prediction_correct', 'is', null),
    supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }),
    supabase.from('pending_approvals').select('*', { count: 'exact', head: true }),
    supabase.from('pending_approvals').select('*').order('created_at', { ascending: false }),
    supabase.from('coupon_purchases').select('*').eq('status', 'bekliyor').order('created_at', { ascending: false }),
  ])

  const isabetOrani = toplamTahmin ? Math.round(((dogruTahmin ?? 0) / toplamTahmin) * 100) : null
  const convRate    = toplamUye ? Math.round(((aktifPremium ?? 0) / toplamUye) * 100) : 0

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
      {params.error && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)', fontWeight: 500 }}>
          ✗ {params.error}
        </div>
      )}

      {/* Analitik kartlar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1px', background: 'var(--color-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '2.5rem' }}>
        <ACard label="Toplam Üye"    value={toplamUye ?? 0} />
        <ACard label="Aktif Premium" value={aktifPremium ?? 0} color="var(--color-premium)" />
        <ACard label="Dönüşüm"       value={`%${convRate}`} color={convRate >= 20 ? 'var(--color-success)' : 'var(--color-warning)'} />
        <ACard label="Yeni (7 gün)"  value={yeniUye ?? 0} />
        <ACard label="Toplam Maç"    value={toplamMac ?? 0} />
        <ACard label="Yaklaşan"      value={yaklasMac ?? 0} />
        <ACard label="Push Abone"    value={pushAbone ?? 0} />
        <ACard label="Bek. Ödeme"    value={bekleyenOdeme ?? 0} color={(bekleyenOdeme ?? 0) > 0 ? 'var(--color-warning)' : undefined} />
        {isabetOrani !== null && (
          <ACard label="Tahmin İsabet" value={`%${isabetOrani}`} color={isabetOrani >= 60 ? 'var(--color-success)' : 'var(--color-accent)'} />
        )}
      </div>

      {/* Aksiyonlar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '3rem', alignItems: 'center' }}>
        <AdminBtn href="/admin/mac-ekle" label="+ Maç Ekle" primary />
        <AdminBtn href="/admin/kupon-ekle" label="+ Kupon Ekle" />
        <AdminBtn href="/admin/haber-ekle" label="+ Haber Ekle" />
        <AdminBtn href="/admin/kullanicilar" label="Kullanıcılar" />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <form action={sendWeeklyDigest}>
            <button type="submit" style={{
              padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600,
              background: 'var(--color-surface-2)', color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)', borderRadius: '7px', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              ✉ Haftalık Özet
            </button>
          </form>
          <form action={triggerBot}>
            <button type="submit" style={{
              padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600,
              background: 'var(--color-header)', color: 'var(--color-text-on-dark)',
              border: 'none', borderRadius: '7px', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              ▶ Bot Tetikle
            </button>
          </form>
          <form action={triggerScores}>
            <button type="submit" style={{
              padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600,
              background: 'var(--color-success)', color: 'oklch(97% 0.005 255)',
              border: 'none', borderRadius: '7px', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              ⚽ Skorları Tara
            </button>
          </form>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>

        {/* Bekleyen Ödemeler */}
        {(pendingApprovals?.length ?? 0) > 0 && (
          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-warning)', marginBottom: '0.75rem' }}>
              ⚠ Bekleyen Ödemeler ({pendingApprovals!.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1.5px solid var(--color-warning)', borderRadius: '10px', overflow: 'hidden' }}>
              {pendingApprovals!.map((p: { id: string; user_id: string; email: string; days: number; amount_try: number | null; created_at: string }, i: number) => (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
                  gap: '0.75rem', padding: '0.85rem 1rem', alignItems: 'center',
                  borderBottom: i === pendingApprovals!.length - 1 ? 'none' : '1px solid var(--color-border)',
                  background: 'var(--color-base)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.email}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginTop: '0.1rem' }}>
                      {new Date(p.created_at).toLocaleDateString('tr-TR')} · {p.days} gün
                    </div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)', whiteSpace: 'nowrap' }}>
                    {p.amount_try ? `₺${p.amount_try}` : '—'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                    {p.days} gün premium
                  </span>
                  <form action={approvePendingApproval}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="user_id" value={p.user_id} />
                    <input type="hidden" name="days" value={p.days} />
                    <input type="hidden" name="email" value={p.email} />
                    <button type="submit" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'oklch(97% 0.005 255)', background: 'var(--color-success)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                      ✓ Onayla
                    </button>
                  </form>
                  <form action={rejectPendingApproval}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="email" value={p.email} />
                    <button type="submit" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-accent)', background: 'none', border: '1px solid var(--color-accent)', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                      ✗ Reddet
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bekleyen Kupon Talepleri */}
        {(couponPurchases?.length ?? 0) > 0 && (
          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-warning)', marginBottom: '0.75rem' }}>
              🛒 Kupon Talepleri ({couponPurchases!.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1.5px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
              {couponPurchases!.map((p: { id: string; coupon_id: string; email: string; amount_try: number; created_at: string }, i: number) => (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                  gap: '0.75rem', padding: '0.85rem 1rem', alignItems: 'center',
                  borderBottom: i === couponPurchases!.length - 1 ? 'none' : '1px solid var(--color-border)',
                  background: 'var(--color-base)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.email}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginTop: '0.1rem' }}>
                      {new Date(p.created_at).toLocaleDateString('tr-TR')} · Kupon: {p.coupon_id.slice(0, 8)}…
                    </div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)', whiteSpace: 'nowrap' }}>
                    ₺{p.amount_try}
                  </span>
                  <form action={approveCouponPurchase}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="email" value={p.email} />
                    <button type="submit" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'oklch(97% 0.005 255)', background: 'var(--color-success)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                      ✓ Onayla
                    </button>
                  </form>
                  <form action={rejectCouponPurchase}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="email" value={p.email} />
                    <button type="submit" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-accent)', background: 'none', border: '1px solid var(--color-accent)', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                      ✗ Reddet
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

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
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto',
                  gap: '0.75rem', padding: '0.75rem 0', alignItems: 'center',
                  borderBottom: i === matches.length - 1 ? 'none' : '1px solid var(--color-border)',
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.home_team} — {m.away_team}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                    {new Date(m.match_time).toLocaleDateString('tr-TR')}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: m.status === 'canlı' ? 'var(--color-success)' : 'var(--color-text-tertiary)', whiteSpace: 'nowrap', fontWeight: m.status === 'canlı' ? 700 : 400 }}>
                    {m.status}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {m.confidence_score != null ? `%${Math.round(m.confidence_score * 100)}` : '—'}
                  </span>
                  <a href={`/admin/mac-duzenle/${m.id}`} style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-secondary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Düzenle
                  </a>
                  <form action={deleteMatch}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>
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
                  gap: '0.75rem', padding: '0.75rem 0', alignItems: 'center',
                  borderBottom: i === coupons.length - 1 ? 'none' : '1px solid var(--color-border)',
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.coupon_type}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{c.total_rate?.toFixed(2) ?? '—'}</span>
                  <span style={{ fontSize: '0.72rem', color: c.is_premium ? 'var(--color-premium)' : 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                    {c.is_premium ? 'Premium' : 'Ücretsiz'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at).toLocaleDateString('tr-TR')}
                  </span>
                  <form action={deleteCoupon}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>
                      Sil
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Son Haberler */}
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
            Son Haberler
          </h2>
          {!news?.length ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', padding: '1rem 0', borderTop: '1px solid var(--color-border)' }}>Veri yok.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(news as News[]).map((n, i) => (
                <div key={n.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                  gap: '0.75rem', padding: '0.75rem 0', alignItems: 'center',
                  borderBottom: i === news.length - 1 ? 'none' : '1px solid var(--color-border)',
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.title}
                  </span>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                    color: n.is_published ? 'var(--color-success)' : 'var(--color-text-tertiary)',
                    whiteSpace: 'nowrap',
                  }}>
                    {n.is_published ? 'Yayında' : 'Taslak'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                    {new Date(n.created_at).toLocaleDateString('tr-TR')}
                  </span>
                  <form action={deleteNews}>
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>
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

function ACard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: 'var(--color-base)', padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.3rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: color ?? 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  )
}

function AdminBtn({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <a href={href} style={{
      display: 'inline-block', padding: '0.5rem 1rem',
      fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', borderRadius: '7px',
      background: primary ? 'var(--color-accent)' : 'var(--color-surface-2)',
      color: primary ? 'oklch(97% 0.005 255)' : 'var(--color-text-primary)',
      border: primary ? 'none' : '1px solid var(--color-border)',
    }}>
      {label}
    </a>
  )
}
