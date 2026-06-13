import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

function getAnthropicClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY tanımlı değil')
  return new Anthropic({ apiKey: key })
}

// ── İddaa.com canlı oran çekici ──────────────────────────────────────────────

type OddsMap = Map<string, { ms1?: number; x?: number; ms2?: number; over25?: number; under25?: number }>

const TR_MAP: Record<string, string> = {
  ç: 'c', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ı: 'i',
  Ç: 'C', Ş: 'S', Ğ: 'G', Ü: 'U', Ö: 'O', İ: 'I',
}
function norm(name: string) {
  return name.toLowerCase().replace(/[çşğüöıÇŞĞÜÖİ]/g, c => TR_MAP[c] ?? c).trim()
}

// DB İngilizce takım isimleri → iddaa.com Türkçe isimleri
const TEAM_EN_TO_TR: Record<string, string> = {
  // Avrupa
  'france': 'fransa', 'netherlands': 'hollanda', 'holland': 'hollanda',
  'spain': 'ispanya', 'germany': 'almanya', 'england': 'ingiltere',
  'portugal': 'portekiz', 'italy': 'italya', 'belgium': 'belcika',
  'switzerland': 'isvicre', 'denmark': 'danimarka', 'croatia': 'hirvatistan',
  'serbia': 'sirbistan', 'poland': 'polonya', 'ukraine': 'ukrayna',
  'scotland': 'iskocya', 'austria': 'avusturya', 'romania': 'romanya',
  'hungary': 'macaristan', 'norway': 'norvec', 'sweden': 'isvec',
  'finland': 'finlandiya', 'iceland': 'izlanda', 'albania': 'arnavutluk',
  'slovakia': 'slovakya', 'slovenia': 'slovenya', 'czechia': 'cekya',
  'czech republic': 'cekya', 'north macedonia': 'kuzey makedonya',
  'montenegro': 'karadag', 'turkey': 'turkiye', 'russia': 'rusya',
  'wales': 'galler', 'greece': 'yunanistan', 'israel': 'israil',
  'bosnia': 'bosna hersek', 'bosnia and herzegovina': 'bosna hersek',
  'kosovo': 'kosova', 'luxembourg': 'luksemburg', 'moldova': 'moldova',
  // Amerika
  'brazil': 'brezilya', 'argentina': 'arjantin', 'colombia': 'kolombiya',
  'ecuador': 'ekvador', 'chile': 'sili', 'mexico': 'meksika',
  'costa rica': 'kosta rika', 'usa': 'abd', 'united states': 'abd',
  'canada': 'kanada', 'panama': 'panama', 'jamaica': 'jamaika',
  'uruguay': 'uruguay', 'peru': 'peru', 'venezuela': 'venezuela',
  'bolivia': 'bolivya', 'paraguay': 'paraguay', 'honduras': 'honduras',
  'trinidad and tobago': 'trinidad ve tobago', 'curacao': 'curacao',
  // Afrika
  'ivory coast': 'fildisi sahili', "cote d'ivoire": 'fildisi sahili',
  'morocco': 'fas', 'nigeria': 'nijerya', 'cameroon': 'kamerun',
  'ghana': 'gana', 'algeria': 'cezayir', 'tunisia': 'tunus',
  'senegal': 'senegal', 'egypt': 'misir', 'south africa': 'guney afrika',
  'mali': 'mali', 'zambia': 'zambiya', 'kenya': 'kenya',
  // Asya & Okyanusya
  'japan': 'japonya', 'south korea': 'guney kore', 'korea republic': 'guney kore',
  'australia': 'avustralya', 'iran': 'iran', 'iraq': 'irak',
  'saudi arabia': 'suudi arabistan', 'new zealand': 'yeni zelanda',
  'china': 'cin', 'india': 'hindistan', 'qatar': 'katar',
}

function toTurkishTeam(name: string): string {
  const lower = name.toLowerCase().trim()
  return TEAM_EN_TO_TR[lower] ?? lower
}

