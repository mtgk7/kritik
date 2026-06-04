import { createClient } from '@/lib/supabase/server'
import { Coupon } from '@/lib/types'
import { meta } from '@/lib/metadata'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Kuponlar', 'Algoritmanın ürettiği ücretsiz ve premium kombinasyon kuponları.')

export default async function KuponlarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { supabaseFetch } = await import('@/lib/supabase/public')
  const coupons = await supabaseFetch<Coupon>('coupons?select=*&order=created_at.desc')

  const free = coupons.filter((c: Coupon) => !c.is_premium)
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

      {/* Premium */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <SectionLabel>Premium</SectionLabel>
          <span className="badge-premium">⭐ Üye ol</span>
        </div>

        {premium.length === 0 ? (
          <EmptySection text="Premium kupon henüz eklenmedi." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {premium.map((c: Coupon, i: number) => (
              <CouponRow key={c.id} coupon={c} isLast={i === premium.length - 1} locked={!user} />
            ))}
          </div>
        )}

        {!user && premium.length > 0 && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.25rem 1.5rem',
            background: 'var(--color-premium-bg)',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                {premium.length} premium kupon mevcut
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Yüksek güven skorlu kombinasyonlara erişmek için üye ol.
              </p>
            </div>
            <a
              href="/kayit"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'oklch(97% 0.005 255)',
                background: 'var(--color-accent)',
                textDecoration: 'none',
                borderRadius: '7px',
                padding: '0.5rem 1.1rem',
                whiteSpace: 'nowrap',
              }}
            >
              Ücretsiz Kayıt Ol
            </a>
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

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: '1.25rem',
      padding: '1.1rem 0',
      borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
      alignItems: 'center',
      opacity: locked ? 0.55 : 1,
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

      {/* Oran */}
      {coupon.total_rate != null && (
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
      )}
    </div>
  )
}
