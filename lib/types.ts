export type MissingPlayer = {
  name: string
  reason: string
  missed_matches_count: number
}

export type MatchStatus = 'yakında' | 'canlı' | 'bitti'

export type Last5Match = {
  result: 'G' | 'B' | 'M'
  opponent: string
  team_score: number
  opponent_score: number
  was_home: boolean
  date: string
}

export type Last5Data = {
  team: string
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  yellow_cards: number
  red_cards: number
  matches: Last5Match[]
}

export type Match = {
  id: string
  home_team: string
  away_team: string
  match_time: string
  league_name: string
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  home_xg: number | null
  away_xg: number | null
  home_form_score: number | null
  away_form_score: number | null
  critical_missing_effect: number | null
  confidence_score: number | null
  prediction: string | null
  prediction_confidence: number | null
  alternatives: { prediction: string; confidence: number }[]
  analysis: string | null
  missing_players: MissingPlayer[]
  home_last5_data: Last5Data | null
  away_last5_data: Last5Data | null
  is_free_preview: boolean
  created_at: string
}

export type CouponType = 'Banko' | 'xG Canavarı' | 'Premium Sürpriz'

export type Coupon = {
  id: string
  coupon_type: CouponType
  matches: string[]
  total_rate: number | null
  is_premium: boolean
  is_editor_pick: boolean
  editor_note: string | null
  created_at: string
}

export type NewsCategory = 'gunun_haberi' | 'haftanin_haberi' | 'genel'

export type News = {
  id: string
  title: string
  summary: string
  content: string | null
  source_url: string | null
  category: NewsCategory
  sport: string
  topic: string
  tag: string | null
  image_url: string | null
  published_at: string
  is_published: boolean
  created_at: string
}

export type User = {
  id: string
  username: string | null
  email: string
  is_premium: boolean
  premium_until: string | null
  created_at: string
}
