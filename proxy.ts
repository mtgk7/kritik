import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

// Basit rate limiter
const RATE_MAP = new Map<string, { count: number; reset: number }>()
const LIMITS: Record<string, { max: number; window: number }> = {
  '/api/checkout': { max: 5,  window: 60_000 },
  '/api/webhook':  { max: 20, window: 60_000 },
  '/kayit':        { max: 3,  window: 300_000 },
  '/giris':        { max: 10, window: 60_000 },
}

function checkRate(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl
  const limit = Object.entries(LIMITS).find(([p]) => pathname.startsWith(p))?.[1]
  if (!limit) return null

  const ip  = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
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
  return null
}

export async function proxy(request: NextRequest) {
  // Rate limiting
  const rateLimited = checkRate(request)
  if (rateLimited) return rateLimited

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/giris', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
    const email = user.email?.toLowerCase() ?? ''
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
