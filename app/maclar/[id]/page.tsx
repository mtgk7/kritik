import { supabaseFetch } from '@/lib/supabase/public'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Match, Last5Data, MatchOdds } from '@/lib/types'
import LiveScoreClient from '@/components/LiveScoreClient'
import ShareButtons from '@/components/ShareButtons'
import { toggleFavorite } from '@/app/actions/favorites'
import { translateTeam, translateText } from '@/lib/team-names'
import OzelAnalizClient from '@/components/OzelAnalizClient'
import AdSlot from '@/components/AdSlot'
import HatirlatButton from '@/components/HatirlatButton'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const rows = await supabaseFetch<Match>(`matches?select=home_team,away_team,match_time,league_name,confidence_score,prediction&id=eq.${id}&limit=1`)
  const m = rows[0]
  if (!m) return {}
  const conf   = m.confidence_score ? ` · %${Math.round(m.confidence_score * 100)} güven` : ''
  const pred   = m.prediction ? ` · Tahmin: ${m.prediction}` : ''
  const title  = `${m.home_team} vs ${m.away_team} — Kritik`
  const desc   = `${m.league_name ?? ''}${conf}${pred} · AI destekli maç analizi`
  const ogImg  = `${SITE}/icon-512.png`
  return {
    title,
    description: desc,
    openGraph: {
      title, description: desc, url: `${SITE}/maclar/${id}`, type: 'website',
      images: [{ url: ogImg, width: 512, height: 512, alt: title }],
    },
    twitter: { card: 'summary', title, description: desc, images: [ogImg] },
  }
}

