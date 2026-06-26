import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseFetch } from '@/lib/supabase/public'
import { LEAGUE_BY_SLUG, LEAGUES } from '@/lib/leagues'
import { Match } from '@/lib/types'
import { translateTeam } from '@/lib/team-names'

export const revalidate = 3600

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

export async function generateStaticParams() {
  return LEAGUES.map(l => ({ slug: l.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const league = LEAGUE_BY_SLUG[slug]
  if (!league) return {}
  const title       = `${league.name} Tahminleri ve Maç Analizleri — Kritik`
  const description = league.description
  return {
    title,
    description,
    keywords: league.keywords.join(', '),
    openGraph: {
      title, description, url: `${SITE}/lig/${slug}`, type: 'website',
      images: [{ url: `${SITE}/icon-512.png`, width: 512, height: 512 }],
    },
    twitter: { card: 'summary', title, description },
    alternates: { canonical: `${SITE}/lig/${slug}` },
  }
}

function isPredCorrect(m: Match): boolean | null {
  if (m.prediction_correct !== null && m.prediction_correct !== undefined) return m.prediction_correct
  if (!m.prediction || m.home_score == null || m.away_score == null) return null
  const p = m.prediction.toLowerCase()
  const h = m.home_score, a = m.away_score
  if (p === 'ms1') return h > a
  if (p === 'ms2') return a > h
  if (p === 'x')   return h === a
  if (p.includes('2.5 üst')) return h + a > 2
  if (p.includes('2.5 alt')) return h + a <= 2
  if (p.includes('kg var'))  return h > 0 && a > 0
  if (p.includes('kg yok'))  return h === 0 || a === 0
  return null
}

export default async function LigPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const league = LEAGUE_BY_SLUG[slug]
  if (!league) notFound()

  const now = new Date().toISOString()

  const [upcoming, finished] = await Promise.all([
    supabaseFetch<Match>(
      `matches?select=id,home_team,away_team,match_time,prediction,prediction_confidence,confidence_score,status,is_free_preview,alternatives`
      + `&league_name=eq.${encodeURIComponent(league.name)}`
      + `&or=(status.eq.yakında,status.eq.canlı)`
      + `&order=match_time.asc&limit=20`
    ),
    supabaseFetch<Match>(
      `matches?select=id,home_team,away_team,match_time,prediction,confidence_score,home_score,away_score,prediction_correct`
      + `&league_name=eq.${encodeURIComponent(league.name)}`
      + `&status=eq.bitti&prediction=not.is.null&home_score=not.is.null`
      + `&order=match_time.desc&limit=30`
    ),
  ])

  const evaluated = finished.map(m => ({ ...m, _correct: isPredCorrect(m) })).filter(m => m._correct !== null)
  const total    = evaluated.length
  const correct  = evaluated.filter(m => m._correct).length
  const pct      = total > 0 ? Math.round(correct / total * 100) : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE },
      { '@type': 'ListItem', position: 2, name: `${league.name} Tahminleri`, item: `${SITE}/lig/${slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '5rem' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>Ana Sayfa</Link>
          <span>/</span>
          <span>{league.name}</span>
        </nav>

        {/* Başlık */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '0.4rem', fontFamily: 'var(--font-display)' }}>
            {league.country} · Yapay Zeka Analizi
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1.8rem, 5vw, 3rem)', letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '0.75rem' }}>
            {league.name}<br />Tahminleri
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', maxWidth: '600px', lineHeight: 1.6 }}>
            {league.description}
          </p>
        </div>

        {/* İstatistik özeti */}
        {pct !== null && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--color-border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '2.5rem' }}>
            {[
              { label: 'Analiz Edilen', value: String(total) },
              { label: 'Doğru Tahmin', value: String(correct) },
              { label: 'İsabet Oranı', value: `%${pct}`, color: pct >= 65 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-accent)' },
            ].map(k => (
              <div key={k.label} style={{ padding: '1.25rem', background: 'var(--color-surface)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', color: (k as { color?: string }).color ?? 'var(--color-text-primary)', lineHeight: 1 }}>{k.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Yaklaşan maçlar */}
        {upcoming.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
              Yaklaşan Maçlar
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
              {upcoming.map((m, i) => {
                const conf    = m.confidence_score ?? 0
                const confPct = Math.round(conf * 100)
                const dt      = new Date(m.match_time)
                const confColor = conf >= 0.7 ? 'var(--color-success)' : conf >= 0.55 ? 'var(--color-warning)' : 'var(--color-text-tertiary)'
                return (
                  <Link key={m.id} href={`/maclar/${m.id}`} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center',
                    padding: '1rem 1.25rem', textDecoration: 'none',
                    borderBottom: i === upcoming.length - 1 ? 'none' : '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    transition: 'background 0.1s',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                        {translateTeam(m.home_team)} vs {translateTeam(m.away_team)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>
                        {dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · {dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        {m.status === 'canlı' && <span className="badge-live" style={{ marginLeft: '0.5rem' }}>Canlı</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {m.prediction ? (
                        <>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.prediction}</div>
                          {confPct > 0 && <div style={{ fontSize: '0.68rem', color: confColor, fontWeight: 600 }}>%{confPct}</div>}
                        </>
                      ) : (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>Analiz bekleniyor</div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {upcoming.length === 0 && (
          <div style={{ padding: '3rem 0', textAlign: 'center', borderTop: '1px solid var(--color-border)', marginBottom: '2.5rem' }}>
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>Bu lig için yaklaşan maç bulunmuyor.</p>
          </div>
        )}

        {/* Son sonuçlar */}
        {evaluated.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
              Son Sonuçlar
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {evaluated.slice(0, 8).map(m => (
                <Link key={m.id} href={`/maclar/${m.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.7rem 1rem', borderRadius: '8px', textDecoration: 'none',
                  background: m._correct ? 'oklch(54% 0.18 145 / 0.06)' : 'var(--color-surface)',
                  border: `1px solid ${m._correct ? 'oklch(54% 0.18 145 / 0.15)' : 'var(--color-border)'}`,
                }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                    background: m._correct ? 'var(--color-success)' : 'var(--color-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.55rem', fontWeight: 800, color: 'oklch(97% 0.005 255)' }}>
                    {m._correct ? '✓' : '✗'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {translateTeam(m.home_team)} {m.home_score}–{m.away_score} {translateTeam(m.away_team)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginLeft: '0.5rem' }}>· {m.prediction}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* SEO metin bloğu */}
        <section style={{ padding: '2rem', border: '1px solid var(--color-border)', borderRadius: '12px', background: 'var(--color-surface)', marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
            {league.name} Nasıl Analiz Ediliyor?
          </h2>
          <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <p>
              Kritik, {league.name} maçlarını <strong>yapay zeka destekli istatistiksel model</strong> ile analiz eder.
              Her maç için son 5 maç form verileri, ev/deplasman istatistikleri ve karşılıklı maç geçmişi (H2H) değerlendirilerek
              <strong> MS1, MS2, X (beraberlik), 2.5 Üst/Alt ve Karşılıklı Gol</strong> tahminleri üretilir.
            </p>
            <p>
              Model, <strong>xG (beklenen gol)</strong> verilerini ve Dixon-Coles Poisson dağılımını kullanarak
              her sonucun matematiksel olasılığını hesaplar. Güven skoru %55 üzeri tahminler &quot;Değerli Tahmin&quot; olarak işaretlenir.
            </p>
            <p>
              {pct !== null
                ? `${league.name} için şu ana kadar ${total} maç analiz edildi ve %${pct} isabet oranına ulaşıldı.`
                : `${league.name} maçları her gün otomatik olarak analiz edilir ve tahminler maç öncesi yayımlanır.`}
              {' '}Tüm tahminler <Link href="/sonuclar" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>Sonuçlar</Link> sayfasından takip edilebilir.
            </p>
          </div>
        </section>

        {/* Diğer ligler */}
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
            Diğer Ligler
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {LEAGUES.filter(l => l.slug !== slug).map(l => (
              <Link key={l.slug} href={`/lig/${l.slug}`} style={{
                padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                border: '1.5px solid var(--color-border)', color: 'var(--color-text-secondary)',
                textDecoration: 'none', background: 'var(--color-surface)', transition: 'all 0.15s',
              }}>
                {l.name}
              </Link>
            ))}
          </div>
        </section>

      </main>
    </>
  )
}
