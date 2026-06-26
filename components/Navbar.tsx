import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import ThemeToggle from '@/components/ThemeToggle'
import NavMobileMenu from '@/components/NavMobileMenu'

const ADMIN_EMAIL = 'gokbukmert@gmail.com'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === ADMIN_EMAIL

  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('users').select('is_premium,premium_until').eq('id', user.id).single()
    isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
  }

  const links = [
    { href: '/hizmetler',         label: 'Ana Sayfa' },
    { href: '/',                   label: 'Maçlar' },
    { href: '/tahminler/bugun',   label: 'Bugün' },
    { href: '/sonuclar',          label: 'Sonuçlar' },
    { href: '/karli-tahminler',   label: 'Kârlı' },
    { href: '/kupon',             label: 'Kupon' },
    { href: '/takip',             label: 'Takip' },
    { href: '/haberler',          label: 'Haberler' },
    ...(isPremium ? [{ href: '/oneriler', label: 'AI Önerileri' }] : []),
    { href: '/editor-tahminleri', label: 'Editör' },
    { href: '/istatistikler',     label: 'İstatistikler' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header style={{ background: 'var(--color-header)', borderBottom: '1px solid oklch(22% 0.016 255)', position: 'relative', zIndex: 50 }}>
      <div style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '0 var(--page-pad)', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
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
          <span className="nav-slogan" style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ color: 'var(--color-text-on-dark)' }}>TAHMİN DEĞİL, </span>
            <span style={{ color: 'var(--color-accent)' }}>ANALİZ.</span>
          </span>
        </div>

        {/* Desktop nav — gizlenir ≤860px */}
        <nav className="nav-desktop" style={{ gap: '0.25rem', flex: 1 }}>
          {links.map(l => (
            <NavLink key={l.href} href={l.href}>{l.label}</NavLink>
          ))}
        </nav>

        {/* Desktop auth — gizlenir ≤860px */}
        <div className="nav-desktop nav-auth" style={{ alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
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
                <button type="submit" className="btn-ghost">Çıkış</button>
              </form>
            </>
          ) : (
            <>
              <a href="/giris" style={{ fontSize: '0.8rem', color: 'var(--color-text-on-dark-2)', textDecoration: 'none', padding: '0.35rem 0.5rem' }}>
                Giriş Yap
              </a>
              <a
                href="/kayit"
                style={{
                  fontSize: '0.8rem', fontWeight: 700,
                  color: 'oklch(97% 0.005 255)',
                  background: 'linear-gradient(135deg, oklch(55% 0.18 35) 0%, oklch(42% 0.15 20) 100%)',
                  textDecoration: 'none', borderRadius: '6px',
                  padding: '0.35rem 0.85rem', letterSpacing: '0.03em',
                  boxShadow: '0 1px 3px oklch(30% 0.1 35 / 0.4)',
                }}
              >
                ⭐ Premium Ol
              </a>
            </>
          )}
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="nav-mobile-actions" style={{ alignItems: 'center', gap: '0.25rem' }}>
          <ThemeToggle />
          <NavMobileMenu links={links} userEmail={user?.email ?? null} />
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
