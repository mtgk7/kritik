export type MissingPlayer = {
  name: string
  reason: string
  missed_matches_count: number
}

export type MatchStatus = 'yakında' | 'canlı' | 'bitti'

export type Match = {
  id: string
  home_team: string
  away_team: string
  match_time: string
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
  created_at: string
}

export type CouponType = 'Banko' | 'xG Canavarı' | 'Premium Sürpriz'

export type Coupon = {
  id: string
  coupon_type: CouponType
  matches: string[]
  total_rate: number | null
  is_premium: boolean
  created_at: string
}

export type NewsCategory = 'gunun_haberi' | 'haftanin_haberi' | 'genel'

export type News = {
  id: string
  title: string
  summary: string
  category: NewsCategory
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
