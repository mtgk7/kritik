import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

function getAnthropicClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY tanımlı değil')
  return new Anthropic({ apiKey: key })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Giriş yapmalısınız.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('is_premium,premium_until').eq('id', user.id).single()
  const isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
  if (!isPremium) return NextResponse.json({ error: 'Bu özellik premium üyelere özeldir.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const minConf: number   = parseFloat(body.minConfidence) || 0.55
  const leagueFilter: string | null = body.league && body.league !== 'tümü' ? String(body.league) : null
  const count: number = Math.min(Math.max(parseInt(body.count) || 3, 2), 5)

  const selectCols = 'id,home_team,away_team,league_name,match_time,confidence_score,prediction,prediction_confidence,home_xg,away_xg,home_form_score,away_form_score,missing_players,market_odds'

  const base = supabase
    .from('matches')
    .select(selectCols)
    .neq('status', 'bitti')
    .not('confidence_score', 'is', null)
    .not('prediction', 'is', null)
    .gte('confidence_score', minConf)
    .order('confidence_score', { ascending: false })
    .limit(20)

  const { data: matches } = leagueFilter
    ? await base.ilike('league_name', `%${leagueFilter}%`)
    : await base

  if (!matches || matches.length === 0) {
    return NextResponse.json({
      error: `%${Math.round(minConf * 100)}+ güven skorlu${leagueFilter ? ` ${leagueFilter}` : ''} maç bulunamadı. Eşiği düşürmeyi deneyin.`,
    }, { status: 404 })
  }

  const pool = matches.slice(0, Math.max(count * 2, 8))

  // Claude ile analiz
  const matchList = pool.map((m, i) => {
    const conf        = Math.round((m.confidence_score ?? 0) * 100)
    const xgInfo      = m.home_xg != null ? `xG: ${Number(m.home_xg).toFixed(2)} - ${Number(m.away_xg ?? 0).toFixed(2)}` : ''
    const formInfo    = m.home_form_score != null ? `Form: %${Math.round(Number(m.home_form_score) * 100)} - %${Math.round(Number(m.away_form_score ?? 0) * 100)}` : ''
    const missingCnt  = (m.missing_players ?? []).length
    return `${i + 1}. ${m.home_team} - ${m.away_team} (${m.league_name}) | Tahmin: ${m.prediction} | Güven: %${conf} | ${xgInfo} ${formInfo}${missingCnt > 0 ? ` | ${missingCnt} eksik oyuncu` : ''}`.trim()
  }).join('\n')

  let parsed: { idx: number; reasoning: string }[] = []
  let summary = ''

  try {
    const anthropic = getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 900,
      system: 'Sen Kritik platformunun futbol analiz algoritmasısın. Kullanıcıya en iyi kombinasyon kuponunu oluşturuyorsun. Türkçe yanıt ver. Nesnel, analitik ve özlü ol.',
      messages: [{
        role: 'user',
        content:
          `Aşağıdaki ${pool.length} maçtan en güçlü ${count} tanesini seç ve kombinasyon kuponu oluştur.\n\n` +
          `MAÇLAR:\n${matchList}\n\n` +
          `GÖREV:\n` +
          `1. En iyi ${count} maçı seç (güven skoru, xG dengesi ve risk faktörlerini göz önünde bulundur)\n` +
          `2. Her seçim için 1-2 cümle gerekçe yaz\n` +
          `3. Kuponu kısaca değerlendir\n\n` +
          `YANIT FORMATI (başka hiçbir şey yazma):\n` +
          `SEÇİLEN_MAÇLAR:\n` +
          `[numara]|[gerekçe]\n` +
          `...\n` +
          `ÖZET:\n` +
          `[2-3 cümle]`,
      }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const matchSection = raw.match(/SEÇİLEN_MAÇLAR:\n([\s\S]*?)(?:ÖZET:|$)/)?.[1] ?? ''
    for (const line of matchSection.trim().split('\n')) {
      const parts = line.split('|')
      const idx   = parseInt(parts[0]?.trim()) - 1
      if (!isNaN(idx) && idx >= 0 && idx < pool.length) {
        parsed.push({ idx, reasoning: parts.slice(1).join('|').trim() })
      }
    }
    summary = raw.match(/ÖZET:\n([\s\S]*)$/)?.[1]?.trim() ?? ''
  } catch (e) {
    console.error('Claude hatası:', e)
  }

  // Fallback: eksik seçimler için baştan doldur
  if (parsed.length < count) {
    for (let i = 0; i < pool.length && parsed.length < count; i++) {
      if (!parsed.find(p => p.idx === i)) parsed.push({ idx: i, reasoning: '' })
    }
  }

  const selected = parsed.slice(0, count).map(({ idx, reasoning }) => ({
    ...pool[idx],
    reasoning: reasoning || `%${Math.round((pool[idx].confidence_score ?? 0) * 100)} güven skoru ile algoritmamızın öne çıkardığı maç.`,
  }))

  // Toplam oran hesapla
  const totalOdds = selected.reduce((acc, m) => {
    const pred = (m.prediction ?? '').toLowerCase()
    const mo   = m.market_odds as Record<string, number> | null
    const odd  = mo
      ? (pred === 'ms1' ? mo.ms1 : pred === 'ms2' ? mo.ms2 : pred === 'x' ? mo.x
        : pred.includes('üst') ? mo.over25 : pred.includes('alt') ? mo.under25 : null) ?? null
      : null
    const factor = odd ?? (m.confidence_score > 0 ? Math.round((1 / m.confidence_score) * 100) / 100 : 1)
    return acc * factor
  }, 1)

  return NextResponse.json({
    matches: selected,
    summary,
    totalOdds: Math.round(totalOdds * 100) / 100,
    criteria: { minConfidence: minConf, league: leagueFilter ?? 'Tümü', count },
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select('id,home_team,away_team,league_name,confidence_score,prediction,match_time')
    .neq('status', 'bitti')
    .not('confidence_score', 'is', null)
    .not('prediction', 'is', null)
    .order('confidence_score', { ascending: false })
    .limit(3)
  return NextResponse.json({ matches: data ?? [] })
}
