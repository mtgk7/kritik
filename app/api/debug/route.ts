import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // BOM (﻿) temizle — PowerShell pipe BOM ekleyebilir
  const url  = (process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '').replace(/^﻿/, '').trim()
  const key  = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/^﻿/, '').trim()

  if (!url || !key) {
    return NextResponse.json({ error: 'env vars eksik', url: !!url, key: !!key })
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/news?select=id,title,category&is_published=eq.true&order=published_at.desc&limit=3`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    )
    const text = await res.text()
    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      body: text.slice(0, 500),
      url_prefix: url.slice(0, 30),
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) })
  }
}
