'use client'

import { useState } from 'react'
import { signOut } from '@/app/actions/auth'

interface NavLink { href: string; label: string }

export default function NavMobileMenu({
  links,
  userEmail,
}: {
  links: NavLink[]
  userEmail: string | null
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="nav-hamburger"
        aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
        aria-expanded={open}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        )}
      </button>

      {open && <div className="mobile-nav-overlay" onClick={close} />}

      <nav className={`mobile-nav-drawer${open ? ' mobile-nav-open' : ''}`} aria-hidden={!open}>
        {links.map(link => (
          <a key={link.href} href={link.href} className="mobile-nav-link" onClick={close}>
            {link.label}
          </a>
        ))}

        <div className="mobile-nav-divider" />

        {userEmail ? (
          <>
            <a href="/profil" className="mobile-nav-link mobile-nav-email" onClick={close}>
              {userEmail}
            </a>
            <form action={signOut} style={{ margin: 0 }}>
              <button type="submit" className="mobile-nav-signout">Çıkış Yap</button>
            </form>
          </>
        ) : (
          <>
            <a href="/giris" className="mobile-nav-link" onClick={close}>Giriş Yap</a>
            <a href="/kayit" className="mobile-nav-cta" onClick={close}>⭐ Premium Ol</a>
          </>
        )}
      </nav>
    </>
  )
}
