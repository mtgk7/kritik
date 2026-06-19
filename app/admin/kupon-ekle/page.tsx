import { addCoupon } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/server'
import { Match } from '@/lib/types'
import KuponAIOnerisi from '@/components/KuponAIOnerisi'

export default async function KuponEklePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_time, league_name, confidence_score, status')
    .neq('status', 'bitti')
    .order('match_time', { ascending: true })

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

      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '2rem' }}>
        Kupon Ekle
      </h1>

      {params.error && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)' }}>
          {params.error}
        </div>
      )}

      <form action={addCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Editör seçimi — en üste al, sayfayı yönlendirir */}
        <Field label="Kupon Türü">
          <select name="is_editor_pick" style={inputStyle} defaultValue="true">
            <option value="true">✍️ Editör Tahmini</option>
            <option value="false">🤖 AI Kuponu</option>
          </select>
        </Field>

        {/* Kupon tipi */}
        <Field label="Kupon Tipi">
          <select name="coupon_type" required style={inputStyle}>
            <option value="Banko">Banko</option>
            <option value="BTTS">BTTS (KG Var)</option>
            <option value="Alt/Üst 2.5">Alt/Üst 2.5</option>
            <option value="Alt/Üst 1.5">Alt/Üst 1.5</option>
            <option value="Korner">Korner</option>
            <option value="xG Canavarı">xG Canavarı</option>
            <option value="Premium Sürpriz">Premium Sürpriz</option>
          </select>
        </Field>

        {/* Maç seçimi */}
        <Field label={`Maçları Seç${matches?.length ? ` (${matches.length} yaklaşan maç)` : ''}`}>
          <div style={{ marginBottom: '0.65rem' }}>
            <KuponAIOnerisi />
          </div>
          {!matches?.length ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', padding: '0.75rem 0' }}>
              Yaklaşan maç yok.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1.5px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', maxHeight: '320px', overflowY: 'auto' }}>
              {(matches as Match[]).map((m, i) => {
                const conf = m.confidence_score ? `%${Math.round(m.confidence_score * 100)}` : ''
                const dt   = new Date(m.match_time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                return (
                  <label key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', cursor: 'pointer',
                    borderBottom: i === matches.length - 1 ? 'none' : '1px solid var(--color-border)',
                    background: 'var(--color-base)',
                  }}>
                    <input
                      type="checkbox"
                      name="match_ids"
                      value={m.id}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)', flexShrink: 0, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.home_team} — {m.away_team}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginTop: '0.1rem' }}>
                        {m.league_name} · {dt}
                      </div>
                    </div>
                    {conf && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)', flexShrink: 0 }}>
                        {conf}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </Field>

        {/* Toplam oran */}
        <Field label="Toplam Oran">
          <input name="total_rate" type="number" step="0.01" placeholder="örn: 4.20" style={inputStyle} />
        </Field>

        {/* Premium */}
        <Field label="Erişim">
          <select name="is_premium" style={inputStyle}>
            <option value="false">Ücretsiz</option>
            <option value="true">Premium</option>
          </select>
        </Field>

        {/* Kupon fiyatı */}
        <Field label="Satış Fiyatı ₺ (opsiyonel — boş bırakırsan ücretsiz/premium kapsamında)">
          <input name="price_try" type="number" min="0" step="1" placeholder="örn: 49" style={inputStyle} />
        </Field>

        {/* Editör notu */}
        <Field label="Editör Notu (opsiyonel)">
          <textarea
            name="editor_note"
            rows={3}
            placeholder="Bu kuponu neden seçtiniz? Kısa analiz notu..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        <button
          type="submit"
          style={{ padding: '0.75rem', background: 'var(--color-accent)', color: 'oklch(97% 0.005 255)', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          Kuponu Kaydet
        </button>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
