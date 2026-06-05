import { supabaseFetch } from '@/lib/supabase/public'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Match, Last5Data } from '@/lib/types'
import LiveScoreClient from '@/components/LiveScoreClient'

export default async function MacDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const rows = await supabaseFetch<Match>(`matches?select=*&id=eq.${id}&limit=1`)
  const m = rows[0] ?? null
  if (!m) notFound()

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

  // Tahmin dağılımı — ana + alternatifler
  const allPreds: { prediction: string; confidence: number }[] = []
  if (m.prediction && m.prediction_confidence) {
    allPreds.push({ prediction: m.prediction, confidence: m.prediction_confidence })
  }
  ;(m.alternatives ?? []).forEach(a => allPreds.push(a))
  const totalConf = allPreds.reduce((s, a) => s + a.confidence, 0)

  // Karşılaştırma hesapları
  const homeXg  = m.home_xg  ?? 0
  const awayXg  = m.away_xg  ?? 0
  const maxXg   = Math.max(homeXg, awayXg, 0.1)
  const homeForm = (m.home_form_score ?? 0) * 100
  const awayForm = ((m.away_form_score ?? 0)) * 100

  // Analiz paragrafları
  const analysisParagraphs = m.analysis
    ? m.analysis.split(/\.\s+/).filter(s => s.trim().length > 10).map(s => s.trim().endsWith('.') ? s.trim() : s.trim() + '.')
    : []

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '5rem' }}>

      <a href="/" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
        ← Maçlar
      </a>

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
          fontSize: 'clamp(2rem, 6vw, 3.5rem)', letterSpacing: '0.03em',
          textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1.05, marginBottom: '1rem',
        }}>
          {m.home_team}
          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 600, fontSize: '0.6em', margin: '0 0.5rem' }}>vs</span>
          {m.away_team}
        </h1>

        {/* Skor — canlı veya bitmiş (Realtime güncellenir) */}
        <LiveScoreClient
          matchId={m.id}
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
      {allPreds.length > 0 && !isFinished && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Tahmin Dağılımı</SectionTitle>

          {/* Ana tahmin büyük */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '2.25rem', lineHeight: 1,
                color: 'var(--color-accent)', letterSpacing: '0.02em', textTransform: 'uppercase',
              }}>
                {allPreds[0].prediction}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-accent)' }}>
                %{allPreds[0].confidence}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ana Tahmin
              </span>
            </div>
          </div>

          {/* Tüm seçenekler bar olarak */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {allPreds.map((pred, i) => {
              const pct = totalConf > 0 ? (pred.confidence / totalConf) * 100 : pred.confidence
              const isMain = i === 0
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{
                      fontSize: '0.82rem', fontWeight: isMain ? 700 : 500,
                      color: isMain ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {pred.prediction}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isMain ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
                      %{pred.confidence}
                    </span>
                  </div>
                  <div style={{ height: isMain ? '8px' : '5px', borderRadius: '99px', background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px',
                      background: isMain ? 'var(--color-accent)' : 'var(--color-border-strong)',
                      width: `${pct}%`,
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
                leftLabel={m.home_team}
                rightLabel={m.away_team}
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
                leftLabel={m.home_team}
                rightLabel={m.away_team}
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
        </section>
      )}

      {/* ── AI Analizi ──────────────────────────────────────────────────── */}
      {m.analysis && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Algoritma Yorumu</SectionTitle>
          <div style={{
            padding: '1.5rem',
            background: 'var(--color-surface-2)',
            borderRadius: '12px',
            borderLeft: '3px solid var(--color-accent)',
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
                dangerouslySetInnerHTML={{ __html: m.analysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
            )}
          </div>
        </section>
      )}

      {/* ── Son 5 Maç ──────────────────────────────────────────────────── */}
      {(m.home_last5_data || m.away_last5_data) && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Son 5 Maç</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

      {/* ── Eksik Oyuncular ─────────────────────────────────────────────── */}
      {m.missing_players?.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Kadro Durumu</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {m.missing_players.map((p, i) => {
              const isSuspended = p.reason?.toLowerCase() === 'ceza'
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto',
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
                  }}>
                    {isSuspended ? 'Cezalı' : 'Sakat'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
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
        {!unlocked && <PremiumGate />}
      </div>

    </main>
  )
}

function PremiumGate() {
  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      top: '180px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, transparent 0%, var(--color-base) 45%)',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '420px',
        padding: '2rem 1.5rem',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <svg width="36" height="44" viewBox="0 0 36 44" fill="none" style={{ margin: '0 auto', display: 'block' }}>
            <rect x="2" y="18" width="32" height="24" rx="5" stroke="var(--color-premium)" strokeWidth="2.5"/>
            <path d="M9 18V12a9 9 0 0 1 18 0v6" stroke="var(--color-premium)" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '1.5rem', letterSpacing: '0.04em', textTransform: 'uppercase',
          color: 'var(--color-text-primary)', lineHeight: 1.1, marginBottom: '0.6rem',
        }}>
          Detaylı Analiz Premium'a Özel
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          AI tahmin dağılımı, xG karşılaştırması, son 5 maç detayı ve kadro durumu
          için premium üyeliğe geç. Her gün 4 maç ücretsiz açık.
        </p>
        <a href="/hizmetler" style={{
          display: 'inline-block',
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '0.92rem', letterSpacing: '0.05em', textTransform: 'uppercase',
          color: 'oklch(97% 0.005 255)',
          background: 'linear-gradient(135deg, oklch(55% 0.18 35), oklch(42% 0.15 20))',
          textDecoration: 'none', borderRadius: '9px', padding: '0.75rem 2rem',
          boxShadow: '0 4px 14px oklch(30% 0.1 35 / 0.45)',
        }}>
          ⭐ Premium Ol
        </a>
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
        {data.team}
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
              {mx.was_home ? 'Ev' : 'Dep'} — {mx.opponent}
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
