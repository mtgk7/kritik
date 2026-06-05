'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

type AdFormat = 'auto' | 'rectangle' | 'horizontal' | 'vertical'

interface AdSlotProps {
  slot: string                  // AdSense ad unit ID (data-ad-slot)
  format?: AdFormat
  style?: React.CSSProperties
  className?: string
}

export default function AdSlot({ slot, format = 'auto', style, className }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}
  }, [])

  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID
  if (!publisherId) return null  // AdSense ID yoksa boş render et

  return (
    <div className={className} style={{ overflow: 'hidden', textAlign: 'center', ...style }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
