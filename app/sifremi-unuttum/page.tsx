import { sendPasswordReset } from '@/app/actions/auth'
import { meta } from '@/lib/metadata'

export const metadata = meta('Şifremi Unuttum')

export default async function SifremiUnuttumPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; gonderildi?: string }>
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
            Şifremi Unuttum
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            E-posta adresini gir, şifre sıfırlama bağlantısı gönderelim.
          </p>
        </div>

        {params.error && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)', fontWeight: 500 }}>
            {params.error}
          </div>
        )}

        {params.gonderildi ? (
          <div style={{ padding: '1.25rem', background: 'var(--color-success-bg)', borderRadius: '10px', border: '1px solid var(--color-success)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📬</div>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-success)', marginBottom: '0.4rem' }}>
              Bağlantı gönderildi!
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              E-posta kutunu kontrol et. Bağlantı birkaç dakika içinde gelecek.
            </p>
          </div>
        ) : (
          <form action={sendPasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
                E-posta
              </label>
              <input name="email" type="email" required className="form-input" />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '0.25rem' }}>
              Sıfırlama Bağlantısı Gönder →
            </button>
          </form>
        )}

        <p style={{ marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          <a href="/giris" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
            ← Giriş Yap
          </a>
        </p>
      </div>
    </main>
  )
}
