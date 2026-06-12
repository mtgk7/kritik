import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const SITE    = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kritik-wine.vercel.app').replace(/\/$/, '')
const FROM    = process.env.EMAIL_FROM ?? 'Kritik <noreply@kritik.app>'
const SECRET  = process.env.ALGORITHM_SECRET ?? ''

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function buildHtml(pastMatches: PastMatch[], upcoming: UpcomingMatch[], accuracy: number | null): string {
  const pastRows = pastMatches.slice(0, 6).map(m => {
    const correct = m.prediction_correct
    const icon    = correct === true ? '✅' : correct === false ? '❌' : '—'
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb">
          <div style="font-weight:600;color:#111827;font-size:0.9rem">${m.home_team} vs ${m.away_team}</div>
          <div style="font-size:0.75rem;color:#6b7280;margin-top:2px">${m.league_name ?? ''}</div>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:1rem">${icon}</td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right">
          <a href="${SITE}/maclar/${m.id}" style="color:#dc2626;font-weight:600;font-size:0.8rem;text-decoration:none">Detay →</a>
        </td>
      </tr>`
  }).join('')

  const upcomingRows = upcoming.slice(0, 4).map(m => {
    const conf = Math.round((m.confidence_score ?? 0) * 100)
    const date = new Date(m.match_time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb">
          <div style="font-weight:600;color:#111827;font-size:0.9rem">${m.home_team} vs ${m.away_team}</div>
          <div style="font-size:0.75rem;color:#6b7280;margin-top:2px">${m.league_name ?? ''} · ${date}</div>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center">
          <span style="font-size:1.1rem;font-weight:800;color:#16a34a">%${conf}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right">
          <a href="${SITE}/maclar/${m.id}" style="color:#dc2626;font-weight:600;font-size:0.8rem;text-decoration:none">Analiz →</a>
        </td>
      </tr>`
  }).join('')

  const accuracyBlock = accuracy !== null ? `
    <div style="margin-bottom:28px;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center">
      <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px">Geçen Hafta Algoritma İsabeti</div>
      <div style="font-size:2.5rem;font-weight:900;color:#16a34a;line-height:1">%${accuracy}</div>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#111827;padding:24px 32px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#6b7280;margin-bottom:6px">KRİTİK · HAFTALIK ÖZET</div>
      <h1 style="margin:0;font-size:1.3rem;font-weight:900;color:#f9fafb;text-transform:uppercase;letter-spacing:0.04em">
        Tahmin değil, analiz.
      </h1>
    </div>
    <div style="padding:28px 32px">
      ${accuracyBlock}

      ${pastMatches.length > 0 ? `
      <h2 style="margin:0 0 16px;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af">Geçen Haftanın Tahminleri</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <tbody>${pastRows}</tbody>
      </table>` : ''}

      ${upcoming.length > 0 ? `
      <h2 style="margin:0 0 16px;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af">Bu Haftanın Öne Çıkan Maçları</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <tbody>${upcomingRows}</tbody>
      </table>` : ''}

      <a href="${SITE}" style="display:block;text-align:center;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;padding:13px;font-weight:700;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.06em">
        Tüm Analizleri Gör →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb;font-size:0.72rem;color:#9ca3af">
      Kritik üyesisiniz · <a href="${SITE}/profil" style="color:#9ca3af">Bildirimleri yönet</a>
    </div>
  </div>
</body>
</html>`
}

interface PastMatch {
  id: string
  home_team: string
  away_team: string
  league_name: string | null
  prediction_correct: boolean | null
}

interface UpcomingMatch {
  id: string
  home_team: string
  away_team: string
  league_name: string | null
  confidence_score: number | null
  match_time: string
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!SECRET || auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const db   = serviceClient()
  const now  = new Date()
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const end  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [{ data: users }, { data: past }, { data: upcoming }] = await Promise.all([
    db.from('users').select('email').not('email', 'is', null),
    db.from('matches')
      .select('id,home_team,away_team,league_name,prediction_correct')
      .eq('status', 'bitti')
      .not('prediction_correct', 'is', null)
      .gte('match_time', week.toISOString())
      .lt('match_time', now.toISOString())
      .order('confidence_score', { ascending: false })
      .limit(10),
    db.from('matches')
      .select('id,home_team,away_team,league_name,confidence_score,match_time')
      .eq('status', 'yakında')
      .gte('match_time', now.toISOString())
      .lt('match_time', end.toISOString())
      .gte('confidence_score', 0.60)
      .order('confidence_score', { ascending: false })
      .limit(6),
  ])

  const pastMatches    = (past ?? []) as PastMatch[]
  const upcomingMatch  = (upcoming ?? []) as UpcomingMatch[]

  const correct  = pastMatches.filter(m => m.prediction_correct === true).length
  const accuracy = pastMatches.length >= 3 ? Math.round((correct / pastMatches.length) * 100) : null

  if (!users?.length) {
    return NextResponse.json({ sent: 0, skipped: 'no users' })
  }

  const html    = buildHtml(pastMatches, upcomingMatch, accuracy)
  const subject = `Kritik Haftalık Özet${accuracy !== null ? ` — %${accuracy} isabet` : ''}`

  const batches = []
  for (let i = 0; i < users.length; i += 50) {
    batches.push(users.slice(i, i + 50))
  }

  let sent = 0
  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(u =>
        resend.emails.send({ from: FROM, to: u.email!, subject, html })
      )
    )
    sent += results.filter(r => r.status === 'fulfilled').length
  }

  return NextResponse.json({ sent, total: users.length, accuracy })
}
