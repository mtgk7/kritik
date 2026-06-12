import { supabaseFetch } from '@/lib/supabase/public'
import { createClient } from '@/lib/supabase/server'
import { Match, News } from '@/lib/types'
import { meta } from '@/lib/metadata'
import NewsSidebar from '@/components/NewsSidebar'
import AdSlot from '@/components/AdSlot'
import MatchListClient from '@/components/MatchListClient'
import { CACHE } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('Maçlar', 'Yaklaşan maçların xG, form ve güven skoru analizleri.')

export default async function HomePage() {
  const [matches, latestNews] = await Promise.all([
    supabaseFetch<Match>('matches?select=*&status=neq.bitti&order=match_time.asc', CACHE.MATCHES),
    supabaseFetch<News>('news?select=*&is_published=eq.true&order=published_at.desc&limit=8', CACHE.NEWS),
  ])

  let isPremium = false
  let favTeams: string[] = []
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('is_premium,premium_until,notif_teams')
        .eq('id', user.id)
        .single()
      isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
      favTeams  = profile?.notif_teams ?? []
    }
  } catch {}

  return (
    <main style={{ padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <div className={latestNews.length > 0 ? 'home-grid' : undefined}>

        {/* Sol: Maçlar */}
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.03em',
              textTransform: 'uppercase', color: 'var(--color-text-primary)',
              lineHeight: 1, marginBottom: '0.4rem',
            }}>
              Maçlar
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Algoritma analizi tamamlanan yaklaşan maçlar
            </p>
          </div>

          {matches.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <MatchListClient matches={matches} isPremium={isPremium} favTeams={favTeams} />
              <div style={{ marginTop: '2.5rem' }}>
                <AdSlot
                  slot={process.env.NEXT_PUBLIC_AD_SLOT_FEED ?? ''}
                  format="fluid"
                  layoutKey="-fb+5w+4e-db+86"
                />
              </div>
            </>
          )}
        </div>

        {/* Sağ: Haberler + Reklam */}
        {latestNews.length > 0 && (
          <div className="home-sidebar" style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <NewsSidebar news={latestNews} />
            <AdSlot
              slot={process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR ?? ''}
              format="autorelaxed"
            />
          </div>
        )}
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <div style={{ padding: '4rem 0', borderTop: '1px solid var(--color-border)' }}>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem',
        textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-tertiary)',
        display: 'block', marginBottom: '0.5rem',
      }}>
        Maç Yok
      </span>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', maxWidth: '36ch' }}>
        Algoritma henüz maç analizi üretmedi.
      </p>
    </div>
  )
}
