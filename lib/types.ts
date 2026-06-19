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
  avg_shots?: number
  avg_shots_on_target?: number
  avg_possession?: number
  avg_pass_accuracy?: number
  avg_corners?: number
  avg_fouls?: number
  avg_goals_first_half?: number
  avg_goals_second_half?: number
  avg_conceded_first_half?: number
  avg_conceded_second_half?: number
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
  prediction_correct: boolean | null
  market_odds: { ms1?: number; x?: number; ms2?: number; over25?: number; under25?: number } | null
  sofascore_id: number | null
  sofascore_home_id: number | null
  sofascore_away_id: number | null
  sofascore_slug: string | null
  sofascore_custom_id: string | null
  h2h_data: {
    matches: { date: string; home: string; away: string; home_score: number; away_score: number; result: string; tournament: string }[]
    home_wins: number
    draws: number
    away_wins: number
    total: number
  } | null
  created_at: string
}

export type CouponType = 'Banko' | 'xG Canavarı' | 'Premium Sürpriz' | 'BTTS' | 'Alt/Üst 2.5' | 'Alt/Üst 1.5' | 'Korner'

export type Coupon = {
  id: string
  coupon_type: CouponType
  matches: string[]
  total_rate: number | null
  is_premium: boolean
  is_editor_pick: boolean
  editor_note: string | null
  price_try: number | null
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
  notif_leagues: string[]
  notif_teams: string[]
  notif_min_conf: number
  notif_telegram: boolean
  referral_code: string | null
  referred_by: string | null
  trial_used: boolean
  telegram_chat_id: number | null
  telegram_verify_token: string | null
  created_at: string
}

export type MatchAnalysisRequest = {
  id: string
  user_id: string
  match_id: string
  status: string
  analysis: string | null
  created_at: string
}

export type Favorite = {
  id: string
  user_id: string
  match_id: string
  created_at: string
}

export type MatchOdds = {
  id: string
  match_id: string
  source: 'iddaa' | 'misli' | 'nesine'
  ms1: number | null
  x: number | null
  ms2: number | null
  over25: number | null
  under25: number | null
  kg_var: number | null
  kg_yok: number | null
  scraped_at: string
}

export type AiKuponMatch = {
  id: string
  home_team: string
  away_team: string
  league_name: string
  match_time: string
  confidence_score: number
  prediction: string
  prediction_confidence: number | null
  market_odds: { ms1?: number; x?: number; ms2?: number; over25?: number; under25?: number } | null
  reasoning: string
}
