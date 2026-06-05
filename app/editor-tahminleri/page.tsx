import { createClient } from '@/lib/supabase/server'
import { supabaseFetch } from '@/lib/supabase/public'
import { Coupon, Match } from '@/lib/types'
import { meta } from '@/lib/metadata'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Editör Tahminleri', 'Editörlerimizin özenle hazırladığı kupon önerileri ve analizleri.')

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

export default async function EditorTahminleriPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const coupons = await supabaseFetch<Coupon>(
    'coupons?select=*&is_editor_pick=eq.true&order=created_at.desc'
  )

  // Premium kontrolü
  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('users').select('is_premium,premium_until').eq('id', user.id).single()
    isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
  }

  return (
    <main style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '4rem' }}>

      {/* Başlık */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>✍️</span>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.03em',
            textTransform: 'uppercase', color: 'var(--color-premium)',
            lineHeight: 1,
          }}>
            Editör Tahminleri
          </h1>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Editörlerimizin özenle seçtiği kupon önerileri ve yorumları
        </p>
      </div>

      {coupons.length === 0 ? (
        <div style={{ padding: '4rem 0', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-tertiary)' }}>
            Henüz editör tahmini eklenmedi.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {coupons.map(c => (
            <EditorCard key={c.id} coupon={c} unlocked={!c.is_premium || isPremium} />
          ))}
        </div>
      )}
    </main>
  )
}

async function EditorCard({ coupon, unlocked }: { coupon: Coupon; unlocked: boolean }) {
  const matches = coupon.matches.length > 0
    ? await supabaseFetch<Match>(`matches?select=id,home_team,away_team,match_time,league_name,confidence_score,prediction,status&id=in.(${coupon.matches.join(',')})`)
    : []

  const sorted = coupon.matches
    .map(id => matches.find(m => m.id === id))
    .filter(Boolean) as Match[]

  const accent = typeColors[coupon.coupon_type] ?? 'var(--color-premium)'
  const label  = typeLabels[coupon.coupon_type] ?? coupon.coupon_type
  const dateLabel = new Date(coupon.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{
      border: '2px solid var(--color-premium)',
      borderRadius: '14px', overflow: 'hidden',
      background: 'var(--color-premium-bg)',
    }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid oklch(85% 0.06 68 / 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem',
                letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-premium)',
              }}>
                {label}
              </span>
              {coupon.is_premium && (
                <span className="badge-premium">⭐ Premium</span>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
              {dateLabel} · {sorted.length} maç
            </p>
          </div>
          {coupon.total_rate != null && (
            unlocked ? (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.2rem' }}>
                  Toplam Oran
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.25rem', lineHeight: 1, color: 'var(--color-premium)', letterSpacing: '-0.02em' }}>
                  {coupon.total_rate.toFixed(2)}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.25rem', lineHeight: 1, color: 'var(--color-border-strong)', filter: 'blur(8px)', userSelect: 'none' }}>
                  {coupon.total_rate.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-premium)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ⭐ Premium
                </div>
              </div>
            )
          )}
        </div>

        {/* Editör notu */}
        {coupon.editor_note && (
          <div style={{
            marginTop: '0.85rem', paddingTop: '0.85rem',
            borderTop: '1px solid oklch(85% 0.06 68 / 0.25)',
          }}>
            <p style={{
              fontSize: '0.88rem', color: 'var(--color-text-secondary)',
              lineHeight: 1.6, fontStyle: 'italic',
              borderLeft: '3px solid var(--color-premium)', paddingLeft: '0.75rem', margin: 0,
            }}>
              "{coupon.editor_note}"
            </p>
          </div>
        )}
      </div>

      {/* Maçlar */}
      {sorted.length > 0 && (
        <div style={{ padding: '0.25rem 0' }}>
          {sorted.map((m, i) => {
            const conf = m.confidence_score ?? 0
            const confColor = conf >= 0.7 ? 'var(--color-success)' : conf >= 0.55 ? 'var(--color-warning)' : 'var(--color-text-tertiary)'
            const mt = new Date(m.match_time)
            return (
              <a key={m.id} href={`/maclar/${m.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  gap: '1rem', padding: '0.9rem 1.5rem', alignItems: 'center',
                  borderBottom: i === sorted.length - 1 ? 'none' : '1px solid oklch(85% 0.06 68 / 0.2)',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      {m.status === 'canlı' && <span className="badge-live">Canlı</span>}
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                        {m.home_team}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)' }}>vs</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                        {m.away_team}
                      </span>
                      {m.prediction && (
                        <span className="badge-prediction" style={{ fontSize: '0.68rem' }}>
                          {m.prediction}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>
                      {m.league_name} · {mt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} {mt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {conf > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: confColor }}>
                        {Math.round(conf * 100)}
                      </div>
                      <div style={{ fontSize: '0.58rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Güven
                      </div>
                    </div>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}

      {/* Premium lock CTA */}
      {!unlocked && (
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid oklch(85% 0.06 68 / 0.25)', display: 'flex', justifyContent: 'center' }}>
          <a href="/hizmetler" style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.88rem', letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'oklch(97% 0.005 255)',
            background: 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
            textDecoration: 'none', borderRadius: '8px', padding: '0.6rem 1.75rem',
          }}>
            ⭐ Premium Ol — Oranı Gör
          </a>
        </div>
      )}
    </div>
  )
}
