import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseFetch } from '@/lib/supabase/public'
import { Match } from '@/lib/types'
import { translateTeam } from '@/lib/team-names'
import { LEAGUE_BY_NAME, leagueSlug } from '@/lib/leagues'

export const revalidate = 3600

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

export function generateMetadata(): Metadata {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tStr = tomorrow.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  const title = `Yarınki Futbol Maç Tahminleri ${tStr} — Kritik`
  const desc  = `${tStr} tarihli futbol maçlarının yapay zeka tahminleri. Süper Lig, Premier Lig, Şampiyonlar Ligi için yarın maç analizi.`
  return {
    title,
    description: desc,
    keywords: 'yarınki futbol tahminleri, yarın maç tahmini, iddaa tahminleri yarın, futbol analizi yarın',
    openGraph: { title, description: desc, url: `${SITE}/tahminler/yarin`, type: 'website' },
    twitter: { card: 'summary', title, description: desc },
    alternates: { canonical: `${SITE}/tahminler/yarin` },
  }
}

export default async function YarinPage() {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const start = new Date(tomorrow); start.setHours(0, 0, 0, 0)
  const end   = new Date(tomorrow); end.setHours(23, 59, 59, 999)

  const matches = await supabaseFetch<Match>(
    `matches?select=id,home_team,away_team,match_time,league_name,prediction,prediction_confidence,confidence_score,status,is_free_preview`
    + `&match_time=gte.${start.toISOString()}&match_time=lte.${end.toISOString()}`
    + `&order=match_time.asc&limit=50`
  )

  const withPred  = matches.filter(m => m.prediction)
  const tomorrowStr = tomorrow.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  const byLeague: Record<string, Match[]> = {}
  for (const m of matches) {
    const k = m.league_name ?? 'Genel'
    if (!byLeague[k]) byLeague[k] = []
    byLeague[k].push(m)
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Yarınki Tahminler', item: `${SITE}/tahminler/yarin` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '5rem' }}>

        <nav style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>Ana Sayfa</Link>
          <span>/</span>
          <Link href="/tahminler/bugun" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>Bugün</Link>
          <span>/</span>
          <span>Yarın</span>
        </nav>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '0.4rem', fontFamily: 'var(--font-display)' }}>
            Yapay Zeka Günlük Analizi
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1, marginBottom: '0.6rem' }}>
            Yarınki Maç<br />Tahminleri
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            {tomorrowStr} · {matches.length} maç · {withPred.length} tahmin
          </p>
        </div>

        {Object.keys(byLeague).length > 0 ? (
          Object.entries(byLeague).map(([lg, ms]) => (
            <section key={lg} style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                  {lg}
                </h2>
                {LEAGUE_BY_NAME[lg] && (
                  <Link href={`/lig/${leagueSlug(lg)}`} style={{ fontSize: '0.72rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
                    Lig sayfası →
                  </Link>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                {ms.map((m, i) => {
                  const conf = m.confidence_score ?? 0
                  const confPct = Math.round(conf * 100)
                  const dt = new Date(m.match_time)
                  return (
                    <Link key={m.id} href={`/maclar/${m.id}`} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center',
                      padding: '0.9rem 1.1rem', textDecoration: 'none',
                      borderBottom: i === ms.length - 1 ? 'none' : '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)', marginBottom: '0.15rem' }}>
                          {translateTeam(m.home_team)} vs {translateTeam(m.away_team)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                          {dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {m.prediction ? (
                          <>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.prediction}</div>
                            {confPct > 0 && <div style={{ fontSize: '0.65rem', fontWeight: 600, color: conf >= 0.65 ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>%{confPct}</div>}
                          </>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>Bekleniyor</div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))
        ) : (
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>Yarın için henüz maç girilmemiş.</p>
            <Link href="/tahminler/bugun" style={{ marginTop: '1rem', display: 'inline-block', fontSize: '0.82rem', color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
              ← Bugünkü tahminlere bak
            </Link>
          </div>
        )}

      </main>
    </>
  )
}
