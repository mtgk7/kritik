import { createClient } from '@/lib/supabase/server'
import { Coupon } from '@/lib/types'
import { meta } from '@/lib/metadata'
import AdSlot from '@/components/AdSlot'
import OnerilerListClient from './OnerilerListClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Öneriler', 'Algoritmanın ürettiği ücretsiz ve premium kombinasyon önerileri.')

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
          Öneriler
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Algoritmanın ürettiği kombinasyon önerileri
        </p>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', lineHeight: 1.6, marginTop: '0.75rem', borderLeft: '3px solid var(--color-border)', paddingLeft: '0.75rem' }}>
          ⚠️ Burada yer alan veriler tamamen istatistiksel analizlerdir, yatırım tavsiyesi niteliği taşımaz ve kesin kazanç garantisi vermez.
        </p>
      </div>

      {/* AI Kupon Builder CTA */}
      <a href="/ai-oneri" style={{ display: 'block', textDecoration: 'none', marginBottom: '2rem' }}>
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
              AI ile Öneri Al
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {isPremium
                ? 'Güven eşiği, lig ve maç sayısı seç — AI kişisel önerini hazırlasın'
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
            AI Önerileri
          </h2>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', paddingLeft: '1.6rem' }}>
          Algoritmanın xG ve form analizine göre ürettiği öneriler
        </p>
      </div>

      <OnerilerListClient
        free={free}
        premium={premium}
        isPremium={isPremium}
        isLoggedIn={!!user}
      />

      {/* Reklam */}
      <AdSlot
        slot={process.env.NEXT_PUBLIC_AD_SLOT_KUPONLAR ?? ''}
        format="fluid"
        layout="in-article"
        style={{ marginTop: '2.5rem', textAlign: 'center' }}
      />
    </main>
  )
}
