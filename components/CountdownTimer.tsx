'use client'
import { useState, useEffect } from 'react'

export default function CountdownTimer({ matchTime }: { matchTime: string }) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    function calc() {
      const diff = new Date(matchTime).getTime() - Date.now()
      if (diff <= 0 || diff > 6 * 3_600_000) { setLabel(null); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      setLabel(h > 0 ? `${h}s ${m}dk` : `${m}dk`)
    }
    calc()
    const id = setInterval(calc, 30_000)
    return () => clearInterval(id)
  }, [matchTime])

  if (!label) return null
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
      color: 'var(--color-warning)', fontFamily: 'var(--font-display)',
    }}>
      {label}
    </span>
  )
}
