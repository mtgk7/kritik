import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Python algoritmasından maç verisi almak için POST /api/matches
// Header: Authorization: Bearer <ALGORITHM_SECRET>
export async function POST(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.ALGORITHM_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const matches = Array.isArray(body) ? body : [body]

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .upsert(matches, { onConflict: 'id' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ inserted: data?.length ?? 0, data })
}

// GET: Sadece Python/admin için, secret gerektirir
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.ALGORITHM_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
