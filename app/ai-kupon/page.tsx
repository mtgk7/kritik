import { createClient } from '@/lib/supabase/server'
import { meta } from '@/lib/metadata'
import AiKuponClient from './AiKuponClient'

export const dynamic = 'force-dynamic'
export const metadata = meta('AI Kupon', 'Kriterlere göre AI destekli kombinasyon kuponu oluştur.')

export default async function AiKuponPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('users').select('is_premium,premium_until').eq('id', user.id).single()
    isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
  }

  return (
    <main style={{ maxWidth: '680px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      {/* Başlık */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🤖</span>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', letterSpacing: '0.03em',
            textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1,
          }}>
            AI Kupon
          </h1>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Güven eşiği ve lig seçerek algoritmamızın en iyi maçlardan oluşturduğu kombinasyon kuponunu al.
        </p>
      </div>

      {isPremium ? (
        <AiKuponClient />
      ) : (
        <div style={{
          padding: '2.5rem 2rem',
          background: 'var(--color-surface)',
          borderRadius: '14px',
          border: '1.5px solid var(--color-border)',
          textAlign: 'center',
        }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <svg width="40" height="49" viewBox="0 0 40 49" fill="none" style={{ margin: '0 auto', display: 'block' }}>
              <rect x="2" y="19" width="36" height="28" rx="6" stroke="var(--color-premium)" strokeWidth="2.5"/>
              <path d="M10 19V13a10 10 0 0 1 20 0v6" stroke="var(--color-premium)" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="20" cy="33" r="4" fill="var(--color-premium)" opacity="0.6"/>
            </svg>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.35rem',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: 'var(--color-text-primary)', lineHeight: 1.1, marginBottom: '0.6rem',
          }}>
            Premium Özellik
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.65, marginBottom: '1.75rem', maxWidth: '380px', margin: '0 auto 1.75rem' }}>
            AI kupon oluşturucu premium üyelere özeldir. Güven eşiği, lig ve maç sayısı kriterlerine göre algoritmamızın kişiselleştirilmiş kombinasyonlarını al.
          </p>
          <a href={user ? '/odeme' : '/kayit'} style={{
            display: 'inline-block',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.92rem', letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'oklch(97% 0.005 255)',
            background: 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
            textDecoration: 'none', borderRadius: '9px', padding: '0.75rem 2rem',
          }}>
            ⭐ {user ? 'Premium Al' : 'Kayıt Ol'}
          </a>
        </div>
      )}
    </main>
  )
}
