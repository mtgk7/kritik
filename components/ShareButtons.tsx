'use client'

type Props = { title: string; url: string }

export default function ShareButtons({ title, url }: Props) {
  const encoded = encodeURIComponent(url)
  const text    = encodeURIComponent(`${title} — Kritik Analizi`)

  const handleNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link kopyalandı!')
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Paylaş
      </span>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${text}%20${encoded}`}
        target="_blank" rel="noopener noreferrer"
        style={btnStyle('#25D366')}
        aria-label="WhatsApp'ta paylaş"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.121.554 4.11 1.523 5.837L.057 23.428a.5.5 0 0 0 .608.628l5.77-1.513A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.65-.503-5.17-1.382l-.37-.217-3.426.899.915-3.342-.24-.386A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </a>

      {/* X / Twitter */}
      <a
        href={`https://x.com/intent/tweet?text=${text}&url=${encoded}`}
        target="_blank" rel="noopener noreferrer"
        style={btnStyle('#000')}
        aria-label="X'te paylaş"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </a>

      {/* Kopyala / Native share */}
      <button
        onClick={handleNative}
        style={{ ...btnStyle('var(--color-border-strong)'), cursor: 'pointer', border: 'none' }}
        aria-label="Linki kopyala"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
    </div>
  )
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '30px', height: '30px', borderRadius: '7px',
    background: bg, color: '#fff', textDecoration: 'none', flexShrink: 0,
  }
}
