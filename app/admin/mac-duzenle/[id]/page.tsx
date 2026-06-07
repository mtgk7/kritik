import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Match } from '@/lib/types'
import { updateMatch } from '@/app/actions/admin'

const LEAGUES = [
  'Süper Lig', 'Dünya Kupası 2026', 'Şampiyonlar Ligi',
  'Premier Lig', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
  'Avrupa Ligi', 'Genel',
]

function fmt(dt: string) {
  return new Date(dt).toISOString().slice(0, 16)
}

export default async function MacDuzenlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from('matches').select('*').eq('id', id).single()
  if (!data) notFound()
  const m = data as Match

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.85rem',
    border: '1.5px solid var(--color-border)', borderRadius: '7px',
    fontSize: '0.88rem', color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-body)', background: 'var(--color-base)',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <a href="/admin" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>← Admin</a>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
        Maç Düzenle
      </h1>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', marginBottom: '2rem' }}>
        {m.home_team} — {m.away_team}
      </p>

      {sp.error && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)' }}>
          {sp.error}
        </div>
      )}

      <form action={updateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <input type="hidden" name="id" value={m.id} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Ev Sahibi">
            <input name="home_team" defaultValue={m.home_team} required style={inputStyle} />
          </Field>
          <Field label="Deplasman">
            <input name="away_team" defaultValue={m.away_team} required style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Maç Tarihi & Saati">
            <input name="match_time" type="datetime-local" defaultValue={fmt(m.match_time)} required style={inputStyle} />
          </Field>
          <Field label="Lig">
            <select name="league_name" defaultValue={m.league_name ?? 'Genel'} style={inputStyle}>
              {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <Field label="Durum">
            <select name="status" defaultValue={m.status} style={inputStyle}>
              <option value="yakında">Yakında</option>
              <option value="canlı">Canlı</option>
              <option value="bitti">Bitti</option>
            </select>
          </Field>
          <Field label="Ev Skoru">
            <input name="home_score" type="number" min="0" defaultValue={m.home_score ?? ''} placeholder="—" style={inputStyle} />
          </Field>
          <Field label="Dep. Skoru">
            <input name="away_score" type="number" min="0" defaultValue={m.away_score ?? ''} placeholder="—" style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Ev xG">
            <input name="home_xg" type="number" step="0.01" defaultValue={m.home_xg ?? ''} style={inputStyle} />
          </Field>
          <Field label="Deplasman xG">
            <input name="away_xg" type="number" step="0.01" defaultValue={m.away_xg ?? ''} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Ev Form (0–1)">
            <input name="home_form_score" type="number" step="0.01" min="0" max="1" defaultValue={m.home_form_score ?? ''} style={inputStyle} />
          </Field>
          <Field label="Dep. Form (0–1)">
            <input name="away_form_score" type="number" step="0.01" min="0" max="1" defaultValue={m.away_form_score ?? ''} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Güven Skoru (0–1)">
            <input name="confidence_score" type="number" step="0.01" min="0" max="1" defaultValue={m.confidence_score ?? ''} style={inputStyle} />
          </Field>
          <Field label="Eksik Etki (0–1)">
            <input name="critical_missing_effect" type="number" step="0.01" min="0" max="1" defaultValue={m.critical_missing_effect ?? ''} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Tahmin">
            <input name="prediction" defaultValue={m.prediction ?? ''} placeholder="MS1 / MS2 / 2.5 Üst" style={inputStyle} />
          </Field>
          <Field label="Tahmin Güveni (%)">
            <input name="prediction_confidence" type="number" min="0" max="100" defaultValue={m.prediction_confidence ?? ''} style={inputStyle} />
          </Field>
        </div>

        <Field label="Algoritma Yorumu">
          <textarea name="analysis" rows={4} defaultValue={m.analysis ?? ''} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        <Field label="Eksik Oyuncular (JSON)">
          <textarea name="missing_players" rows={3} defaultValue={m.missing_players?.length ? JSON.stringify(m.missing_players) : ''} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }} />
        </Field>

        <Field label="SofaScore URL veya ID (opsiyonel)">
          <input name="sofascore_url" type="text" defaultValue={m.sofascore_id ? String(m.sofascore_id) : ''} placeholder="https://www.sofascore.com/tr/mac/.../12345678 veya sadece ID" style={inputStyle} />
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <input name="is_free_preview" type="checkbox" value="true" id="free_preview" defaultChecked={m.is_free_preview} style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
          <label htmlFor="free_preview" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            Ücretsiz vitrin maçı
          </label>
        </div>

        <button type="submit" style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--color-accent)', color: 'oklch(97% 0.005 255)', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          Değişiklikleri Kaydet
        </button>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
