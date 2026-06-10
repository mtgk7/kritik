'use client'

import { useState } from 'react'

export default function ReferralCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard errors on non-HTTPS or older browsers
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        fontSize: '0.78rem', fontWeight: 600,
        color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)',
        padding: '0.55rem 1rem',
        border: `1.5px solid ${copied ? 'var(--color-success)' : 'var(--color-border)'}`,
        borderRadius: '7px', whiteSpace: 'nowrap',
        background: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {copied ? '✓ Kopyalandı!' : 'Linki Kopyala'}
    </button>
  )
}