async function fetchIddaaOdds(): Promise<OddsMap> {
  const map: OddsMap = new Map()
  try {
    // Tek çağrıyla tüm futbol maçlarını çek
    const res = await fetch('https://sportsbookv2.iddaa.com/sportsbook/events?st=1&type=0&version=0', {
      headers: {
        'Accept': 'application/json',
        'Referer': 'https://www.iddaa.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return map
    const data = await res.json()
    const events: {
      hn?: string; an?: string;
      m?: { t: number; st: number; sov?: string; o?: { n: string; odd: number }[] }[]
    }[] = data?.data?.events ?? []

    for (const e of events) {
      const home = e.hn ?? ''
      const away = e.an ?? ''
      if (!home || !away) continue

      let ms1: number | undefined, x: number | undefined, ms2: number | undefined
      let over25: number | undefined, under25: number | undefined

      for (const m of e.m ?? []) {
        // Maç sonucu: t=1, st=1
        if (m.t === 1 && m.st === 1) {
          for (const o of m.o ?? []) {
            if (o.n === '1')      ms1 = o.odd
            else if (o.n === '0') x   = o.odd
            else if (o.n === '2') ms2 = o.odd
          }
        }
        // 2.5 Üst/Alt: t=2, st=101, sov=2.5
        if (m.t === 2 && m.st === 101 && m.sov === '2.5') {
          for (const o of m.o ?? []) {
            if (o.n === 'Üst')     over25  = o.odd
            else if (o.n === 'Alt') under25 = o.odd
          }
        }
      }

      if (ms1 || ms2) {
        map.set(`${norm(home)}|${norm(away)}`, { ms1, x, ms2, over25, under25 })
      }
    }
  } catch {
    // iddaa erişilemez, fallback kullanılacak
  }

  return map
}

// ── Ana route ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Giriş yapmalısınız.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('is_premium,premium_until').eq('id', user.id).single()
  const isPremium = !!(profile?.is_premium && profile?.premium_until && new Date(profile.premium_until) > new Date())
  if (!isPremium) return NextResponse.json({ error: 'Bu özellik premium üyelere özeldir.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const minConf: number = parseFloat(body.minConfidence) || 0.55
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

  // İddaa oranlarını canlı çek (DB'de yoksa)
  const anyMissing = matches.some(m => !m.market_odds)
  const iddaaOdds: OddsMap = anyMissing ? await fetchIddaaOdds() : new Map()

  // Her maça iddaa oranlarını uygula (DB'deki varsa onu koru)
  const enriched = matches.map(m => {
    if (m.market_odds) return m
    const key = `${norm(toTurkishTeam(m.home_team))}|${norm(toTurkishTeam(m.away_team))}`
    const live = iddaaOdds.get(key)
    return live ? { ...m, market_odds: live } : m
  })

  const pool = enriched.slice(0, Math.max(count * 2, 8))

  // Claude ile analiz
  const matchList = pool.map((m, i) => {
    const conf     = Math.round((m.confidence_score ?? 0) * 100)
    const xgInfo   = m.home_xg != null ? `xG: ${Number(m.home_xg).toFixed(2)}-${Number(m.away_xg ?? 0).toFixed(2)}` : ''
    const formInfo = m.home_form_score != null ? `Form: %${Math.round(Number(m.home_form_score) * 100)}-%${Math.round(Number(m.away_form_score ?? 0) * 100)}` : ''
    const missing  = (m.missing_players ?? []).length
    const mo       = m.market_odds as { ms1?: number; x?: number; ms2?: number } | null
    const oddsInfo = mo?.ms1 ? `Oran: ${mo.ms1}/${mo.x ?? '-'}/${mo.ms2}` : ''
    return `${i + 1}. ${m.home_team} - ${m.away_team} (${m.league_name}) | Tahmin: ${m.prediction} | Güven: %${conf} | ${[xgInfo, formInfo, oddsInfo].filter(Boolean).join(' | ')}${missing > 0 ? ` | ${missing} eksik oyuncu` : ''}`.trim()
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

  // Fallback
  if (parsed.length < count) {
    for (let i = 0; i < pool.length && parsed.length < count; i++) {
      if (!parsed.find(p => p.idx === i)) parsed.push({ idx: i, reasoning: '' })
    }
  }

  const selected = parsed.slice(0, count).map(({ idx, reasoning }) => ({
    ...pool[idx],
    reasoning: reasoning || `%${Math.round((pool[idx].confidence_score ?? 0) * 100)} güven skoru ile algoritmamızın öne çıkardığı maç.`,
  }))

  // Toplam oran — iddaa oranı varsa kullan, yoksa 1/confidence_score
  const totalOdds = selected.reduce((acc, m) => {
    const pred = (m.prediction ?? '').toLowerCase()
    const mo   = m.market_odds as { ms1?: number; x?: number; ms2?: number; over25?: number; under25?: number } | null
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
