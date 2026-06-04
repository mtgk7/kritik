import { addNews } from '@/app/actions/admin'

export default async function HaberEklePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <main style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <a href="/admin" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>← Admin</a>

      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '2rem' }}>
        Haber Ekle
      </h1>

      {params.error && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)' }}>
          {params.error}
        </div>
      )}

      <form action={addNews} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '560px' }}>
        <FormField label="Başlık" name="title" required />
        <FormField label="Özet" name="summary" multiline required />

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
            Kategori
          </label>
          <select name="category" required style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid var(--color-border)', borderRadius: '7px', fontSize: '0.88rem', background: 'oklch(100% 0 0)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
            <option value="gunun_haberi">Günün Haberi</option>
            <option value="haftanin_haberi">Haftanın Haberi</option>
            <option value="genel">Genel</option>
          </select>
        </div>

        <FormField label="Etiket (opsiyonel)" name="tag" placeholder="örn: Sakatlık, xG Analizi, Kupon" />

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
            Yayın Durumu
          </label>
          <select name="is_published" style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid var(--color-border)', borderRadius: '7px', fontSize: '0.88rem', background: 'oklch(100% 0 0)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
            <option value="true">Yayınla</option>
            <option value="false">Taslak (yayınlama)</option>
          </select>
        </div>

        <button
          type="submit"
          style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--color-accent)', color: 'oklch(97% 0.005 255)', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          Haberi Kaydet
        </button>
      </form>
    </main>
  )
}

function FormField({ label, name, required, multiline, placeholder }: { label: string; name: string; required?: boolean; multiline?: boolean; placeholder?: string }) {
  const base: React.CSSProperties = { width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid var(--color-border)', borderRadius: '7px', fontSize: '0.88rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', background: 'oklch(100% 0 0)', outline: 'none' }
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
        {label}
      </label>
      {multiline
        ? <textarea name={name} required={required} rows={3} placeholder={placeholder} style={{ ...base, resize: 'vertical' }} />
        : <input name={name} type="text" required={required} placeholder={placeholder} style={base} />
      }
    </div>
  )
}
