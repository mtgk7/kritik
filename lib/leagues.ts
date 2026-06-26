export interface LeagueMeta {
  name: string
  slug: string
  country: string
  keywords: string[]
  description: string
}

export const LEAGUES: LeagueMeta[] = [
  {
    name: 'Süper Lig',
    slug: 'super-lig',
    country: 'Türkiye',
    keywords: ['Süper Lig tahminleri', 'Türkiye futbol tahminleri', 'TFF 1. Lig analizi', 'Galatasaray Fenerbahçe tahmin'],
    description: 'Türkiye Süper Lig maçlarının yapay zeka destekli analiz ve tahminleri. xG, form skoru ve güven oranıyla en doğru sonuç.',
  },
  {
    name: 'Şampiyonlar Ligi',
    slug: 'sampiyonlar-ligi',
    country: 'Avrupa',
    keywords: ['Şampiyonlar Ligi tahminleri', 'UEFA Champions League analizi', 'UCL maç tahmini'],
    description: 'UEFA Şampiyonlar Ligi maçlarına yapay zeka tahmini. H2H, form ve istatistiksel model ile güvenilir analiz.',
  },
  {
    name: 'Premier Lig',
    slug: 'premier-lig',
    country: 'İngiltere',
    keywords: ['Premier Lig tahminleri', 'İngiltere futbol analizi', 'EPL maç tahmini', 'Premier League tahmin'],
    description: 'İngiltere Premier Lig maçlarının AI destekli tahminleri. xG modeli ve son form analiziyle isabetli öngörüler.',
  },
  {
    name: 'La Liga',
    slug: 'la-liga',
    country: 'İspanya',
    keywords: ['La Liga tahminleri', 'İspanya futbol analizi', 'Barcelona Real Madrid tahmini'],
    description: 'İspanya La Liga maçlarına yapay zeka analizi. Barcelona, Real Madrid ve diğer takımlar için tahmin ve istatistik.',
  },
  {
    name: 'Bundesliga',
    slug: 'bundesliga',
    country: 'Almanya',
    keywords: ['Bundesliga tahminleri', 'Almanya futbol analizi', 'Bayern München tahmini'],
    description: 'Almanya Bundesliga maçları için AI destekli tahmin. Bayern, Dortmund ve diğer takımlar için güvenilir analiz.',
  },
  {
    name: 'Serie A',
    slug: 'serie-a',
    country: 'İtalya',
    keywords: ['Serie A tahminleri', 'İtalya futbol analizi', 'Juventus Inter Milan tahmini'],
    description: 'İtalya Serie A maçlarının yapay zeka destekli tahminleri. xG ve istatistiksel modellerle isabetli öngörüler.',
  },
  {
    name: 'Ligue 1',
    slug: 'ligue-1',
    country: 'Fransa',
    keywords: ['Ligue 1 tahminleri', 'Fransa futbol analizi', 'PSG maç tahmini'],
    description: 'Fransa Ligue 1 maçları için AI analizi. PSG ve diğer takımların form, xG ve güven skoru değerlendirmesi.',
  },
  {
    name: 'Avrupa Ligi',
    slug: 'avrupa-ligi',
    country: 'Avrupa',
    keywords: ['Avrupa Ligi tahminleri', 'UEFA Europa League analizi', 'UEL maç tahmini'],
    description: 'UEFA Avrupa Ligi maçları için yapay zeka destekli tahmin ve analiz. Güncel form ve istatistiklerle öngörüler.',
  },
  {
    name: 'Dünya Kupası 2026',
    slug: 'dunya-kupasi-2026',
    country: 'Dünya',
    keywords: ['Dünya Kupası 2026 tahminleri', 'FIFA World Cup 2026 analizi', 'WC 2026 maç tahmini'],
    description: '2026 FIFA Dünya Kupası maçlarına yapay zeka tahmini. Grup aşaması ve eleme maçları için güvenilir analiz.',
  },
]

export const LEAGUE_BY_SLUG = Object.fromEntries(LEAGUES.map(l => [l.slug, l]))
export const LEAGUE_BY_NAME = Object.fromEntries(LEAGUES.map(l => [l.name, l]))

export function leagueSlug(name: string): string {
  return LEAGUE_BY_NAME[name]?.slug ?? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
