import { signIn } from '@/app/actions/auth'
import { meta } from '@/lib/metadata'

export const metadata = meta('Giriş Yap')

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mesaj?: string; sonra?: string }>
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
            Giriş Yap
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Hesabına giriş yap, analizlere erişmeye devam et.
          </p>
        </div>

        {params.error && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)', fontWeight: 500 }}>
            {params.error}
          </div>
        )}
        {params.mesaj && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-success-bg)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 500 }}>
            {params.mesaj}
          </div>
        )}

        <form action={signIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {params.sonra && <input type="hidden" name="sonra" value={params.sonra} />}
          <Field label="E-posta" name="email" type="email" />
          <Field label="Şifre" name="password" type="password" />
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
            Giriş Yap
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          Hesabın yok mu?{' '}
          <a href="/kayit" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
            Kayıt Ol
          </a>
        </p>
      </div>
    </main>
  )
}

function Field({ label, name, type }: { label: string; name: string; type: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
        {label}
      </label>
      <input name={name} type={type} required className="form-input" />
    </div>
  )
}
