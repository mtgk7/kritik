import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

const ADMIN_EMAIL = 'gokbukmert@gmail.com'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === ADMIN_EMAIL

  return (
    <header style={{ background: 'var(--color-header)', borderBottom: '1px solid oklch(22% 0.016 255)' }}>
      <div style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '0 var(--page-pad)', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>

        {/* Logo + Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <a
            href="/"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.5rem',
              letterSpacing: '0.08em',
              color: 'var(--color-text-on-dark)',
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            Kritik
          </a>

          <nav style={{ display: 'flex', gap: '0.25rem' }}>
            <NavLink href="/">Maçlar</NavLink>
            <NavLink href="/haberler">Haberler</NavLink>
            <NavLink href="/kuponlar">Kuponlar</NavLink>
            {isAdmin && <NavLink href="/admin">Admin</NavLink>}
          </nav>
        </div>

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user ? (
            <>
              <a
                href="/profil"
                className="nav-email"
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-text-on-dark-2)',
                  textDecoration: 'none',
                  maxWidth: '160px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </a>
              <form action={signOut} style={{ margin: 0 }}>
                <button type="submit" className="btn-ghost">
                  Çıkış
                </button>
              </form>
            </>
          ) : (
            <>
              <a
                href="/giris"
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-text-on-dark-2)',
                  textDecoration: 'none',
                  padding: '0.35rem 0.5rem',
                }}
              >
                Giriş Yap
              </a>
              <a
                href="/kayit"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'oklch(97% 0.005 255)',
                  background: 'var(--color-accent)',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  padding: '0.35rem 0.85rem',
                  transition: 'background 0.15s',
                }}
              >
                Kayıt Ol
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="nav-link">
      {children}
    </a>
  )
}
