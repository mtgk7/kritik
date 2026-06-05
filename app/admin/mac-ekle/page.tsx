import { addMatch } from '@/app/actions/admin'

const LEAGUES = [
  'Süper Lig', 'Dünya Kupası 2026', 'Şampiyonlar Ligi',
  'Premier Lig', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
  'Avrupa Ligi', 'Genel',
]

export default async function MacEklePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.85rem',
    border: '1.5px solid var(--color-border)', borderRadius: '7px',
    fontSize: '0.88rem', color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-body)', background: 'oklch(100% 0 0)',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <a href="/admin" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>← Admin</a>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '2rem' }}>
        Maç Ekle
      </h1>

      {params.error && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)' }}>
          {params.error}
        </div>
      )}

      <form action={addMatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Takımlar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Ev Sahibi">
            <input name="home_team" required style={inputStyle} />
          </Field>
          <Field label="Deplasman">
            <input name="away_team" required style={inputStyle} />
          </Field>
        </div>

        {/* Tarih + Lig */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Maç Tarihi & Saati">
            <input name="match_time" type="datetime-local" required style={inputStyle} />
          </Field>
          <Field label="Lig">
            <select name="league_name" defaultValue="Genel" style={inputStyle}>
              {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>

        {/* Durum + Skor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <Field label="Durum">
            <select name="status" defaultValue="yakında" style={inputStyle}>
              <option value="yakında">Yakında</option>
              <option value="canlı">Canlı</option>
              <option value="bitti">Bitti</option>
            </select>
          </Field>
          <Field label="Ev Skoru">
            <input name="home_score" type="number" min="0" placeholder="—" style={inputStyle} />
          </Field>
          <Field label="Dep. Skoru">
            <input name="away_score" type="number" min="0" placeholder="—" style={inputStyle} />
          </Field>
        </div>

        {/* xG */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Ev xG">
            <input name="home_xg" type="number" step="0.01" style={inputStyle} />
          </Field>
          <Field label="Deplasman xG">
            <input name="away_xg" type="number" step="0.01" style={inputStyle} />
          </Field>
        </div>

        {/* Form Skoru */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Ev Form Skoru (0–1)">
            <input name="home_form_score" type="number" step="0.01" min="0" max="1" style={inputStyle} />
          </Field>
          <Field label="Dep. Form Skoru (0–1)">
            <input name="away_form_score" type="number" step="0.01" min="0" max="1" style={inputStyle} />
          </Field>
        </div>

        {/* Güven + Eksik Etki */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Güven Skoru (0–1)">
            <input name="confidence_score" type="number" step="0.01" min="0" max="1" placeholder="0.00–1.00" style={inputStyle} />
          </Field>
          <Field label="Eksik Etki (0–1)">
            <input name="critical_missing_effect" type="number" step="0.01" min="0" max="1" placeholder="0.00–1.00" style={inputStyle} />
          </Field>
        </div>

        {/* Tahmin */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Tahmin">
            <input name="prediction" placeholder="MS1 / MS2 / 2.5 Üst" style={inputStyle} />
          </Field>
          <Field label="Tahmin Güveni (%)">
            <input name="prediction_confidence" type="number" min="0" max="100" placeholder="örn: 72" style={inputStyle} />
          </Field>
        </div>

        {/* Analiz */}
        <Field label="Algoritma Yorumu (opsiyonel)">
          <textarea name="analysis" rows={4} placeholder="Maç analizi metni..." style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        {/* Eksik Oyuncular */}
        <Field label="Eksik Oyuncular (JSON, opsiyonel)">
          <textarea
            name="missing_players"
            rows={3}
            placeholder='[{"name":"Oyuncu","reason":"Sakatlık","missed_matches_count":3}]'
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </Field>

        {/* Ücretsiz Vitrin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <input name="is_free_preview" type="checkbox" value="true" id="free_preview" style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
          <label htmlFor="free_preview" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            Ücretsiz vitrin maçı (giriş yapmadan görülür)
          </label>
        </div>

        <button
          type="submit"
          style={{
            marginTop: '0.5rem', padding: '0.75rem',
            background: 'var(--color-accent)', color: 'oklch(97% 0.005 255)',
            border: 'none', borderRadius: '8px',
            fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Maçı Kaydet
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
