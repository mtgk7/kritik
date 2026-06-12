'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

type AdFormat = 'auto' | 'fluid' | 'autorelaxed' | 'rectangle' | 'horizontal' | 'vertical'

interface AdSlotProps {
  slot: string
  format?: AdFormat
  layoutKey?: string
  layout?: string
  style?: React.CSSProperties
  className?: string
}

export default function AdSlot({ slot, format = 'auto', layoutKey, layout, style, className }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    if (adRef.current?.getAttribute('data-adsbygoogle-status')) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}
  }, [])

  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID
  if (!publisherId || !slot) return null

  return (
    <div className={className} style={{ overflow: 'hidden', textAlign: 'center', ...style }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layout ? { 'data-ad-layout': layout } : {})}
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
        {...(format !== 'fluid' && format !== 'autorelaxed' ? { 'data-full-width-responsive': 'true' } : {})}
      />
    </div>
  )
}
