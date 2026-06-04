import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Match } from '@/lib/types'

export default async function MacDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) notFound()

  const m = match as Match
  const conf = m.confidence_score ?? 0
  const confPct = Math.round(conf * 100)
  const confColor =
    conf >= 0.7 ? 'var(--color-success)' :
    conf >= 0.55 ? 'var(--color-warning)' :
    'var(--color-text-tertiary)'

  const matchDate = new Date(m.match_time)

  return (
    <main style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <a href="/" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>← Maçlar</a>

      {/* Başlık */}
      <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid var(--color-border)' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
          {matchDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {matchDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          color: 'var(--color-text-primary)',
          lineHeight: 1.05,
          marginBottom: '1rem',
        }}>
          {m.home_team}
          <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 600, fontSize: '0.65em', margin: '0 0.5rem' }}>vs</span>
          {m.away_team}
        </h1>

        {m.prediction && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span className="badge-prediction" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
              {m.prediction}{m.prediction_confidence ? ` %${m.prediction_confidence}` : ''}
            </span>
            {(m.alternatives ?? []).map((alt, i) => (
              <span key={i} style={{
                display: 'inline-block', fontSize: '0.78rem', fontWeight: 600,
                color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)', borderRadius: '4px',
                padding: '0.25rem 0.6rem',
              }}>
                {alt.prediction} %{alt.confidence}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ana metrikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', background: 'var(--color-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '2.5rem' }}>
        <MetricCell label="Güven Skoru" value={`%${confPct}`} valueColor={confColor} />
        {m.home_xg != null && <MetricCell label="Ev xG" value={m.home_xg.toFixed(2)} />}
        {m.away_xg != null && <MetricCell label="Deplasman xG" value={m.away_xg.toFixed(2)} />}
        {m.home_form_score != null && <MetricCell label="Ev Formu" value={`%${Math.round(m.home_form_score * 100)}`} />}
        {m.away_form_score != null && <MetricCell label="Dep. Formu" value={`%${Math.round((m.away_form_score ?? 0) * 100)}`} />}
        {m.critical_missing_effect != null && (
          <MetricCell label="Eksik Etkisi" value={`%${Math.round(m.critical_missing_effect * 100)}`} valueColor="var(--color-accent)" />
        )}
      </div>

      {/* Güven barı */}
      {conf > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Algoritma Güveni</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: confColor }}>{confPct}%</span>
          </div>
          <div className="confidence-bar" style={{ height: '6px' }}>
            <div className="confidence-bar-fill" style={{ width: `${confPct}%`, background: confColor }} />
          </div>
        </div>
      )}

      {/* AI Analizi */}
      {m.analysis && (
        <div style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'var(--color-surface-2)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
              Yapay Zeka Analizi
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.65, maxWidth: '65ch' }}
            dangerouslySetInnerHTML={{ __html: m.analysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
          />
        </div>
      )}

      {/* Eksik oyuncular */}
      {m.missing_players?.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
            Eksik Oyuncular
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {m.missing_players.map((p, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: '1rem',
                padding: '0.85rem 0',
                borderBottom: i === m.missing_players.length - 1 ? 'none' : '1px solid var(--color-border)',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.name}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', background: 'var(--color-accent-subtle)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>{p.reason}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{p.missed_matches_count} maç</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

function MetricCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ background: 'var(--color-base)', padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, color: valueColor ?? 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  )
}