export default async function MacDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  type NewsRow = { id: string; title: string; published_at: string; url: string | null }
  const [rows, oddsRows] = await Promise.all([
    supabaseFetch<Match>(`matches?select=*&id=eq.${id}&limit=1`),
    supabaseFetch<MatchOdds>(`match_odds?select=*&match_id=eq.${id}&order=scraped_at.desc&limit=9`),
  ])
  const m = rows[0] ?? null
  if (!m) notFound()

  // Her kaynak için en güncel oranı al
  const latestOdds: Partial<Record<string, MatchOdds>> = {}
  for (const o of oddsRows) {
    if (!latestOdds[o.source]) latestOdds[o.source] = o
  }

  // Premium erişim kontrolü: vitrin maçı herkese açık, değilse premium üyelik gerekir
  let isPremium = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('is_premium,premium_until')
        .eq('id', user.id)
        .single()
      isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
    }
  } catch {}
  const unlocked = m.is_free_preview || isPremium

  // Favori + mevcut özel analiz kontrolü
  // İlgili haberler
  let relatedNews: NewsRow[] = []
  try {
    const ht = encodeURIComponent(m.home_team), at = encodeURIComponent(m.away_team)
    relatedNews = await supabaseFetch<NewsRow>(
      `news?select=id,title,published_at,url&is_published=eq.true`
      + `&or=(title.ilike.*${ht}*,title.ilike.*${at}*)`
      + `&order=published_at.desc&limit=3`
    )
  } catch {}

  let isFavorite = false
  let existingAnalysis: string | null = null
  try {
    const supabase2 = await createClient()
    const { data: { user: u2 } } = await supabase2.auth.getUser()
    if (u2) {
      const { data: fav } = await supabase2.from('favorites').select('id').eq('user_id', u2.id).eq('match_id', m.id).maybeSingle()
      isFavorite = !!fav
      if (isPremium) {
        const { data: ar } = await supabase2.from('match_analysis_requests').select('analysis').eq('user_id', u2.id).eq('match_id', m.id).maybeSingle()
        existingAnalysis = ar?.analysis ?? null
      }
    }
  } catch {}

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')

  const conf    = m.confidence_score ?? 0
  const confPct = Math.round(conf * 100)
  const confColor =
    conf >= 0.7  ? 'var(--color-success)'  :
    conf >= 0.55 ? 'var(--color-warning)'  :
    'var(--color-text-tertiary)'

  const isLive     = m.status === 'canlı'
  const isFinished = m.status === 'bitti'
  const hasScore   = isFinished && m.home_score != null && m.away_score != null
  const matchDate  = new Date(m.match_time)

  // Tahmin dağılımı — ana + alternatifler (kilitliyse nötr placeholder)
  const allPreds: { prediction: string; confidence: number }[] = []
  if (m.prediction && m.prediction_confidence) {
    allPreds.push({ prediction: m.prediction, confidence: m.prediction_confidence })
  }
  ;(m.alternatives ?? []).forEach(a => allPreds.push(a))

  // Piyasa etiketi — farklı marketleri ayırt etmek için
  function getPredMarket(p: string): string {
    const u = p.toUpperCase()
    if (['MS1','X','MS2'].includes(u)) return '1x2'
    if (['1X','X2','12'].includes(u)) return 'Çifte Şans'
    if (u.includes('ÜST') || u.includes('ALT')) return 'Gol'
    if (u.includes('KG')) return 'KG'
    return ''
  }

  // Blurlu bölüm için — gerçek veri asla kilitli kullanıcıya gönderilmez
  const displayPreds = unlocked
    ? allPreds
    : allPreds.length > 0
      ? [
          { prediction: '??', confidence: 55 },
          { prediction: '??', confidence: 25 },
          { prediction: '??', confidence: 20 },
        ]
      : []

  // Karşılaştırma hesapları
  const homeXg  = m.home_xg  ?? 0
  const awayXg  = m.away_xg  ?? 0
  const maxXg   = Math.max(homeXg, awayXg, 0.1)
  const homeForm = (m.home_form_score ?? 0) * 100
  const awayForm = ((m.away_form_score ?? 0)) * 100

  // SofaScore direkt link (slug+customId varsa) veya Google fallback
  const sofaUrl = m.sofascore_slug && m.sofascore_custom_id
    ? `https://www.sofascore.com/${m.sofascore_slug}/${m.sofascore_custom_id}#id:${m.sofascore_id}`
    : `https://www.google.com/search?q=${encodeURIComponent(`sofascore ${m.home_team} ${m.away_team}`)}`

  // Analiz paragrafları
  const analysisParagraphs = m.analysis
    ? translateText(m.analysis).split(/\.\s+/).filter(s => s.trim().length > 10).map(s => s.trim().endsWith('.') ? s.trim() : s.trim() + '.')
    : []

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${m.home_team} vs ${m.away_team}`,
      startDate: m.match_time,
      sport: 'Soccer',
      url: `${siteUrl}/maclar/${m.id}`,
      description: `${m.home_team} vs ${m.away_team} maç analizi${m.prediction ? ` — Tahmin: ${m.prediction}` : ''}, ${m.league_name ?? 'futbol'}.`,
      location: { '@type': 'Place', name: m.league_name ?? 'Futbol' },
      competitor: [
        { '@type': 'SportsTeam', name: m.home_team },
        { '@type': 'SportsTeam', name: m.away_team },
      ],
      ...(hasScore ? { result: `${m.home_score}–${m.away_score}` } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: m.league_name ?? 'Maçlar', item: `${siteUrl}/tahminler/bugun` },
        { '@type': 'ListItem', position: 3, name: `${m.home_team} vs ${m.away_team}`, item: `${siteUrl}/maclar/${m.id}` },
      ],
    },
  ]

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <a href="/" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
          ← Maçlar
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!isFinished && (
            <HatirlatButton matchTime={m.match_time} home={m.home_team} away={m.away_team} />
          )}
          <ShareButtons
            title={`${m.home_team} vs ${m.away_team}`}
            url={`${siteUrl}/maclar/${m.id}`}
          />
          <form action={toggleFavorite}>
            <input type="hidden" name="match_id" value={m.id} />
            <input type="hidden" name="action" value={isFavorite ? 'remove' : 'add'} />
            <button type="submit" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.35rem 0.75rem', borderRadius: '7px', border: '1.5px solid var(--color-border)',
              background: isFavorite ? 'var(--color-accent-subtle)' : 'transparent',
              color: isFavorite ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              {isFavorite ? 'Kaydedildi' : 'Kaydet'}
            </button>
          </form>
        </div>
      </div>

      {/* ── Başlık ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {matchDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {matchDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {isLive && <span className="badge-live">Canlı</span>}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(1.4rem, 5.5vw, 3.5rem)', letterSpacing: '0.03em',
          textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.05, marginBottom: '1rem',
        }}>
          {translateTeam(m.home_team)}
          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 600, fontSize: '0.6em', margin: '0 0.5rem' }}>vs</span>
          {translateTeam(m.away_team)}
        </h1>

        {/* Skor — canlı veya bitmiş (Realtime güncellenir) */}
        <LiveScoreClient
          matchId={m.id}
          matchTime={m.match_time}
          initialStatus={m.status}
          initialHomeScore={m.home_score}
          initialAwayScore={m.away_score}
          homeTeam={m.home_team}
          awayTeam={m.away_team}
        />
      </div>

      {/* ── Premium içerik bloğu (kilitliyse blur + CTA) ─────────────────── */}
      <div style={{ position: 'relative' }}>
        <div style={unlocked ? undefined : {
          filter: 'blur(7px)',
          pointerEvents: 'none',
          userSelect: 'none',
          maxHeight: '560px',
          overflow: 'hidden',
          maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
        }}>

      {/* ── Tahmin Dağılımı ─────────────────────────────────────────────── */}
      {displayPreds.length > 0 && !isFinished && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Tahmin Dağılımı</SectionTitle>

          {/* Ana tahmin büyük */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '2.25rem', lineHeight: 1,
                color: unlocked ? 'var(--color-accent)' : 'var(--color-border)',
                letterSpacing: '0.02em', textTransform: 'uppercase',
              }}>
                {displayPreds[0].prediction}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: unlocked ? 'var(--color-accent)' : 'var(--color-border)' }}>
                %{displayPreds[0].confidence}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-border)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ana Tahmin
              </span>
            </div>
          </div>

          {/* Tüm seçenekler bar olarak — bağımsız piyasalar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {displayPreds.map((pred, i) => {
              const isMain = i === 0
              const barPct = Math.min(pred.confidence, 100)
              const market = getPredMarket(pred.prediction)
              const barColor = isMain
                ? 'var(--color-accent)'
                : market === 'Gol' ? 'var(--color-warning)'
                : market === 'Çifte Şans' ? 'var(--color-success)'
                : market === 'KG' ? 'oklch(55% 0.16 145)'
                : 'var(--color-border-strong)'
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.82rem', fontWeight: isMain ? 700 : 500,
                        color: unlocked ? (isMain ? 'var(--color-text-primary)' : 'var(--color-text-secondary)') : 'var(--color-border)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {pred.prediction}
                      </span>
                      {unlocked && market && !isMain && (
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: barColor, opacity: 0.8 }}>
                          {market}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: unlocked ? (isMain ? 'var(--color-accent)' : 'var(--color-text-tertiary)') : 'var(--color-border)' }}>
                      %{pred.confidence}
                    </span>
                  </div>
                  <div style={{ height: isMain ? '8px' : '5px', borderRadius: '99px', background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px',
                      background: unlocked ? barColor : 'var(--color-border)',
                      width: `${barPct}%`,
                      transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Takım Karşılaştırması ───────────────────────────────────────── */}
      {(m.home_xg != null || m.home_form_score != null) && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Takım Karşılaştırması</SectionTitle>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* xG Karşılaştırma */}
            {m.home_xg != null && m.away_xg != null && (
              <CompareBar
                label="xG Beklentisi (maç başı)"
                leftLabel={translateTeam(m.home_team)}
                rightLabel={translateTeam(m.away_team)}
                leftValue={homeXg}
                rightValue={awayXg}
                leftPct={(homeXg / (homeXg + awayXg)) * 100}
                rightPct={(awayXg / (homeXg + awayXg)) * 100}
                leftDisplay={homeXg.toFixed(2)}
                rightDisplay={awayXg.toFixed(2)}
                color="var(--color-accent)"
              />
            )}

            {/* Form Karşılaştırma */}
            {m.home_form_score != null && m.away_form_score != null && (
              <CompareBar
                label="Son Form Skoru"
                leftLabel={translateTeam(m.home_team)}
                rightLabel={translateTeam(m.away_team)}
                leftValue={homeForm}
                rightValue={awayForm}
                leftPct={homeForm}
                rightPct={awayForm}
                leftDisplay={`%${Math.round(homeForm)}`}
                rightDisplay={`%${Math.round(awayForm)}`}
                color="oklch(52% 0.18 240)"
              />
            )}

            {/* Eksik oyuncu etkisi */}
            {m.critical_missing_effect != null && m.critical_missing_effect > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Kadro Eksiklik Etkisi
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                    %{Math.round(m.critical_missing_effect * 100)}
                  </span>
                </div>
                <div style={{ height: '5px', borderRadius: '99px', background: 'var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '99px', background: 'var(--color-accent)', width: `${Math.round(m.critical_missing_effect * 100)}%` }} />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginTop: '0.35rem' }}>
                  Sakat/cezalı oyuncuların maç sonucuna tahmini etkisi
                </p>
              </div>
            )}

            {/* Son 5 maç türetilmiş istatistikler */}
            {(() => {
              const h = m.home_last5_data
              const a = m.away_last5_data
              if (!h || !a || h.played === 0 || a.played === 0) return null
              const hWinPct = Math.round((h.wins / h.played) * 100)
              const aWinPct = Math.round((a.wins / a.played) * 100)
              const hGolAv  = h.goals_for / h.played
              const aGolAv  = a.goals_for / a.played
              const hYenAv  = h.goals_against / h.played
              const aYenAv  = a.goals_against / a.played
              const winTotal = hWinPct + aWinPct || 1
              const golTotal = hGolAv + aGolAv || 1
              const yenTotal = hYenAv + aYenAv || 1
              return (
                <>
                  <CompareBar label="Galibiyet Oranı (son 5 maç)"
                    leftLabel={translateTeam(m.home_team)} rightLabel={translateTeam(m.away_team)}
                    leftValue={hWinPct} rightValue={aWinPct}
                    leftPct={(hWinPct / winTotal) * 100} rightPct={(aWinPct / winTotal) * 100}
                    leftDisplay={`%${hWinPct}`} rightDisplay={`%${aWinPct}`}
                    color="var(--color-success)" />
                  <CompareBar label="Gol Ortalaması (son 5 maç)"
                    leftLabel={translateTeam(m.home_team)} rightLabel={translateTeam(m.away_team)}
                    leftValue={hGolAv} rightValue={aGolAv}
                    leftPct={(hGolAv / golTotal) * 100} rightPct={(aGolAv / golTotal) * 100}
                    leftDisplay={hGolAv.toFixed(1)} rightDisplay={aGolAv.toFixed(1)}
                    color="var(--color-accent)" />
                  <CompareBar label="Yenilen Gol Ort. (son 5 maç)"
                    leftLabel={translateTeam(m.home_team)} rightLabel={translateTeam(m.away_team)}
                    leftValue={hYenAv} rightValue={aYenAv}
                    leftPct={(hYenAv / yenTotal) * 100} rightPct={(aYenAv / yenTotal) * 100}
                    leftDisplay={hYenAv.toFixed(1)} rightDisplay={aYenAv.toFixed(1)}
                    color="oklch(52% 0.18 240)" />
                </>
              )
            })()}

            {/* SofaScore gelişmiş istatistikler */}
            {(() => {
              const h = m.home_last5_data
              const a = m.away_last5_data
              if (!h || !a) return null
              const bars: { label: string; hv: number; av: number; unit?: string }[] = []
              if (h.avg_shots        != null && a.avg_shots        != null) bars.push({ label: 'Şut Ortalaması',    hv: h.avg_shots,        av: a.avg_shots        })
              if (h.avg_shots_on_target != null && a.avg_shots_on_target != null) bars.push({ label: 'İsabetli Şut',     hv: h.avg_shots_on_target, av: a.avg_shots_on_target })
              if (h.avg_possession   != null && a.avg_possession   != null) bars.push({ label: 'Top Hakimiyeti',   hv: h.avg_possession,   av: a.avg_possession,   unit: '%' })
              if (h.avg_pass_accuracy != null && a.avg_pass_accuracy != null) bars.push({ label: 'Pas Doğruluğu',    hv: h.avg_pass_accuracy, av: a.avg_pass_accuracy, unit: '%' })
              if (h.avg_corners      != null && a.avg_corners      != null) bars.push({ label: 'Corner Ortalaması', hv: h.avg_corners,      av: a.avg_corners      })
              if (h.avg_goals_first_half  != null && a.avg_goals_first_half  != null) bars.push({ label: '1. Yarı Gol Ort.', hv: h.avg_goals_first_half,  av: a.avg_goals_first_half  })
              if (h.avg_goals_second_half != null && a.avg_goals_second_half != null) bars.push({ label: '2. Yarı Gol Ort.', hv: h.avg_goals_second_half, av: a.avg_goals_second_half })
              if (bars.length === 0) return null
              return (
                <>
                  {bars.map((b, i) => {
                    const total = b.hv + b.av || 1
                    const lPct  = b.unit === '%' ? b.hv : (b.hv / total) * 100
                    const rPct  = b.unit === '%' ? b.av : (b.av / total) * 100
                    return (
                      <CompareBar key={i} label={b.label}
                        leftLabel={translateTeam(m.home_team)} rightLabel={translateTeam(m.away_team)}
                        leftValue={b.hv} rightValue={b.av}
                        leftPct={lPct} rightPct={rPct}
                        leftDisplay={`${b.hv.toFixed(b.unit === '%' ? 0 : 1)}${b.unit ?? ''}`}
                        rightDisplay={`${b.av.toFixed(b.unit === '%' ? 0 : 1)}${b.unit ?? ''}`}
                        color="var(--color-accent)" />
                    )
                  })}
                </>
              )
            })()}
          </div>
        </section>
      )}

      {/* ── Algoritma Güveni ─────────────────────────────────────────────── */}
      {conf > 0 && (
        <section style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'var(--color-surface-2)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
                Algoritma Güveni
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '3.5rem', lineHeight: 1, color: confColor, letterSpacing: '-0.02em' }}>
                %{confPct}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                {conf >= 0.7
                  ? 'Yüksek güven — algoritma bu maç için güçlü bir sinyal tespit etti.'
                  : conf >= 0.55
                  ? 'Orta güven — analiz mevcut ancak belirsizlik var. Dikkatli değerlendirin.'
                  : 'Düşük güven — iki takım birbirine yakın, kesin sinyal yok.'}
              </p>
            </div>
          </div>
          <div className="confidence-bar" style={{ height: '8px' }}>
            <div className="confidence-bar-fill" style={{ width: `${confPct}%`, background: confColor }} />
          </div>
          {/* Güven skalası */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
            {[['0', 'Zayıf'], ['55', 'Orta'], ['70', 'Güçlü'], ['100', '']].map(([val, lbl]) => (
              <span key={val} style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)' }}>{lbl || val}</span>
            ))}
          </div>

          {/* Oran karşılaştırması */}
          {m.prediction && conf > 0 && !isFinished && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
                Algoritma Değeri
              </div>
              <OranKarsilastirma prediction={m.prediction} confidence={conf} marketOdds={m.market_odds} />
            </div>
          )}
        </section>
      )}

      {/* ── AI Analizi ──────────────────────────────────────────────────── */}
      {m.analysis && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Algoritma Yorumu</SectionTitle>
          <div style={{
            padding: '1.5rem',
            background: 'var(--color-accent-subtle)',
            borderRadius: '12px',
            border: '1px solid oklch(54% 0.22 25 / 0.14)',
          }}>
            {analysisParagraphs.length > 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {analysisParagraphs.map((para, i) => (
                  <p key={i} style={{
                    fontSize: i === 0 ? '0.95rem' : '0.88rem',
                    fontWeight: i === 0 ? 500 : 400,
                    color: i === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                    dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)', lineHeight: 1.7, margin: 0 }}
                dangerouslySetInnerHTML={{ __html: translateText(m.analysis).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
            )}
          </div>
        </section>
      )}

      {/* ── Son 5 Maç ──────────────────────────────────────────────────── */}
      {(m.home_last5_data || m.away_last5_data) && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Son 5 Maç</SectionTitle>
          <div className="last5-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {m.home_last5_data && <Last5Card data={m.home_last5_data} />}
            {m.away_last5_data && <Last5Card data={m.away_last5_data} />}
          </div>
        </section>
      )}


      {/* ── Temel Metrikler ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <SectionTitle>İstatistikler</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1px', background: 'var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <MetricCell label="Güven Skoru"   value={`%${confPct}`}                                                                valueColor={confColor} />
          {m.home_xg   != null && <MetricCell label="Ev xG"        value={m.home_xg.toFixed(2)} />}
          {m.away_xg   != null && <MetricCell label="Dep. xG"      value={m.away_xg.toFixed(2)} />}
          {m.home_form_score != null && <MetricCell label="Ev Formu"  value={`%${Math.round(m.home_form_score * 100)}`} />}
          {m.away_form_score != null && <MetricCell label="Dep. Formu" value={`%${Math.round((m.away_form_score ?? 0) * 100)}`} />}
          {m.critical_missing_effect != null && m.critical_missing_effect > 0 && (
            <MetricCell label="Eksik Etkisi" value={`%${Math.round(m.critical_missing_effect * 100)}`} valueColor="var(--color-accent)" />
          )}
        </div>
      </section>

      {/* ── Kafa Kafaya (H2H) ──────────────────────────────────────────── */}
      {m.h2h_data && m.h2h_data.total > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Kafa Kafaya</SectionTitle>

          {/* Özet sayaç */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: 'var(--color-success)' }}>{m.h2h_data.home_wins}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{translateTeam(m.home_team)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: 'var(--color-text-tertiary)' }}>{m.h2h_data.draws}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>Bera.</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: 'var(--color-accent)' }}>{m.h2h_data.away_wins}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{translateTeam(m.away_team)}</div>
            </div>
          </div>

          {/* Son maçlar listesi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {m.h2h_data.matches.slice(0, 7).map((hm, i) => {
              const homeWon = hm.result === 'ev'
              const awayWon = hm.result === 'dep'
              const color = homeWon ? 'var(--color-success)' : awayWon ? 'var(--color-accent)' : 'var(--color-warning)'
              return (
                <div key={i} className="h2h-row" style={{
                  borderBottom: i === Math.min(m.h2h_data!.matches.length - 1, 6) ? 'none' : '1px solid var(--color-border)',
                }}>
                  <div className="h2h-date" style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{hm.date}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: homeWon ? 700 : 400, color: homeWon ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hm.home}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color, textAlign: 'center', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {hm.home_score} – {hm.away_score}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: awayWon ? 700 : 400, color: awayWon ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hm.away}</div>
                  <div className="h2h-tournament" style={{ fontSize: '0.62rem', color: 'var(--color-text-tertiary)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hm.tournament}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Eksik Oyuncular ─────────────────────────────────────────────── */}
      {m.missing_players?.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Kadro Durumu</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {m.missing_players.map((p, i) => {
              const isSuspended = p.reason?.toLowerCase() === 'ceza'
              return (
                <div key={i} className="missing-row" style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: '0.75rem', padding: '0.9rem 0',
                  borderBottom: i === m.missing_players.length - 1 ? 'none' : '1px solid var(--color-border)',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {p.name}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '0.15rem 0.5rem', borderRadius: '4px',
                    background: isSuspended ? 'var(--color-warning-bg)' : 'var(--color-accent-subtle)',
                    color: isSuspended ? 'var(--color-warning)' : 'var(--color-accent-text)',
                    whiteSpace: 'nowrap',
                  }}>
                    {isSuspended ? 'Cezalı' : 'Sakat'}
                  </span>
                  <span className="missing-matches-col" style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                    {p.missed_matches_count} maçtır yok
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

        </div>
        {/* Kilit overlay */}
        {!unlocked && <PremiumGate confPct={confPct} />}
      </div>

      {/* ── Piyasa Oranları ─────────────────────────────────────────────── */}
      {Object.keys(latestOdds).length > 0 && !isFinished && (
        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <OranlarTablosu odds={latestOdds} prediction={unlocked ? m.prediction : null} />
        </div>
      )}

      {/* Özel AI Analizi */}
      <OzelAnalizClient
        matchId={m.id}
        homeTeam={translateTeam(m.home_team)}
        awayTeam={translateTeam(m.away_team)}
        isPremium={isPremium}
        initialAnalysis={existingAnalysis}
      />

      {/* Reklam */}
      <AdSlot
        slot={process.env.NEXT_PUBLIC_AD_SLOT_MAC_DETAY ?? ''}
        format="fluid"
        layout="in-article"
        style={{ margin: '2rem 0', textAlign: 'center' }}
      />

      {/* İlgili haberler */}
      {relatedNews.length > 0 && (
        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
            Güncel Haberler
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {relatedNews.map(n => (
              <a key={n.id} href={n.url ?? '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', textDecoration: 'none', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', transition: 'border-color 0.15s' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{n.title}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{new Date(n.published_at).toLocaleDateString('tr-TR')}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SofaScore detaylı analiz linki */}
      {true && (
        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
              Daha Fazla İstatistik
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
              Canlı skor, kadro, detaylı istatistikler SofaScore'da
            </p>
          </div>
          <a
            href={sofaUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem', borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              fontSize: '0.85rem', fontWeight: 600,
              color: 'var(--color-text-primary)', textDecoration: 'none',
              background: 'var(--color-surface-2)',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
            SofaScore'da Gör →
          </a>
        </div>
      )}

    </main>
  )
}

function PremiumGate({ confPct }: { confPct: number }) {
  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      top: '200px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, transparent 0%, var(--color-base) 38%)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem 1.5rem' }}>
        {confPct > 0 && (
          <div style={{ marginBottom: '0.6rem' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.95rem', letterSpacing: '0.06em', textTransform: 'uppercase',
              color: confPct >= 70 ? 'var(--color-success)' : 'var(--color-warning)',
            }}>
              Bu maçta %{confPct} güven sinyali
            </span>
          </div>
        )}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '1.4rem', letterSpacing: '0.04em', textTransform: 'uppercase',
          color: 'var(--color-text-primary)', lineHeight: 1.1, marginBottom: '0.55rem',
        }}>
          Analizi Görüntüle
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          AI tahmin dağılımı, xG karşılaştırması, son 5 maç ve kadro durumu premium üyeliğe özel. Her gün 4 maç ücretsiz.
        </p>
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/hizmetler" style={{
            display: 'inline-block',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.88rem', letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'oklch(97% 0.005 255)',
            background: 'var(--color-accent)',
            textDecoration: 'none', borderRadius: '8px', padding: '0.7rem 1.75rem',
          }}>
            Premium Ol
          </a>
          <a href="/giris" style={{
            display: 'inline-block',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem',
            color: 'var(--color-text-secondary)', textDecoration: 'none',
            borderRadius: '8px', padding: '0.7rem 1.25rem',
            border: '1.5px solid var(--color-border)',
          }}>
            Giriş Yap
          </a>
        </div>
      </div>
    </div>
  )
}

function Last5Card({ data }: { data: Last5Data }) {
  const RESULT_COLOR = { G: 'var(--color-success)', B: 'var(--color-warning)', M: 'var(--color-accent)' }
  const RESULT_LABEL = { G: 'G', B: 'B', M: 'M' }
  const avgGoals = data.played > 0 ? (data.goals_for / data.played).toFixed(1) : '—'

  return (
    <div style={{
      padding: '1.1rem', background: 'var(--color-surface-2)',
      borderRadius: '10px', border: '1px solid var(--color-border)',
    }}>
      {/* Takım adı */}
      <p style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem',
        letterSpacing: '0.05em', textTransform: 'uppercase',
        color: 'var(--color-text-primary)', marginBottom: '0.75rem',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {translateTeam(data.team)}
      </p>

      {/* Form indikatörleri */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.85rem' }}>
        {data.matches.map((m, i) => (
          <div key={i} style={{
            width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
            background: RESULT_COLOR[m.result],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 800, color: 'oklch(97% 0.005 255)',
            letterSpacing: '0.02em',
          }}>
            {RESULT_LABEL[m.result]}
          </div>
        ))}
      </div>

      {/* Özet istatistikler */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
        <Stat label="G" value={String(data.wins)} color="var(--color-success)" />
        <Stat label="B" value={String(data.draws)} color="var(--color-warning)" />
        <Stat label="M" value={String(data.losses)} color="var(--color-accent)" />
        <Stat label="Attı" value={String(data.goals_for)} />
        <Stat label="Yedi" value={String(data.goals_against)} />
        {data.yellow_cards > 0 && <Stat label="Sarı" value={String(data.yellow_cards)} color="oklch(68% 0.16 75)" />}
        {data.red_cards > 0 && <Stat label="Kırmızı" value={String(data.red_cards)} color="var(--color-accent)" />}
      </div>

      {/* Maç detayları */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {data.matches.map((mx, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto',
            gap: '0.5rem', alignItems: 'center',
            padding: '0.4rem 0',
            borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
              background: RESULT_COLOR[mx.result],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.58rem', fontWeight: 800, color: 'oklch(97% 0.005 255)',
            }}>
              {mx.result}
            </div>
            <span style={{
              fontSize: '0.72rem', color: 'var(--color-text-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {mx.was_home ? 'Ev' : 'Dep'} — {translateTeam(mx.opponent)}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
              {mx.team_score}–{mx.opponent_score}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '28px' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', lineHeight: 1, color: color ?? 'var(--color-text-primary)' }}>
        {value}
      </span>
      <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.1rem' }}>
        {label}
      </span>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem',
      letterSpacing: '0.09em', textTransform: 'uppercase',
      color: 'var(--color-text-tertiary)', marginBottom: '1rem',
    }}>
      {children}
    </h2>
  )
}

function MetricCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ background: 'var(--color-base)', padding: '1.1rem 1.25rem' }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.35rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem', lineHeight: 1, color: valueColor ?? 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  )
}

function CompareBar({
  label, leftLabel, rightLabel,
  leftPct, rightPct, leftDisplay, rightDisplay, color,
}: {
  label: string
  leftLabel: string; rightLabel: string
  leftValue: number; rightValue: number
  leftPct: number; rightPct: number
  leftDisplay: string; rightDisplay: string
  color: string
}) {
  const leftWins  = leftPct >= rightPct
  return (
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
        {label}
      </div>
      {/* Takım adları + değerler */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {leftLabel}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', lineHeight: 1, color: leftWins ? color : 'var(--color-text-secondary)' }}>
            {leftDisplay}
          </div>
        </div>
        <div style={{ width: '1px', height: '32px', background: 'var(--color-border)' }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {rightLabel}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', lineHeight: 1, color: !leftWins ? color : 'var(--color-text-secondary)', textAlign: 'right' }}>
            {rightDisplay}
          </div>
        </div>
      </div>
      {/* Karşılaştırma barı */}
      <div style={{ display: 'flex', height: '6px', borderRadius: '99px', overflow: 'hidden', background: 'var(--color-border)' }}>
        <div style={{ width: `${leftPct}%`, background: color, borderRadius: '99px 0 0 99px', transition: 'width 0.4s ease' }} />
        <div style={{ flex: 1, background: 'var(--color-border-strong)', borderRadius: '0 99px 99px 0' }} />
      </div>
    </div>
  )
}

const SOURCE_LABELS: Record<string, string> = { iddaa: 'İddaa', misli: 'Misli', nesine: 'Nesine' }
const SOURCES = ['iddaa', 'misli', 'nesine'] as const

type OddsKey = 'ms1' | 'x' | 'ms2' | 'over25' | 'under25' | 'kg_var' | 'kg_yok'
type OranRow = { key: OddsKey; label: string; isPred: boolean }

function OranlarTablosu({
  odds,
  prediction,
}: {
  odds: Partial<Record<string, MatchOdds>>
  prediction: string | null
}) {
  const pred = prediction?.toLowerCase() ?? ''
  const available = SOURCES.filter(s => odds[s])

  if (available.length === 0) return null

  const ALL_ROWS: OranRow[] = [
    { key: 'ms1',     label: 'MS1',        isPred: pred === 'ms1' },
    { key: 'x',       label: 'Beraberlik', isPred: pred === 'x' },
    { key: 'ms2',     label: 'MS2',        isPred: pred === 'ms2' },
    { key: 'over25',  label: '2.5 Üst',    isPred: pred.includes('üst') },
    { key: 'under25', label: '2.5 Alt',    isPred: pred.includes('alt') },
    { key: 'kg_var',  label: 'KG Var',     isPred: pred.includes('kg var') },
    { key: 'kg_yok',  label: 'KG Yok',     isPred: pred.includes('kg yok') },
  ]
  const rows = ALL_ROWS.filter(r => available.some(s => (odds[s] as Record<string, unknown>)?.[r.key] != null))

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.85rem' }}>
        Piyasa Oranları
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem 0.5rem 0', color: 'var(--color-text-tertiary)', fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>
                Bahis
              </th>
              {available.map(s => (
                <th key={s} style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>
                  {SOURCE_LABELS[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label, isPred }) => {
              const vals = available.map(s => Number((odds[s] as Record<string, unknown>)?.[key] ?? 0)).filter(v => v > 0)
              const maxVal = vals.length ? Math.max(...vals) : 0
              return (
                <tr key={key} style={{ background: isPred ? 'var(--color-success-bg)' : undefined }}>
                  <td style={{ padding: '0.6rem 0.75rem 0.6rem 0', fontWeight: isPred ? 700 : 500, color: isPred ? 'var(--color-success)' : 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                    {label}
                    {isPred && <span style={{ marginLeft: '0.4rem', fontSize: '0.62rem', fontWeight: 700, color: 'var(--color-success)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>← Tahmin</span>}
                  </td>
                  {available.map(s => {
                    const val = Number((odds[s] as Record<string, unknown>)?.[key] ?? 0)
                    const isBest = val > 0 && val === maxVal && vals.length > 1
                    return (
                      <td key={s} style={{
                        textAlign: 'center', padding: '0.6rem 0.75rem',
                        fontFamily: 'var(--font-display)', fontWeight: isBest ? 700 : 500,
                        fontSize: isBest ? '0.95rem' : '0.88rem',
                        color: isBest ? 'var(--color-success)' : val > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                        borderBottom: '1px solid var(--color-border)',
                      }}>
                        {val > 0 ? val.toFixed(2) : '—'}
                        {isBest && <span style={{ fontSize: '0.55rem', verticalAlign: 'super', marginLeft: '0.15rem', color: 'var(--color-success)' }}>▲</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '0.6rem' }}>
        ▲ En yüksek oran · Tahmin etiketi yalnızca premium üyelere gösterilir
      </p>
    </div>
  )
}

function OranKarsilastirma({
  prediction, confidence, marketOdds,
}: {
  prediction: string
  confidence: number
  marketOdds: { ms1?: number; x?: number; ms2?: number; over25?: number; under25?: number } | null
}) {
  const impliedOdds = confidence > 0 ? Math.round((1 / confidence) * 100) / 100 : null
  const predLower   = prediction.toLowerCase()

  const marketOdd = marketOdds
    ? predLower === 'ms1' ? marketOdds.ms1
    : predLower === 'ms2' ? marketOdds.ms2
    : predLower === 'x'   ? marketOdds.x
    : predLower.includes('üst') ? marketOdds.over25
    : predLower.includes('alt') ? marketOdds.under25
    : null
    : null

  const hasValue  = marketOdd && impliedOdds && marketOdd > impliedOdds
  const valuePct  = marketOdd && impliedOdds ? Math.round(((marketOdd / impliedOdds) - 1) * 100) : null

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* Algoritmanın önerdiği oran */}
      <div>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
          Algoritma İzin Verilen
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: 'var(--color-text-primary)' }}>
          {impliedOdds ? impliedOdds.toFixed(2) : '—'}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>
          Beklenen oran (1/güven)
        </div>
      </div>

      {marketOdd && (
        <>
          <div style={{ width: '1px', background: 'var(--color-border)', alignSelf: 'stretch' }} />
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
              Piyasa Oranı
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: hasValue ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
              {marketOdd.toFixed(2)}
            </div>
            {hasValue && valuePct !== null && (
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '0.2rem' }}>
                +{valuePct}% değer
              </div>
            )}
          </div>
        </>
      )}

      {!marketOdd && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', alignSelf: 'center' }}>
          Piyasa oranı henüz girilmedi
        </div>
      )}
    </div>
  )
}
