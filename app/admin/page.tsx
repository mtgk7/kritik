import { createClient } from '@/lib/supabase/server'
import { Match, Coupon } from '@/lib/types'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ mesaj?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const [{ data: matches }, { data: coupons }] = await Promise.all([
    supabase.from('matches').select('*').order('match_time', { ascending: false }).limit(10),
    supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <main style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1 }}>
          Admin
        </h1>
      </div>

      {params.mesaj && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--color-success-bg)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 500 }}>
          ✓ {params.mesaj}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '3rem' }}>
        <AdminBtn href="/admin/mac-ekle" label="+ Maç Ekle" primary />
        <AdminBtn href="/admin/kupon-ekle" label="+ Kupon Ekle" />
        <AdminBtn href="/admin/haber-ekle" label="+ Haber Ekle" />
        <AdminBtn href="/admin/kullanicilar" label="Kullanıcılar" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2.5rem' }}>
        <AdminTable
          title="Son Maçlar"
          columns={['Maç', 'Tarih', 'Güven', 'Tahmin']}
          rows={(matches ?? []).map((m: Match) => [
            `${m.home_team} — ${m.away_team}`,
            new Date(m.match_time).toLocaleDateString('tr-TR'),
            m.confidence_score != null ? `%${Math.round(m.confidence_score * 100)}` : '—',
            m.prediction ?? '—',
          ])}
        />
        <AdminTable
          title="Son Kuponlar"
          columns={['Tip', 'Oran', 'Premium', 'Tarih']}
          rows={(coupons ?? []).map((c: Coupon) => [
            c.coupon_type,
            c.total_rate?.toFixed(2) ?? '—',
            c.is_premium ? '✓' : '—',
            new Date(c.created_at).toLocaleDateString('tr-TR'),
          ])}
        />
      </div>
    </main>
  )
}

function AdminBtn({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        padding: '0.5rem 1rem',
        fontSize: '0.82rem',
        fontWeight: 600,
        textDecoration: 'none',
        borderRadius: '7px',
        background: primary ? 'var(--color-accent)' : 'var(--color-surface-2)',
        color: primary ? 'oklch(97% 0.005 255)' : 'var(--color-text-primary)',
        border: primary ? 'none' : '1px solid var(--color-border)',
      }}
    >
      {label}
    </a>
  )
}

function AdminTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
        {title}
      </h2>
      {rows.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', padding: '1rem 0', borderTop: '1px solid var(--color-border)' }}>Veri yok.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                {columns.map(c => (
                  <th key={c} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '0.6rem 0.75rem', color: j === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
