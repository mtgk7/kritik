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

  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [coupons, { data: pastMatches }] = await Promise.all([
    supabaseFetch<Coupon>('coupons?select=*&is_editor_pick=eq.true&order=created_at.desc'),
    supabase.from('matches')
      .select('prediction_correct')
      .eq('status', 'bitti')
      .not('prediction_correct', 'is', null)
      .gte('match_time', week),
  ])
  const toplamTahmin = pastMatches?.length ?? 0
  const dogruTahmin  = pastMatches?.filter(m => m.prediction_correct).length ?? 0
  const haftalikIsabet = toplamTahmin >= 3 ? Math.round((dogruTahmin / toplamTahmin) * 100) : null

  // Premium kontrolü — tüm sayfa premium'a kilitli
  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('users').select('is_premium,premium_until').eq('id', user.id).single()
    isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
  }

  if (!isPremium) {
    return (
      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--page-pad)' }}>
        <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <svg width="40" height="49" viewBox="0 0 40 49" fill="none" style={{ margin: '0 auto', display: 'block' }}>
              <rect x="2" y="20" width="36" height="27" rx="5.5" stroke="var(--color-premium)" strokeWidth="2.5"/>
              <path d="M10 20V13a10 10 0 0 1 20 0v7" stroke="var(--color-premium)" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-premium)', marginBottom: '0.75rem' }}>
            Premium Özelliği
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', letterSpacing: '0.03em',
            textTransform: 'uppercase', color: 'var(--color-text-primary)',
            lineHeight: 1.05, marginBottom: '0.75rem',
          }}>
            Editör Tahminleri
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.65, marginBottom: '2rem' }}>
            Editörlerimizin özenle hazırladığı kupon önerileri ve analizleri yalnızca premium üyelere özeldir.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem', textAlign: 'left' }}>
            {[
              'Editörden günlük kupon seçkileri',
              'xG ve form bazlı derin analizler',
              'Haftalık isabet istatistikleri',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <span style={{ color: 'var(--color-premium)', fontWeight: 700, flexShrink: 0 }}>⭐</span>
                {item}
              </div>
            ))}
          </div>
          <a href="/odeme" style={{
            display: 'inline-block', width: '100%',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'oklch(97% 0.005 255)',
            background: 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
            textDecoration: 'none', borderRadius: '10px', padding: '0.85rem 2rem',
            boxShadow: '0 4px 14px oklch(30% 0.1 35 / 0.45)',
          }}>
            ⭐ Premium Ol →
          </a>
          {!user && (
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
              Zaten üye misin?{' '}
              <a href="/giris?sonra=editor-tahminleri" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
                Giriş Yap
              </a>
            </p>
          )}
        </div>
      </main>
    )
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

      {/* Haftalık isabet */}
      {haftalikIsabet !== null && (
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.25rem 1.75rem', display: 'inline-flex', flexDirection: 'column', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.35rem' }}>
            Bu Hafta İsabet
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '3rem', lineHeight: 1,
            color: haftalikIsabet >= 60 ? 'var(--color-success)' : haftalikIsabet >= 45 ? 'var(--color-warning)' : 'var(--color-accent)',
          }}>
            %{haftalikIsabet}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginTop: '0.3rem' }}>
            {dogruTahmin}/{toplamTahmin} tahmin doğru
          </div>
        </div>
      )}

      {/* Yasal uyarı */}
      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', lineHeight: 1.6, marginBottom: '2rem', borderLeft: '3px solid var(--color-border)', paddingLeft: '0.75rem' }}>
        ⚠️ Burada yer alan veriler tamamen istatistiksel analizlerdir, yatırım tavsiyesi niteliği taşımaz ve kesin kazanç garantisi vermez.
      </p>

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

      {/* Maçlar — sadece erişimi olan görür */}
      {unlocked && sorted.length > 0 && (
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

      {/* Kilitli kupon — içerik tamamen gizli */}
      {!unlocked && (
        <div style={{ padding: '1.5rem', borderTop: '1px solid oklch(85% 0.06 68 / 0.25)', textAlign: 'center' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <svg width="22" height="27" viewBox="0 0 22 27" fill="none" style={{ margin: '0 auto', display: 'block' }}>
              <rect x="1" y="10" width="20" height="16" rx="3.5" stroke="var(--color-premium)" strokeWidth="1.6"/>
              <path d="M5.5 10V7a5.5 5.5 0 0 1 11 0v3" stroke="var(--color-premium)" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Bu kuponu görmek için premium üyelik gereklidir.
          </p>
          <a href="/hizmetler" style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.88rem', letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'oklch(97% 0.005 255)',
            background: 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
            textDecoration: 'none', borderRadius: '8px', padding: '0.6rem 1.75rem',
            display: 'inline-block',
          }}>
            ⭐ Premium Ol
          </a>
        </div>
      )}
    </div>
  )
}
