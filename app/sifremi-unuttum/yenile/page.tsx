import { updatePassword } from '@/app/actions/auth'
import { meta } from '@/lib/metadata'

export const metadata = meta('Yeni Şifre Belirle')

export default async function SifreyenilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--page-pad)' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '2rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--color-text-primary)',
            lineHeight: 1,
            marginBottom: '0.4rem',
          }}>
            Yeni Şifre
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Hesabın için yeni bir şifre belirle.
          </p>
        </div>

        {params.error && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)', fontWeight: 500 }}>
            {params.error}
          </div>
        )}

        <form action={updatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
              Yeni Şifre
            </label>
            <input name="password" type="password" required minLength={6} className="form-input" />
            <p style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>
              En az 6 karakter
            </p>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '0.25rem' }}>
            Şifremi Güncelle →
          </button>
        </form>
      </div>
    </main>
  )
}
