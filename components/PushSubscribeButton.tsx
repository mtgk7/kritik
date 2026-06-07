'use client'

import { useEffect, useState } from 'react'

export default function PushSubscribeButton() {
  const [state, setState] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'idle'>('loading')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported'); return
    }
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription()
    ).then(sub => {
      setState(sub ? 'subscribed' : Notification.permission === 'denied' ? 'denied' : 'idle')
    }).catch(() => setState('idle'))
  }, [])

  async function subscribe() {
    setState('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setState('subscribed')
    } catch {
      setState(Notification.permission === 'denied' ? 'denied' : 'idle')
    }
  }

  async function unsubscribe() {
    setState('loading')
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
    setState('idle')
  }

  if (state === 'loading')    return null
  if (state === 'unsupported') return null

  if (state === 'denied') return (
    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
      Bildirimler tarayıcı tarafından engellendi. Tarayıcı ayarlarından izin ver.
    </p>
  )

  if (state === 'subscribed') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 500 }}>
        🔔 Bildirimler aktif
      </span>
      <button onClick={unsubscribe} style={{
        fontSize: '0.72rem', color: 'var(--color-text-tertiary)', background: 'none',
        border: '1px solid var(--color-border)', borderRadius: '6px',
        padding: '0.25rem 0.6rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
      }}>
        Kapat
      </button>
    </div>
  )

  return (
    <button onClick={subscribe} style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      fontSize: '0.82rem', fontWeight: 600,
      color: 'var(--color-text-primary)',
      background: 'var(--color-surface-2)',
      border: '1.5px solid var(--color-border)',
      borderRadius: '8px', padding: '0.5rem 1rem',
      cursor: 'pointer', fontFamily: 'var(--font-body)',
      transition: 'border-color 0.15s',
    }}>
      🔔 Maç bildirimlerini aç
    </button>
  )
}

function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
