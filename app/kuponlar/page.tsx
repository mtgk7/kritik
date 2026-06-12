import { createClient } from '@/lib/supabase/server'
import { Coupon } from '@/lib/types'
import { meta } from '@/lib/metadata'
import { requestCouponPurchase } from '@/app/actions/admin'
import AdSlot from '@/components/AdSlot'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Kuponlar', 'Algoritmanın ürettiği ücretsiz ve premium kombinasyon kuponları.')

export default async function KuponlarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('users').select('is_premium,premium_until').eq('id', user.id).single()
    isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
  }

  const { supabaseFetch } = await import('@/lib/supabase/public')
  const coupons = await supabaseFetch<Coupon>('coupons?select=*&is_editor_pick=eq.false&order=created_at.desc')

  const free    = coupons.filter((c: Coupon) => !c.is_premium)
  const premium = coupons.filter((c: Coupon) => c.is_premium)

  return (
    <main style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '4rem' }}>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          color: 'var(--color-text-primary)',
          lineHeight: 1,
          marginBottom: '0.4rem',
        }}>
          Kuponlar
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Algoritmanın ürettiği kombinasyon önerileri
        </p>
      </div>

      {/* AI Kupon Builder CTA */}
      <a href="/ai-kupon" style={{ display: 'block', textDecoration: 'none', marginBottom: '2rem' }}>
        <div style={{
          padding: '1.1rem 1.5rem',
          borderRadius: '12px',
          background: isPremium ? 'var(--color-surface)' : 'var(--color-surface-2)',
          border: `1.5px solid ${isPremium ? 'var(--color-accent)' : 'var(--color-border)'}`,
          display: 'flex', alignItems: 'center', gap: '1rem',
          transition: 'border-color 0.15s',
        }}>
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.15rem' }}>
              AI ile Kupon Oluştur
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {isPremium
                ? 'Güven eşiği, lig ve maç sayısı seç — AI kişisel kuponunu hazırlasın'
                : 'Premium üyelere özel · Kendi kriterlerinle AI destekli kombinasyon'}
            </div>
          </div>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '1.1rem', flexShrink: 0 }}>→</span>
        </div>
      </a>

      {/* AI Hazır Kuponlar başlık */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
          <span style={{ fontSize: '1rem' }}>🤖</span>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem',
            letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)',
          }}>
            AI Hazır Kuponlar
          </h2>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', paddingLeft: '1.6rem' }}>
          Algoritmanın xG ve form analizine göre ürettiği kuponlar
        </p>
      </div>

      {/* Ücretsiz */}
      <section style={{ marginBottom: '3rem' }}>
        <SectionLabel>Ücretsiz</SectionLabel>
        {free.length === 0 ? (
          <EmptySection text="Henüz ücretsiz kupon yok." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {free.map((c: Coupon, i: number) => (
              <CouponRow key={c.id} coupon={c} isLast={i === free.length - 1} />
            ))}
          </div>
        )}
      </section>

      {/* Reklam */}
      <AdSlot
        slot={process.env.NEXT_PUBLIC_AD_SLOT_KUPONLAR ?? ''}
        format="fluid"
        layout="in-article"
        style={{ marginBottom: '2.5rem', textAlign: 'center' }}
      />

      {/* Premium */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <SectionLabel>Premium</SectionLabel>
          {!isPremium && <span className="badge-premium">⭐ Üye ol</span>}
        </div>

        {premium.length === 0 ? (
          <EmptySection text="Premium kupon henüz eklenmedi." />
        ) : isPremium ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {premium.map((c: Coupon, i: number) => (
              <CouponRow key={c.id} coupon={c} isLast={i === premium.length - 1} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Ayrı satın alınabilir kuponlar */}
            {premium.filter((c: Coupon) => c.price_try).map((c: Coupon) => (
              <div key={c.id} style={{
                padding: '1.25rem 1.5rem',
                background: 'var(--color-surface)',
                borderRadius: '12px',
                border: '1.5px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                    {c.coupon_type}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    {c.matches.length} maç {c.total_rate ? `· Oran ${c.total_rate.toFixed(2)}` : ''}
                  </div>
                </div>
                <form action={requestCouponPurchase} style={{ margin: 0 }}>
                  <input type="hidden" name="coupon_id" value={c.id} />
                  <input type="hidden" name="amount_try" value={c.price_try!} />
                  <button type="submit" style={{
                    padding: '0.55rem 1.1rem',
                    background: 'var(--color-accent)',
                    color: 'oklch(97% 0.005 255)',
                    border: 'none', borderRadius: '8px',
                    fontSize: '0.85rem', fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                    Satın Al · ₺{c.price_try}
                  </button>
                </form>
              </div>
            ))}

            {/* Premium üyelik gerektiren kuponlar (fiyatsız) */}
            {premium.some((c: Coupon) => !c.price_try) && (
              <div style={{
                padding: '2rem 1.5rem',
                background: 'var(--color-premium-bg)',
                borderRadius: '12px',
                border: '2px solid var(--color-border)',
                textAlign: 'center',
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <svg width="28" height="34" viewBox="0 0 28 34" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                    <rect x="1" y="13" width="26" height="20" rx="4" stroke="var(--color-premium)" strokeWidth="1.8"/>
                    <path d="M7 13V9a7 7 0 0 1 14 0v4" stroke="var(--color-premium)" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
                  {premium.filter((c: Coupon) => !c.price_try).length} Premium Kupon Daha Mevcut
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  Tüm premium kuponlara erişmek için premium üyeliğe geç.
                </p>
                <a href={user ? '/odeme' : '/kayit'} style={{
                  display: 'inline-block', fontSize: '0.88rem', fontWeight: 700,
                  color: 'oklch(97% 0.005 255)',
                  background: 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
                  textDecoration: 'none', borderRadius: '8px', padding: '0.65rem 1.75rem',
                }}>
                  ⭐ {user ? 'Premium Al' : 'Kayıt Ol'}
                </a>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--color-text-tertiary)',
      marginBottom: '0.75rem',
    }}>
      {children}
    </div>
  )
}

function EmptySection({ text }: { text: string }) {
  return (
    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', padding: '1.5rem 0', borderTop: '1px solid var(--color-border)' }}>
      {text}
    </p>
  )
}

const typeLabels: Record<string, string> = {
  'Banko':           'Banko',
  'xG Canavarı':     'xG Canavarı',
  'Premium Sürpriz': 'Sürpriz',
}

const typeColors: Record<string, string> = {
  'Banko':           'var(--color-success)',
  'xG Canavarı':     'oklch(52% 0.18 240)',
  'Premium Sürpriz': 'var(--color-premium)',
}

function CouponRow({ coupon, isLast, locked }: { coupon: Coupon; isLast: boolean; locked?: boolean }) {
  const accentColor = typeColors[coupon.coupon_type] ?? 'var(--color-text-tertiary)'
  const inner = (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: '1.25rem',
      padding: '1.1rem 0',
      borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
      alignItems: 'center',
    }}>
      {/* Tip renk çizgisi + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: '3px', height: '36px', borderRadius: '99px', background: accentColor, flexShrink: 0 }} />
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--color-text-primary)',
            lineHeight: 1.1,
          }}>
            {typeLabels[coupon.coupon_type] ?? coupon.coupon_type}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.15rem' }}>
            {coupon.matches.length} maç
          </div>
        </div>
      </div>

      {/* Boş orta */}
      <div />

      {/* Oran — kilitliyse lock göster */}
      {locked ? (
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.75rem',
            lineHeight: 1,
            color: 'var(--color-border-strong)',
            letterSpacing: '-0.01em',
            filter: 'blur(6px)',
            userSelect: 'none',
          }}>
            {coupon.total_rate != null ? coupon.total_rate.toFixed(2) : '—'}
          </div>
          <div style={{
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--color-premium)',
            display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            <svg width="9" height="11" viewBox="0 0 9 11" fill="none" style={{ flexShrink: 0 }}>
              <rect x="0.5" y="4.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M2.5 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Premium
          </div>
        </div>
      ) : coupon.total_rate != null ? (
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.75rem',
            lineHeight: 1,
            color: accentColor,
            letterSpacing: '-0.01em',
          }}>
            {coupon.total_rate.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.15rem' }}>
            Oran
          </div>
        </div>
      ) : null}
    </div>
  )

  if (locked) return inner
  return (
    <a href={`/kuponlar/${coupon.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {inner}
    </a>
  )
}

function EditorCouponRow({ coupon, isLast, locked }: { coupon: Coupon; isLast: boolean; locked?: boolean }) {
  const inner = (
    <div style={{
      padding: '1.1rem 1.25rem',
      borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
      background: 'var(--color-premium-bg)',
      borderRadius: isLast ? '0 0 10px 10px' : '0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
              letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-premium)',
            }}>
              {typeLabels[coupon.coupon_type] ?? coupon.coupon_type}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
              {coupon.matches.length} maç
            </span>
            {coupon.is_premium && (
              <span className="badge-premium">⭐ Premium</span>
            )}
          </div>
          {coupon.editor_note && (
            <p style={{
              fontSize: '0.8rem', color: 'var(--color-text-secondary)',
              lineHeight: 1.5, fontStyle: 'italic',
              borderLeft: '2px solid var(--color-premium)',
              paddingLeft: '0.6rem',
              margin: 0,
            }}>
              "{coupon.editor_note}"
            </p>
          )}
        </div>

        {/* Oran */}
        {locked ? (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: 'var(--color-border-strong)', filter: 'blur(6px)', userSelect: 'none' }}>
              {coupon.total_rate?.toFixed(2) ?? '—'}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-premium)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Premium</div>
          </div>
        ) : coupon.total_rate != null ? (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: 'var(--color-premium)', letterSpacing: '-0.01em' }}>
              {coupon.total_rate.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.1rem' }}>Oran</div>
          </div>
        ) : null}
      </div>
    </div>
  )

  if (locked) return inner
  return (
    <a href={`/kuponlar/${coupon.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {inner}
    </a>
  )
}
