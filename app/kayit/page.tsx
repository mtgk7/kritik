import { signUp } from '@/app/actions/auth'
import { meta } from '@/lib/metadata'

export const metadata = meta('Kayıt Ol')

export default async function KayitPage({
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
            Kayıt Ol
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Ücretsiz hesap oluştur, maç analizlerine hemen eriş.
          </p>
        </div>

        {params.error && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)', fontWeight: 500 }}>
            {params.error}
          </div>
        )}

        <form action={signUp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="E-posta" name="email" type="email" />
          <Field label="Şifre" name="password" type="password" minLength={6} hint="En az 6 karakter" />
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
            Hesap Oluştur
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          Zaten hesabın var mı?{' '}
          <a href="/giris" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
            Giriş Yap
          </a>
        </p>
      </div>
    </main>
  )
}

function Field({ label, name, type, minLength, hint }: { label: string; name: string; type: string; minLength?: number; hint?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
        {label}
      </label>
      <input name={name} type={type} required minLength={minLength} className="form-input" />
      {hint && <p style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>{hint}</p>}
    </div>
  )
}
