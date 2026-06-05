import { ImageResponse } from 'next/og'
import { supabaseFetch } from '@/lib/supabase/public'
import { Match } from '@/lib/types'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await supabaseFetch<Match>(`matches?select=*&id=eq.${id}&limit=1`)
  const m = rows[0] ?? null

  const conf     = m?.confidence_score ?? 0
  const confPct  = Math.round(conf * 100)
  const confColor = conf >= 0.7 ? '#4ade80' : conf >= 0.55 ? '#facc15' : '#94a3b8'

  return new ImageResponse(
    <div
      style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '56px 64px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          KRİTİK
        </div>
        <div style={{ fontSize: 11, color: '#334155', marginLeft: 4 }}>
          Yapay Zeka Destekli İddaa Analizi
        </div>
      </div>

      {m ? (
        <>
          {/* Lig */}
          {m.league_name && (
            <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, display: 'flex' }}>
              {m.league_name}
            </div>
          )}

          {/* Takımlar */}
          <div style={{
            fontSize: 58, fontWeight: 900, color: '#f1f5f9',
            lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: '0.02em',
            marginBottom: 32, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
          }}>
            <span>{m.home_team}</span>
            <span style={{ color: '#334155', fontSize: 32, fontWeight: 500 }}>vs</span>
            <span>{m.away_team}</span>
          </div>

          {/* İstatistikler */}
          <div style={{ display: 'flex', gap: 48, alignItems: 'flex-end' }}>
            {confPct > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, display: 'flex' }}>Güven Skoru</div>
                <div style={{ fontSize: 72, fontWeight: 900, color: confColor, lineHeight: 1, display: 'flex' }}>%{confPct}</div>
              </div>
            )}
            {m.prediction && (
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, display: 'flex' }}>Tahmin</div>
                <div style={{ fontSize: 44, fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', display: 'flex' }}>{m.prediction}</div>
              </div>
            )}
            {m.home_xg != null && (
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, display: 'flex' }}>xG</div>
                <div style={{ fontSize: 44, fontWeight: 700, color: '#94a3b8', display: 'flex' }}>
                  {m.home_xg.toFixed(1)} / {m.away_xg?.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 48, fontWeight: 700, color: '#f1f5f9', display: 'flex' }}>Maç Analizi</div>
      )}
    </div>
  )
}
