import { createClient } from '@/lib/supabase/server'
import { supabaseFetch } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import { Coupon, Match } from '@/lib/types'
import { requestCouponPurchase } from '@/app/actions/admin'

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

export default async function KuponDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ talep?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  // Kupon verisini public client ile çek
  const coupons = await supabaseFetch<Coupon>(`coupons?select=*&id=eq.${id}&limit=1`)
  const coupon = coupons[0] ?? null
  if (!coupon) notFound()

  // Ücretli veya premium kupon → auth ile kontrol
  if (coupon.is_premium || coupon.price_try) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let hasAccess = false

    // Premium abonelik → is_premium kuponlara erişim
    if (coupon.is_premium && user) {
      const { data: profile } = await supabase
        .from('users').select('is_premium,premium_until').eq('id', user.id).single()
      hasAccess = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
    }

    // Bireysel satın alma kontrolü
    let talepBekliyor = false
    if (!hasAccess && coupon.price_try && user) {
      const { data: purchase } = await supabase
        .from('coupon_purchases')
        .select('status')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id)
        .maybeSingle()
      hasAccess = purchase?.status === 'onaylandi'
      talepBekliyor = purchase?.status === 'bekliyor'
    }

    if (!hasAccess) {
      return <PremiumGate coupon={coupon} user={user ?? null} talepGonderildi={talepBekliyor || sp.talep === 'gonderildi'} />
    }
  }

  // Kupondaki maçları public client ile çek
  const matches = coupon.matches.length > 0
    ? await supabaseFetch<Match>(`matches?select=*&id=in.(${coupon.matches.join(',')})`)
    : []
  // Kupon sırasını koru
  const sorted = coupon.matches
    .map(mid => matches.find(m => m.id === mid))
    .filter(Boolean) as Match[]

  const accent = typeColors[coupon.coupon_type] ?? 'var(--color-accent)'
  const label  = typeLabels[coupon.coupon_type] ?? coupon.coupon_type

  const createdAt = new Date(coupon.created_at)
  const dateLabel = createdAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '5rem' }}>

      <a href="/kuponlar" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
        ← Kuponlar
      </a>

      {/* Başlık */}
      <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ width: '4px', height: '28px', borderRadius: '99px', background: accent }} />
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', letterSpacing: '0.03em',
            textTransform: 'uppercase', color: accent, lineHeight: 1,
          }}>
            {label}
          </h1>
          {coupon.is_premium && (
            <span className="badge-premium">⭐ Premium</span>
          )}
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)' }}>
          {dateLabel} · {sorted.length} maç
        </p>
      </div>

      {/* Toplam oran */}
      {coupon.total_rate != null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1.5rem',
          padding: '1.25rem 1.5rem',
          background: 'var(--color-surface-2)',
          borderRadius: '12px',
          marginBottom: '2rem',
          border: '1px solid var(--color-border)',
        }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
              Toplam Oran
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: accent, letterSpacing: '-0.02em' }}>
              {coupon.total_rate.toFixed(2)}
            </div>
          </div>
          <div style={{ width: '1px', height: '48px', background: 'var(--color-border)' }} />
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
              Maç Sayısı
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              {sorted.length}
            </div>
          </div>
        </div>
      )}

      {/* Maçlar */}
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)', marginBottom: '0.75rem',
      }}>
        Kupondaki Maçlar
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {sorted.map((match, i) => {
          const conf = match.confidence_score ?? 0
          const confPct = Math.round(conf * 100)
          const confColor =
            conf >= 0.7 ? 'var(--color-success)' :
            conf >= 0.55 ? 'var(--color-warning)' :
            'var(--color-text-tertiary)'
          const matchDate = new Date(match.match_time)
          const isLast = i === sorted.length - 1

          return (
            <a key={match.id} href={`/maclar/${match.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '1.25rem',
                padding: '1.25rem 0',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                alignItems: 'center',
              }}>
                <div>
                  {/* Takımlar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700,
                      fontSize: 'clamp(1rem, 3vw, 1.25rem)', letterSpacing: '0.02em',
                      textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
                    }}>
                      {match.home_team}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>vs</span>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700,
                      fontSize: 'clamp(1rem, 3vw, 1.25rem)', letterSpacing: '0.02em',
                      textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1,
                    }}>
                      {match.away_team}
                    </span>
                    {match.prediction && (
                      <span className="badge-prediction" style={{ fontSize: '0.72rem' }}>
                        {match.prediction}{match.prediction_confidence ? ` %${match.prediction_confidence}` : ''}
                      </span>
                    )}
                  </div>
                  {/* Tarih + xG */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {matchDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      {' '}
                      {matchDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {match.home_xg != null && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                        xG {match.home_xg.toFixed(2)} / {match.away_xg?.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Güven skoru */}
                {conf > 0 && (
                  <div style={{ textAlign: 'right', minWidth: '60px', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: confColor }}>
                      {confPct}
                    </div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.1rem' }}>
                      Güven
                    </div>
                    <div className="confidence-bar" style={{ marginTop: '0.4rem' }}>
                      <div className="confidence-bar-fill" style={{ width: `${confPct}%`, background: confColor }} />
                    </div>
                  </div>
                )}
              </div>
            </a>
          )
        })}
      </div>

      {sorted.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', padding: '2rem 0' }}>
          Bu kupona ait maç verisi bulunamadı.
        </p>
      )}
    </main>
  )
}

function PremiumGate({
  coupon,
  user,
  talepGonderildi,
}: {
  coupon: Coupon
  user: { id: string; email?: string } | null
  talepGonderildi: boolean
}) {
  return (
    <main style={{ maxWidth: '480px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '4rem', paddingBottom: '5rem', textAlign: 'center' }}>
      <div style={{ marginBottom: '1rem' }}>
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none" style={{ margin: '0 auto', display: 'block' }}>
          <rect x="1" y="16" width="30" height="23" rx="4" stroke="var(--color-premium)" strokeWidth="2"/>
          <path d="M9 16V11a7 7 0 0 1 14 0v5" stroke="var(--color-premium)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem',
        letterSpacing: '0.04em', textTransform: 'uppercase',
        color: 'var(--color-text-primary)', marginBottom: '0.75rem',
      }}>
        Premium İçerik
      </h1>

      {talepGonderildi ? (
        <div style={{ padding: '1.25rem', background: 'var(--color-success-bg)', borderRadius: '10px', border: '1px solid var(--color-success)', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-success)', marginBottom: '0.3rem' }}>✓ Talebiniz alındı!</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Ödeme talimatları için sizi en kısa sürede bilgilendireceğiz.
          </p>
        </div>
      ) : coupon.price_try && user ? (
        <>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Bu kuponu <strong>₺{coupon.price_try}</strong> karşılığında satın alabilirsin.
          </p>
          <form action={requestCouponPurchase} style={{ marginBottom: '1rem' }}>
            <input type="hidden" name="coupon_id" value={coupon.id} />
            <input type="hidden" name="amount_try" value={coupon.price_try} />
            <button type="submit" style={{
              width: '100%', padding: '0.8rem',
              background: 'var(--color-accent)', color: 'oklch(97% 0.005 255)',
              border: 'none', borderRadius: '8px',
              fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer',
            }}>
              Satın Al · ₺{coupon.price_try}
            </button>
          </form>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
            Talebiniz alındıktan sonra ödeme adımı için sizi arayacağız.
          </p>
        </>
      ) : coupon.price_try && !user ? (
        <>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Bu kuponu satın almak için önce giriş yapman gerekiyor.
          </p>
          <a href={`/giris`} style={{
            display: 'inline-block', fontSize: '0.88rem', fontWeight: 600,
            color: 'oklch(97% 0.005 255)', background: 'var(--color-accent)',
            textDecoration: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem',
          }}>
            Giriş Yap
          </a>
        </>
      ) : (
        <>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
            Bu kupon yalnızca premium üyelere açıktır. Yüksek güven skorlu kombinasyonlara erişmek için premium üyeliğe geç.
          </p>
          <a href={user ? '/odeme' : '/kayit'} style={{
            display: 'inline-block', fontSize: '0.88rem', fontWeight: 600,
            color: 'oklch(97% 0.005 255)', background: 'var(--color-accent)',
            textDecoration: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem',
          }}>
            {user ? '⭐ Premium Al' : 'Kayıt Ol'}
          </a>
        </>
      )}
    </main>
  )
}
