import { supabaseFetch } from '@/lib/supabase/public'
import type { Match } from '@/lib/types'
import TakipClient from '@/components/TakipClient'

export const metadata = { title: 'Tahmin Takip — Kritik', description: 'Kritik tahminlerini takip etseydin ne kazanırdın?' }
export const revalidate = 3600

function isPredCorrect(m: Pick<Match, 'prediction' | 'home_score' | 'away_score' | 'prediction_correct'>): boolean | null {
  if (m.prediction_correct !== null && m.prediction_correct !== undefined) return m.prediction_correct
  if (!m.prediction || m.home_score == null || m.away_score == null) return null
  const p = m.prediction.toLowerCase()
  const h = m.home_score, a = m.away_score
  if (p === 'ms1') return h > a
  if (p === 'ms2') return a > h
  if (p === 'x')   return h === a
  if (p.includes('2.5 üst')) return h + a > 2
  if (p.includes('2.5 alt')) return h + a <= 2
  if (p.includes('kg var'))  return h > 0 && a > 0
  if (p.includes('kg yok'))  return h === 0 || a === 0
  return null
}

export default async function TakipPage() {
  const raw = await supabaseFetch<Match>(
    'matches?select=id,home_team,away_team,match_time,league_name,prediction,prediction_confidence,confidence_score,home_score,away_score,prediction_correct,market_odds'
    + '&status=eq.bitti&prediction=not.is.null&home_score=not.is.null&order=match_time.asc&limit=500'
  )

  const matches = raw
    .map(m => ({ ...m, _correct: isPredCorrect(m) }))
    .filter(m => m._correct !== null)

  // Her tahmin için hipotetik odds
  function impliedOdds(m: typeof matches[0]): number {
    const mo = m.market_odds as Record<string, number> | null
    const pred = (m.prediction ?? '').toUpperCase()
    const oddsMap: Record<string, number | undefined> = {
      MS1: mo?.ms1, X: mo?.x, MS2: mo?.ms2,
      '2.5 ÜST': mo?.over25, '2.5 ALT': mo?.under25,
    }
    const stored = oddsMap[pred]
    if (stored && stored > 1) return stored
    const conf = (m.confidence_score ?? 0.6)
    return conf > 0 ? Math.round((1 / conf) * 1.05 * 100) / 100 : 1.75
  }

  let cumPL = 0
  const timeline = matches.map(m => {
    const odds = impliedOdds(m)
    const pl   = m._correct ? Math.round(100 * (odds - 1)) : -100
    cumPL += pl
    return { ...m, odds, pl, cumPL }
  })

  return <TakipClient timeline={timeline} />
}
