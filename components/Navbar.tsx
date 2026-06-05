import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import ThemeToggle from '@/components/ThemeToggle'

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
              fontSize: '1.25rem',
              letterSpacing: '0.1em',
              color: 'var(--color-text-on-dark)',
              textDecoration: 'none',
              textTransform: 'uppercase',
              border: '2px solid oklch(93% 0.005 255)',
              borderRadius: '6px',
              padding: '0.2rem 0.65rem',
              lineHeight: 1.4,
            }}
          >
            Kritik
          </a>

          <nav style={{ display: 'flex', gap: '0.25rem' }}>
            <NavLink href="/hizmetler">Ana Sayfa</NavLink>
            <NavLink href="/">Maçlar</NavLink>
            <NavLink href="/haberler">Haberler</NavLink>
            <NavLink href="/kuponlar">AI Hazır Kuponlar</NavLink>
            <NavLink href="/kuponlar#editor">Editörün Tahminleri</NavLink>
            <NavLink href="/istatistikler">İstatistik</NavLink>
            {isAdmin && <NavLink href="/admin">Admin</NavLink>}
          </nav>
        </div>

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ThemeToggle />
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
                  fontWeight: 700,
                  color: 'oklch(97% 0.005 255)',
                  background: 'linear-gradient(135deg, oklch(55% 0.18 35) 0%, oklch(42% 0.15 20) 100%)',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  padding: '0.35rem 0.85rem',
                  letterSpacing: '0.03em',
                  boxShadow: '0 1px 3px oklch(30% 0.1 35 / 0.4)',
                }}
              >
                ⭐ Premium Ol
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
