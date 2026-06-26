'use client'

import { useState } from 'react'

type Props = { matchTime: string; home: string; away: string }

export default function HatirlatButton({ matchTime, home, away }: Props) {
  const [state, setState] = useState<'idle' | 'set' | 'denied' | 'past'>('idle')

  function remind() {
    if (!('Notification' in window)) {
      alert('Tarayıcınız bildirimleri desteklemiyor.')
      return
    }
    const diff = new Date(matchTime).getTime() - Date.now() - 15 * 60 * 1000
    if (diff < -60_000) { setState('past'); return }

    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') { setState('denied'); return }
      if (diff <= 0) {
        new Notification('Kritik — Maç Başlamak Üzere', {
          body: `${home} vs ${away} maçı 15 dakikadan az kaldı!`,
          icon: '/icon-192.png',
        })
        setState('set')
        return
      }
      setTimeout(() => {
        new Notification('Kritik — Maç Hatırlatıcı', {
          body: `${home} vs ${away} maçı 15 dakika sonra başlıyor!`,
          icon: '/icon-192.png',
        })
      }, diff)
      setState('set')
    })
  }

  const label = state === 'set'    ? 'Hatırlatıcı Kuruldu'
              : state === 'denied' ? 'Bildirim İzni Verilmedi'
              : state === 'past'   ? 'Maç Geçti'
              : 'Maçı Hatırlat'

  return (
    <button
      onClick={remind}
      disabled={state !== 'idle'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.4rem 0.9rem', borderRadius: '7px',
        border: '1.5px solid var(--color-border)',
        background: state === 'set' ? 'var(--color-accent-subtle)' : 'transparent',
        color: state === 'set' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        fontSize: '0.78rem', fontWeight: 600, cursor: state === 'idle' ? 'pointer' : 'default',
        fontFamily: 'var(--font-body)', transition: 'all 0.15s',
        opacity: state === 'denied' || state === 'past' ? 0.5 : 1,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {label}
    </button>
  )
}
