'use client'

import { useState, useMemo } from 'react'
import { translateTeam } from '@/lib/team-names'

type Props = {
  allTeams: string[]
  savedTeams: string[]
  action: (formData: FormData) => Promise<void | never>
}

export default function FavoriteTeamsSelector({ allTeams, savedTeams, action }: Props) {
  const [search, setSearch]     = useState('')
  const [extra, setExtra]       = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(savedTeams))

  const allCombined = useMemo(() =>
    [...new Set([...allTeams, ...extra])].sort(),
    [allTeams, extra],
  )

  const q = search.trim()

  const filtered = useMemo(() => {
    if (!q) return allCombined
    const ql = q.toLowerCase()
    return allCombined.filter(t =>
      t.toLowerCase().includes(ql) || translateTeam(t).toLowerCase().includes(ql),
    )
  }, [allCombined, q])

  const canAdd = q.length >= 2 && !allCombined.some(t => t.toLowerCase() === q.toLowerCase())

  function addNew() {
    if (!q) return
    setExtra(p => [...p, q])
    setSelected(p => new Set([...p, q]))
    setSearch('')
  }

  function toggle(t: string) {
    setSelected(p => {
      const n = new Set(p)
      if (n.has(t)) n.delete(t); else n.add(t)
      return n
    })
  }

  return (
    <form action={action}>
      {/* Hidden inputs → formData.getAll('fav_team') */}
      {[...selected].map(t => <input key={t} type="hidden" name="fav_team" value={t} />)}

      {/* Arama + ekle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (canAdd) addNew() } }}
          placeholder="Takım ara veya adını yazıp ekle..."
          style={{
            flex: 1, padding: '0.55rem 0.75rem',
            border: '1.5px solid var(--color-border)', borderRadius: '7px',
            fontSize: '0.85rem', fontFamily: 'var(--font-body)',
            background: 'var(--color-base)', color: 'var(--color-text-primary)', outline: 'none',
          }}
        />
        {canAdd && (
          <button
            type="button"
            onClick={addNew}
            style={{
              padding: '0.55rem 1rem', borderRadius: '7px', border: 'none',
              background: 'var(--color-accent)', color: 'oklch(97% 0.005 255)',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            + Ekle
          </button>
        )}
      </div>

      {/* Takım chip'leri */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem', minHeight: '2rem' }}>
        {filtered.map(t => {
          const active = selected.has(t)
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              style={{
                padding: '0.3rem 0.65rem', borderRadius: '6px', cursor: 'pointer',
                background: active ? 'var(--color-accent-subtle)' : 'var(--color-base)',
                border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: active ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                fontSize: '0.78rem', fontFamily: 'var(--font-body)',
                fontWeight: active ? 600 : 400,
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                transition: 'border-color 0.12s, background 0.12s',
              }}
            >
              {active && <span style={{ fontSize: '0.62rem', color: 'var(--color-accent)' }}>✓</span>}
              {translateTeam(t)}
            </button>
          )
        })}

        {filtered.length === 0 && q && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', alignSelf: 'center' }}>
            {canAdd
              ? `"${q}" listede yok — + Ekle butonuna bas.`
              : `"${q}" için sonuç bulunamadı.`}
          </p>
        )}
      </div>

      {selected.size > 0 && (
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
          {selected.size} takım seçili
        </p>
      )}

      <button
        type="submit"
        style={{
          padding: '0.6rem 1.25rem', background: 'var(--color-accent)',
          color: 'oklch(97% 0.005 255)', border: 'none', borderRadius: '8px',
          fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        Takımları Kaydet
      </button>
    </form>
  )
}
