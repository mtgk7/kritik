import { createClient } from '@/lib/supabase/server'
import { Match } from '@/lib/types'
import { meta } from '@/lib/metadata'
import { translateTeam } from '@/lib/team-names'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = meta('İstatistikler', 'Algoritmanın tahmin başarı oranları ve performans analizi.')

function isPredictionCorrect(m: Match): boolean | null {
  if (m.prediction_correct !== null && m.prediction_correct !== undefined) return m.prediction_correct
  if (!m.prediction || m.home_score == null || m.away_score == null) return null
  const p = m.prediction.toLowerCase()
  const h = m.home_score, a = m.away_score
  if (p === 'ms1')          return h > a
  if (p === 'ms2')          return a > h
  if (p === 'x')            return h === a
  if (p.includes('2.5 üst')) return h + a > 2
  if (p.includes('2.5 alt')) return h + a <= 2
  if (p.includes('1.5 üst')) return h + a > 1
  if (p.includes('1.5 alt')) return h + a <= 1
  if (p.includes('kg var'))  return h > 0 && a > 0
  if (p.includes('kg yok'))  return h === 0 || a === 0
  return null
}

export default async function IstatistiklerPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'bitti')
    .not('prediction', 'is', null)
    .not('home_score', 'is', null)
    .order('match_time', { ascending: false })
    .limit(200)

  const matches = (data ?? []) as Match[]

  const evaluated = matches.map(m => ({ ...m, _correct: isPredictionCorrect(m) }))
    .filter(m => m._correct !== null)

  const total   = evaluated.length
  const correct = evaluated.filter(m => m._correct).length
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0

  // Lige göre breakdown
  const byLeague: Record<string, { total: number; correct: number }> = {}
  for (const m of evaluated) {
    const l = m.league_name ?? 'Genel'
    if (!byLeague[l]) byLeague[l] = { total: 0, correct: 0 }
    byLeague[l].total++
    if (m._correct) byLeague[l].correct++
  }
  const leagueRows = Object.entries(byLeague)
    .map(([l, s]) => ({ league: l, ...s, pct: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => b.total - a.total)

  // Güven aralığına göre breakdown
  const buckets = [
    { label: '%55–69', min: 0.55, max: 0.70 },
    { label: '%70–79', min: 0.70, max: 0.80 },
    { label: '%80+',   min: 0.80, max: 1.01 },
  ]
  const confRows = buckets.map(b => {
    const sub = evaluated.filter(m => {
      const c = m.confidence_score ?? 0
      return c >= b.min && c < b.max
    })
    const c = sub.filter(m => m._correct).length
    return { label: b.label, total: sub.length, correct: c, pct: sub.length > 0 ? Math.round((c / sub.length) * 100) : 0 }
  }).filter(r => r.total > 0)

  // Son 20 maç
  const recent = evaluated.slice(0, 20)

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '5rem' }}>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.03em',
          textTransform: 'uppercase', color: 'var(--color-text-primary)',
          lineHeight: 1, marginBottom: '0.4rem',
        }}>
          İstatistikler
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Algoritmanın tahmin başarısı — son {total} değerlendirilebilir maç
        </p>
      </div>

      {total === 0 ? (
        <div style={{ padding: '4rem 0', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-tertiary)' }}>
            Henüz biten maç yok. İstatistikler maçlar tamamlandıkça güncellenir.
          </p>
        </div>
      ) : (
        <>
          {/* Genel skor */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1px', background: 'var(--color-border)',
            borderRadius: '12px', overflow: 'hidden', marginBottom: '2.5rem',
          }}>
            <StatCard label="Toplam Tahmin" value={String(total)} />
            <StatCard label="Doğru" value={String(correct)} valueColor="var(--color-success)" />
            <StatCard label="Yanlış" value={String(total - correct)} valueColor="var(--color-accent)" />
            <StatCard
              label="İsabet Oranı"
              value={`%${pct}`}
              valueColor={pct >= 60 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-accent)'}
            />
          </div>

          {/* İsabet bar */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Genel İsabet</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{correct} / {total}</span>
            </div>
            <div style={{ height: '10px', borderRadius: '99px', background: 'var(--color-border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: pct >= 60 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-accent)', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--color-text-tertiary)' }}>0%</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--color-text-tertiary)' }}>50%</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--color-text-tertiary)' }}>100%</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>

            {/* Güven aralığı */}
            {confRows.length > 0 && (
              <section>
                <SectionTitle>Güven Aralığına Göre</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {confRows.map((r, i) => (
                    <div key={r.label} style={{ padding: '0.85rem 0', borderBottom: i === confRows.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.label}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: r.pct >= 60 ? 'var(--color-success)' : r.pct >= 50 ? 'var(--color-warning)' : 'var(--color-accent)' }}>
                          %{r.pct} <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', fontSize: '0.72rem' }}>({r.correct}/{r.total})</span>
                        </span>
                      </div>
                      <div style={{ height: '5px', borderRadius: '99px', background: 'var(--color-border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '99px', width: `${r.pct}%`, background: r.pct >= 60 ? 'var(--color-success)' : r.pct >= 50 ? 'var(--color-warning)' : 'var(--color-accent)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Lige göre */}
            {leagueRows.length > 0 && (
              <section>
                <SectionTitle>Lige Göre</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {leagueRows.map((r, i) => (
                    <div key={r.league} style={{ padding: '0.85rem 0', borderBottom: i === leagueRows.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.league}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: r.pct >= 60 ? 'var(--color-success)' : r.pct >= 50 ? 'var(--color-warning)' : 'var(--color-accent)' }}>
                          %{r.pct} <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', fontSize: '0.72rem' }}>({r.correct}/{r.total})</span>
                        </span>
                      </div>
                      <div style={{ height: '5px', borderRadius: '99px', background: 'var(--color-border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '99px', width: `${r.pct}%`, background: r.pct >= 60 ? 'var(--color-success)' : r.pct >= 50 ? 'var(--color-warning)' : 'var(--color-accent)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Son maçlar */}
          <section>
            <SectionTitle>Son Sonuçlar</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recent.map((m, i) => (
                <a key={m.id} href={`/maclar/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                    gap: '1rem', padding: '0.9rem 0', alignItems: 'center',
                    borderBottom: i === recent.length - 1 ? 'none' : '1px solid var(--color-border)',
                  }}>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {translateTeam(m.home_team)} — {translateTeam(m.away_team)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginLeft: '0.6rem' }}>
                        {m.league_name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                      {m.home_score}–{m.away_score}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {m.prediction}
                    </span>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', padding: '0.2rem 0.55rem', borderRadius: '4px',
                      background: m._correct ? 'var(--color-success-bg)' : 'var(--color-accent-subtle)',
                      color: m._correct ? 'var(--color-success)' : 'var(--color-accent)',
                      whiteSpace: 'nowrap',
                    }}>
                      {m._correct ? '✓ İsabet' : '✗ Kaçtı'}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function StatCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ background: 'var(--color-base)', padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', lineHeight: 1, color: valueColor ?? 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
        {value}
      </div>
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
