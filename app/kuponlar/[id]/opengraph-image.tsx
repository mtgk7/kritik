import { ImageResponse } from 'next/og'
import { supabaseFetch } from '@/lib/supabase/public'
import { Coupon } from '@/lib/types'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TYPE_COLOR: Record<string, string> = {
  'Banko':           '#4ade80',
  'xG Canavarı':     '#60a5fa',
  'Premium Sürpriz': '#fbbf24',
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await supabaseFetch<Coupon>(`coupons?select=*&id=eq.${id}&limit=1`)
  const c = rows[0] ?? null

  const accent = c ? (TYPE_COLOR[c.coupon_type] ?? '#94a3b8') : '#94a3b8'

  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '56px 64px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          KRİTİK
        </div>
      </div>

      {c ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 6, height: 56, borderRadius: 99, background: accent, flexShrink: 0, display: 'flex' }} />
            <div style={{ fontSize: 64, fontWeight: 900, color: accent, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1, display: 'flex' }}>
              {c.coupon_type}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 48, alignItems: 'flex-end' }}>
            {c.total_rate != null && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, display: 'flex' }}>Toplam Oran</div>
                <div style={{ fontSize: 80, fontWeight: 900, color: '#f1f5f9', lineHeight: 1, display: 'flex' }}>{c.total_rate.toFixed(2)}</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, display: 'flex' }}>Maç Sayısı</div>
              <div style={{ fontSize: 80, fontWeight: 900, color: '#94a3b8', lineHeight: 1, display: 'flex' }}>{c.matches.length}</div>
            </div>
            {c.is_premium && (
              <div style={{ display: 'flex', marginBottom: 16, padding: '6px 16px', background: 'rgba(251,191,36,0.15)', borderRadius: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex' }}>⭐ Premium</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 48, fontWeight: 700, color: '#f1f5f9', display: 'flex' }}>Öneri Analizi</div>
      )}
    </div>
  )
}
