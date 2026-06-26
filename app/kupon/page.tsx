import { supabaseFetch } from '@/lib/supabase/public'
import type { Match } from '@/lib/types'
import KuponClient from '@/components/KuponClient'

export const metadata = { title: 'Kupon Simülatörü — Kritik', description: 'Tahminleri kombine et, potansiyel kazancını hesapla.' }
export const revalidate = 300

export default async function KuponPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 2)

  const matches = await supabaseFetch<Match>(
    `matches?select=id,home_team,away_team,match_time,league_name,status,prediction,prediction_confidence,confidence_score,alternatives,market_odds`
    + `&status=neq.bitti`
    + `&match_time=gte.${today.toISOString()}`
    + `&match_time=lt.${tomorrow.toISOString()}`
    + `&order=match_time.asc`
  )

  return <KuponClient matches={matches} />
}
