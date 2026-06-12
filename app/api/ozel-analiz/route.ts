import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapın.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('is_premium,premium_until')
    .eq('id', user.id)
    .single()

  const isPremium = profile?.is_premium && profile?.premium_until
    ? new Date(profile.premium_until) > new Date()
    : false

  if (!isPremium) {
    return NextResponse.json({ error: 'Premium üyelik gerekli.' }, { status: 403 })
  }

  const { matchId } = await req.json().catch(() => ({}))
  if (!matchId) return NextResponse.json({ error: 'matchId gerekli.' }, { status: 400 })

  // Daha önce üretilmiş analiz varsa döndür
  const { data: existing } = await supabase
    .from('match_analysis_requests')
    .select('analysis')
    .eq('user_id', user.id)
    .eq('match_id', matchId)
    .maybeSingle()

  if (existing?.analysis) {
    return NextResponse.json({ analysis: existing.analysis })
  }

  // Maç verisini çek
  const { data: match } = await supabase
    .from('matches')
    .select('home_team,away_team,league_name,match_time,confidence_score,prediction,prediction_confidence,home_xg,away_xg,home_form_score,away_form_score,critical_missing_effect,market_odds,h2h_data,missing_players,alternatives')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Maç bulunamadı.' }, { status: 404 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API anahtarı eksik.' }, { status: 500 })

  const anthropic = new Anthropic({ apiKey })

  const confPct = match.confidence_score ? Math.round(match.confidence_score * 100) : null
  const homeXg  = match.home_xg?.toFixed(2) ?? '—'
  const awayXg  = match.away_xg?.toFixed(2) ?? '—'
  const homeForm = match.home_form_score ? Math.round(match.home_form_score * 100) : null
  const awayForm = match.away_form_score ? Math.round(match.away_form_score * 100) : null
  const missingEffect = match.critical_missing_effect ? Math.round(match.critical_missing_effect * 100) : 0
  const h2h = match.h2h_data
  const missingNames = (match.missing_players ?? []).map((p: { name: string; reason: string }) => `${p.name} (${p.reason})`).join(', ')

  const odds = match.market_odds
    ? `MS1: ${match.market_odds.ms1 ?? '—'} | X: ${match.market_odds.x ?? '—'} | MS2: ${match.market_odds.ms2 ?? '—'} | 2.5 Üst: ${match.market_odds.over25 ?? '—'}`
    : 'Piyasa oranı yok'

  const alts = (match.alternatives ?? []).map((a: { prediction: string; confidence: number }) => `${a.prediction} %${a.confidence}`).join(', ')

  const prompt = `Sen uzman bir futbol analistisi ve profesyonel bahis danışmanısın. Aşağıdaki maç verilerini analiz et ve kapsamlı bir bahis raporu yaz.

MAÇ: ${match.home_team} - ${match.away_team}
LİG: ${match.league_name ?? '—'}
TARİH: ${new Date(match.match_time).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}

ALGORİTMA ANALİZİ:
- Güven Skoru: ${confPct ? `%${confPct}` : '—'}
- Ana Tahmin: ${match.prediction ?? '—'} (${match.prediction_confidence ? `%${match.prediction_confidence}` : '—'})
- Alternatif Tahminler: ${alts || '—'}

TAKTA VERİLERİ:
- Ev xG: ${homeXg} | Deplasman xG: ${awayXg}
- Ev Formu: ${homeForm ? `%${homeForm}` : '—'} | Deplasman Formu: ${awayForm ? `%${awayForm}` : '—'}
- Eksik Oyuncu Etkisi: ${missingEffect ? `%${missingEffect}` : 'Yok'}
- Eksik/Cezalı: ${missingNames || 'Yok'}

PİYASA ORANLARI:
${odds}

KAFA KAFAYA (H2H):
${h2h ? `Son ${h2h.total} maç: ${match.home_team} ${h2h.home_wins}G / ${h2h.draws}B / ${h2h.away_wins}G ${match.away_team}` : '—'}

Şimdi aşağıdaki 5 konuyu ele alarak Türkçe, akıcı bir analiz yaz. Her konu için ayrı paragraf kullan, başlık veya madde işareti KULLANMA:

1. Takım güç dengesi: xG, form ve kadro eksiklikleri neyi gösteriyor?
2. Kafa kafaya tarihsel desen: bu istatistikler tahmin için ne anlam taşıyor?
3. Bahis değeri: algoritmanın güven skoru piyasa oranlarıyla ne kadar örtüşüyor, pozitif bir beklenti değeri var mı?
4. Risk faktörleri: Bu maçta dikkat edilmesi gereken belirsizlikler neler?
5. Kesin öneri: En güvenilir bahis seçeneğin ne, neden?`

  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages:   [{ role: 'user', content: prompt }],
  })

  const analysis = response.content[0].type === 'text' ? response.content[0].text : ''

  if (analysis) {
    await supabase.from('match_analysis_requests').insert({
      user_id:  user.id,
      match_id: matchId,
      analysis,
      status:   'hazır',
    })
  }

  return NextResponse.json({ analysis })
}
