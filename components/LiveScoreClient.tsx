'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  matchId: string
  matchTime: string
  initialStatus: string
  initialHomeScore: number | null
  initialAwayScore: number | null
  homeTeam: string
  awayTeam: string
}

function useCountdown(targetIso: string) {
  const [secs, setSecs] = useState(() => {
    const diff = Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000)
    return Math.max(diff, 0)
  })
  useEffect(() => {
    if (secs <= 0) return
    const id = setInterval(() => setSecs(s => Math.max(s - 1, 0)), 1000)
    return () => clearInterval(id)
  }, [secs <= 0]) // eslint-disable-line react-hooks/exhaustive-deps
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return { secs, h, m, s }
}

export default function LiveScoreClient({
  matchId, matchTime, initialStatus,
  initialHomeScore, initialAwayScore,
}: Props) {
  const [status, setStatus]  = useState(initialStatus)
  const [homeScore, setHome] = useState(initialHomeScore)
  const [awayScore, setAway] = useState(initialAwayScore)
  const [flash, setFlash]    = useState(false)
  const pollRef              = useRef<ReturnType<typeof setInterval> | null>(null)
  const { secs, h, m, s }   = useCountdown(matchTime)

  // Supabase Realtime — canlı maçlar için anlık güncelleme
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      }, (payload) => {
        const r = payload.new as { status: string; home_score: number | null; away_score: number | null }
        const changed = r.home_score !== homeScore || r.away_score !== awayScore
        setStatus(r.status)
        setHome(r.home_score)
        setAway(r.away_score)
        if (changed) {
          setFlash(true)
          setTimeout(() => setFlash(false), 1200)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [matchId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bekleyen maç: countdown sıfırlandığında polling başlat (status değişimini yakala)
  useEffect(() => {
    if (secs > 0 || status !== 'bekliyor') return
    const supabase = createClient()
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('matches')
        .select('status,home_score,away_score')
        .eq('id', matchId)
        .single()
      if (data && data.status !== 'bekliyor') {
        setStatus(data.status)
        setHome(data.home_score)
        setAway(data.away_score)
        clearInterval(pollRef.current!)
      }
    }, 30_000) // 30 sn'de bir kontrol
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [secs, status, matchId])

  const isLive     = status === 'canlı'
  const isFinished = status === 'bitti'
  const isPending  = status === 'bekliyor'
  const hasScore   = homeScore != null && awayScore != null

  // Yaklaşan maç — countdown
  if (isPending && secs > 0) {
    const parts: string[] = []
    if (h > 0) parts.push(`${h} sa`)
    parts.push(`${String(m).padStart(2, '0')} dk`)
    parts.push(`${String(s).padStart(2, '0')} sn`)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
          border: '1px solid var(--color-border)', borderRadius: '4px',
          padding: '0.2rem 0.5rem',
        }}>Başlamadı</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem',
          letterSpacing: '0.02em', color: 'var(--color-text-primary)',
        }}>
          {parts.join(' ')}
        </span>
      </div>
    )
  }

  // Maç başladı, skor bekleniyor
  if (isPending && secs <= 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span className="badge-live">Başlıyor</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Skor bekleniyor...</span>
      </div>
    )
  }

  if (!isLive && !isFinished) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
      {isLive && <span className="badge-live" style={{ alignSelf: 'center' }}>Canlı</span>}
      {hasScore && (
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '2.5rem', lineHeight: 1,
          color: flash ? 'var(--color-success)' : 'var(--color-text-primary)',
          transition: 'color 0.3s ease', letterSpacing: '-0.01em',
        }}>
          {homeScore} — {awayScore}
        </span>
      )}
      {isFinished && (
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
          border: '1px solid var(--color-border)', borderRadius: '4px',
          padding: '0.2rem 0.5rem',
        }}>Maç Bitti</span>
      )}
    </div>
  )
}
