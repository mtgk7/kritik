import { NextRequest, NextResponse } from 'next/server'

// Basit in-memory rate limiter (Vercel edge'de IP başına istek sayacı)
// Production'da Redis tabanlı bir çözüme (Upstash) geçilebilir.
const RATE_MAP = new Map<string, { count: number; reset: number }>()

const LIMITS: Record<string, { max: number; window: number }> = {
  '/api/checkout':  { max: 5,  window: 60_000 },   // 5/dk
  '/api/webhook':   { max: 20, window: 60_000 },   // 20/dk
  '/kayit':         { max: 3,  window: 300_000 },  // 3/5dk
  '/giris':         { max: 10, window: 60_000 },   // 10/dk
}

function getLimit(pathname: string) {
  for (const [prefix, limit] of Object.entries(LIMITS)) {
    if (pathname.startsWith(prefix)) return limit
  }
  return null
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const limit = getLimit(pathname)

  if (limit) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const key = `${ip}:${pathname}`
    const now = Date.now()
    const entry = RATE_MAP.get(key)

    if (!entry || now > entry.reset) {
      RATE_MAP.set(key, { count: 1, reset: now + limit.window })
    } else if (entry.count >= limit.max) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen bekleyin.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.reset - now) / 1000)) } }
      )
    } else {
      entry.count++
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/checkout', '/api/webhook', '/kayit', '/giris'],
}
