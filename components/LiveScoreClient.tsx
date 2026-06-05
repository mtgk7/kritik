'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  matchId: string
  initialStatus: string
  initialHomeScore: number | null
  initialAwayScore: number | null
  homeTeam: string
  awayTeam: string
}

export default function LiveScoreClient({
  matchId, initialStatus,
  initialHomeScore, initialAwayScore,
  homeTeam, awayTeam,
}: Props) {
  const [status, setStatus]     = useState(initialStatus)
  const [homeScore, setHome]    = useState(initialHomeScore)
  const [awayScore, setAway]    = useState(initialAwayScore)
  const [flash, setFlash]       = useState(false)

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
        const r = payload.new as typeof payload.new & {
          status: string; home_score: number | null; away_score: number | null
        }
        const scoreChanged =
          r.home_score !== homeScore || r.away_score !== awayScore
        setStatus(r.status)
        setHome(r.home_score)
        setAway(r.away_score)
        if (scoreChanged) {
          setFlash(true)
          setTimeout(() => setFlash(false), 1200)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId]) // eslint-disable-line react-hooks/exhaustive-deps

  const isLive     = status === 'canlı'
  const isFinished = status === 'bitti'
  const hasScore   = homeScore != null && awayScore != null

  if (!isLive && !isFinished) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
      {isLive && (
        <span className="badge-live" style={{ alignSelf: 'center' }}>Canlı</span>
      )}
      {hasScore && (
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '2.5rem', lineHeight: 1,
          color: flash ? 'var(--color-success)' : 'var(--color-text-primary)',
          transition: 'color 0.3s ease',
          letterSpacing: '-0.01em',
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
        }}>
          Maç Bitti
        </span>
      )}
    </div>
  )
}
