'use client'

import { useState } from 'react'

export default function KuponAIOnerisi() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')

  async function handleClick() {
    setLoading(true)
    setMsg('')
    try {
      const res  = await fetch('/api/ai-kupon-oneri')
      const data = await res.json()
      const ids: string[] = (data.matches ?? []).map((m: { id: string }) => m.id)

      if (!ids.length) {
        setMsg('Uygun maç bulunamadı.')
        return
      }

      // Tüm checkbox'ları temizle
      document.querySelectorAll<HTMLInputElement>('input[name="match_ids"]')
        .forEach(cb => { cb.checked = false })

      // Önerilen maçları seç
      let found = 0
      ids.forEach(id => {
        const cb = document.querySelector<HTMLInputElement>(`input[name="match_ids"][value="${id}"]`)
        if (cb) { cb.checked = true; found++ }
      })

      setMsg(found > 0 ? `${found} maç seçildi` : 'Maçlar listede bulunamadı.')
    } catch {
      setMsg('Hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: '0.5rem 1rem', borderRadius: '7px', border: '1.5px solid var(--color-border)',
          background: 'var(--color-surface-2)', color: 'var(--color-text-primary)',
          fontSize: '0.82rem', fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'var(--font-body)', opacity: loading ? 0.6 : 1,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
        </svg>
        {loading ? 'Analiz ediliyor...' : 'AI Öneri Al'}
      </button>
      {msg && (
        <span style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 500 }}>
          ✓ {msg}
        </span>
      )}
    </div>
  )
}
