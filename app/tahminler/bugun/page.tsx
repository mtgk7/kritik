import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseFetch } from '@/lib/supabase/public'
import { Match } from '@/lib/types'
import { translateTeam } from '@/lib/team-names'
import { LEAGUE_BY_NAME, leagueSlug } from '@/lib/leagues'

export const revalidate = 1800

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

export function generateMetadata(): Metadata {
  const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  const title = `Bugünkü Futbol Maç Tahminleri ${today} — Kritik`
  const desc  = `${today} tarihli futbol maçlarının yapay zeka destekli tahminleri. Süper Lig, Premier Lig, Şampiyonlar Ligi ve daha fazlası için günlük analiz.`
  return {
    title,
    description: desc,
    keywords: 'bugünkü futbol tahminleri, günlük maç tahmini, iddaa tahminleri bugün, futbol analizi',
    openGraph: { title, description: desc, url: `${SITE}/tahminler/bugun`, type: 'website' },
    twitter: { card: 'summary', title, description: desc },
    alternates: { canonical: `${SITE}/tahminler/bugun` },
  }
}

export default async function BugunPage() {
  const now   = new Date()
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const end   = new Date(now); end.setHours(23, 59, 59, 999)

  const matches = await supabaseFetch<Match>(
    `matches?select=id,home_team,away_team,match_time,league_name,prediction,prediction_confidence,confidence_score,status,is_free_preview,home_score,away_score`
    + `&match_time=gte.${start.toISOString()}&match_time=lte.${end.toISOString()}`
    + `&order=match_time.asc&limit=50`
  )

  const withPred   = matches.filter(m => m.prediction)
  const highConf   = withPred.filter(m => (m.confidence_score ?? 0) >= 0.65)
  const todayStr   = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  // Lige göre grupla
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
      { '@type': 'ListItem', position: 2, name: 'Günlük Tahminler', item: `${SITE}/tahminler/bugun` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '5rem' }}>

        <nav style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>Ana Sayfa</Link>
          <span>/</span>
          <span>Bugünkü Tahminler</span>
        </nav>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '0.4rem', fontFamily: 'var(--font-display)' }}>
            Yapay Zeka Günlük Analizi
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.1, marginBottom: '0.6rem' }}>
            Bugünkü Maç<br />Tahminleri
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            {todayStr} · {matches.length} maç · {withPred.length} tahmin
          </p>
        </div>

        {/* Öne çıkan yüksek güvenli tahminler */}
        {highConf.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
              Yüksek Güvenli Tahminler
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {highConf.slice(0, 6).map(m => {
                const conf    = m.confidence_score ?? 0
                const confPct = Math.round(conf * 100)
                const confColor = conf >= 0.75 ? 'var(--color-success)' : 'var(--color-warning)'
                return (
                  <Link key={m.id} href={`/maclar/${m.id}`} style={{ textDecoration: 'none', display: 'block', padding: '1.1rem', border: '1.5px solid var(--color-border)', borderRadius: '10px', background: 'var(--color-surface)', transition: 'border-color 0.15s' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>
                      {m.league_name} · {new Date(m.match_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                      {translateTeam(m.home_team)} vs {translateTeam(m.away_team)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', padding: '0.2rem 0.5rem', background: 'var(--color-border)', borderRadius: '5px' }}>{m.prediction}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: confColor }}>%{confPct}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Lige göre tüm maçlar */}
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
                  const conf    = m.confidence_score ?? 0
                  const confPct = Math.round(conf * 100)
                  const dt      = new Date(m.match_time)
                  const isFinished = m.status === 'bitti'
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
                          {m.status === 'canlı' && <span style={{ marginLeft: '0.4rem', color: 'var(--color-accent)', fontWeight: 700 }}>· Canlı</span>}
                          {isFinished && m.home_score != null && <span style={{ marginLeft: '0.4rem' }}>· {m.home_score}–{m.away_score}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {m.prediction ? (
                          <>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.prediction}</div>
                            {confPct > 0 && (
                              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: conf >= 0.65 ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>%{confPct}</div>
                            )}
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
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>Bugün için maç bulunamadı.</p>
          </div>
        )}

        {/* SEO içerik */}
        <section style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--color-surface)', marginTop: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
            Bugünkü Tahminler Nasıl Hesaplanıyor?
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
            Kritik yapay zeka modeli, her gün otomatik olarak yaklaşan maçları analiz eder. Takımların son 5 maç formu,
            karşılıklı maç geçmişi (H2H), ev/deplasman istatistikleri ve eksik oyuncu bilgileri değerlendirilerek
            Claude AI ile tahmin üretilir.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            <Link href="/istatistikler" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>İstatistikler</Link> sayfasından
            geçmiş tahminlerin isabet oranını, <Link href="/takip" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>Takip</Link> sayfasından
            hipotetik P&L geçmişini görebilirsiniz.
          </p>
        </section>

      </main>
    </>
  )
}
