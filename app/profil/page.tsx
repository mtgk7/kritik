import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Match } from '@/lib/types'
import { signOut } from '@/app/actions/auth'
import PremiumCheckout from '@/components/PremiumCheckout'
import PushSubscribeButton from '@/components/PushSubscribeButton'
import { updateNotifPrefs } from '@/app/actions/notif'

const LEAGUES = ['Süper Lig', 'Premier Lig', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'Şampiyonlar Ligi', 'Dünya Kupası 2026']

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ mesaj?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const sp = await searchParams

  if (!authUser) redirect('/giris')

  const [{ data: profile }, { data: favsData }, { data: pendingData }] = await Promise.all([
    supabase.from('users').select('*').eq('id', authUser.id).single(),
    supabase.from('favorites').select('match_id').eq('user_id', authUser.id).order('created_at', { ascending: false }),
    supabase.from('pending_approvals').select('days,amount_try,created_at').eq('user_id', authUser.id).maybeSingle(),
  ])

  const p = profile as User
  const pendingApproval = pendingData as { days: number; amount_try: number | null; created_at: string } | null

  // Favori maçları çek
  const favMatchIds = (favsData ?? []).map((f: { match_id: string }) => f.match_id)
  let favMatches: Match[] = []
  if (favMatchIds.length > 0) {
    const { data: md } = await supabase
      .from('matches')
      .select('id,home_team,away_team,match_time,league_name,status,confidence_score,prediction,home_score,away_score')
      .in('id', favMatchIds)
      .order('match_time', { ascending: true })
    favMatches = (md ?? []) as Match[]
  }

  const premiumAktif = p?.is_premium && p?.premium_until
    ? new Date(p.premium_until) > new Date()
    : false

  const kalanGun = p?.premium_until && premiumAktif
    ? Math.ceil((new Date(p.premium_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const kayitTarihi = new Date(p?.created_at ?? authUser.created_at)
    .toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--page-pad)', paddingTop: '2.5rem', paddingBottom: '5rem' }}>

      {sp?.mesaj && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--color-success-bg)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 500 }}>
          ✓ {sp.mesaj}
        </div>
      )}
      {sp?.error && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--color-accent-subtle)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-accent-text)' }}>
          {sp.error}
        </div>
      )}

      {/* Başlık */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '0.03em',
          textTransform: 'uppercase', color: 'var(--color-text-primary)', lineHeight: 1,
        }}>
          Profilim
        </h1>
      </div>

      {/* Kullanıcı kartı */}
      <div style={{
        padding: '1.5rem',
        background: 'var(--color-surface-2)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        marginBottom: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
              {p?.email ?? authUser.email}
            </p>
            {p?.username && (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)' }}>@{p.username}</p>
            )}
          </div>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', padding: '0.25rem 0.65rem', borderRadius: '99px',
            background: premiumAktif ? 'var(--color-premium-bg)' : 'var(--color-border)',
            color: premiumAktif ? 'var(--color-premium)' : 'var(--color-text-tertiary)',
            flexShrink: 0,
          }}>
            {premiumAktif ? '⭐ Premium' : 'Ücretsiz'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>Kayıt tarihi</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{kayitTarihi}</span>
          </div>

          {premiumAktif && kalanGun !== null && p?.premium_until && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>Premium bitiş</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-premium)' }}>
                {new Date(p.premium_until).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                <span style={{ fontWeight: 400, marginLeft: '0.35rem' }}>({kalanGun} gün)</span>
              </span>
            </div>
          )}

          {!premiumAktif && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>Üyelik</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>Ücretsiz plan</span>
            </div>
          )}
        </div>
      </div>

      {/* Premium CTA veya durum */}
      {premiumAktif ? (
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--color-premium-bg)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.25rem' }}>⭐</span>
          <div>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-premium)', marginBottom: '0.15rem' }}>
              Premium üyeliğin aktif
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
              Tüm premium kupona ve analizlere erişimin var.
            </p>
          </div>
        </div>
      ) : pendingApproval ? (
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--color-warning-bg)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          marginBottom: '1.25rem',
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.25rem', lineHeight: 1.3 }}>⏳</span>
          <div>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '0.25rem' }}>
              Ödemeniz onay bekliyor
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {pendingApproval.days} günlük premium ödemeniz alındı
              {pendingApproval.amount_try ? ` (₺${pendingApproval.amount_try})` : ''}.
              Admin onayının ardından hesabınız otomatik olarak aktifleşecek.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '1.5rem',
          background: 'var(--color-surface-2)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          marginBottom: '1.25rem',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: 'var(--color-text-primary)', marginBottom: '0.5rem',
          }}>
            Premium'a Geç
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Yüksek güven skorlu kombinasyon kuponlarına, detaylı xG analizlerine
            ve sakatlık alarmlarına tam erişim sağla.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
            {['Premium kuponlara tam erişim', 'Günlük yüksek güven analizleri', 'Sakatlık ve ceza alarmları'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-premium)', flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
          <PremiumCheckout />
        </div>
      )}

      {/* Referral Linki */}
      {p?.referral_code && (
        <div style={{ padding: '1.5rem', background: 'var(--color-surface-2)', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
            Arkadaşını Davet Et
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Davet ettiğin her kişi için <strong>+7 gün premium</strong> kazanırsın.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ flex: 1, padding: '0.6rem 0.85rem', background: 'var(--color-base)', border: '1.5px solid var(--color-border)', borderRadius: '7px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.05em', minWidth: '120px' }}>
              {p.referral_code}
            </code>
            <a
              href={`https://kritik-wine.vercel.app/kayit?ref=${p.referral_code}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', textDecoration: 'none', padding: '0.55rem 1rem', border: '1.5px solid var(--color-border)', borderRadius: '7px', whiteSpace: 'nowrap' }}
            >
              Linki Kopyala
            </a>
          </div>
        </div>
      )}

      {/* Favori Maçlar */}
      {favMatches.length > 0 && (
        <div style={{ padding: '1.5rem', background: 'var(--color-surface-2)', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
            Kayıtlı Maçlar
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {favMatches.map((m, i) => {
              const isFinished = m.status === 'bitti'
              const hasScore = isFinished && m.home_score != null && m.away_score != null
              return (
                <a key={m.id} href={`/maclar/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    gap: '0.75rem', padding: '0.85rem 0', alignItems: 'center',
                    borderBottom: i === favMatches.length - 1 ? 'none' : '1px solid var(--color-border)',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.15rem' }}>
                        {m.home_team} — {m.away_team}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>
                        {m.league_name} · {new Date(m.match_time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {hasScore ? (
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                        {m.home_score}–{m.away_score}
                      </span>
                    ) : m.status === 'canlı' ? (
                      <span className="badge-live">Canlı</span>
                    ) : m.confidence_score ? (
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-success)' }}>
                        %{Math.round(m.confidence_score * 100)}
                      </span>
                    ) : null}
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Bildirim Tercihleri */}
      <div style={{ padding: '1.5rem', background: 'var(--color-surface-2)', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-primary)', marginBottom: '1.25rem' }}>
          Bildirim Tercihleri
        </h2>

        {/* Push bildirimleri */}
        <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
            Tarayıcı Bildirimleri
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
            Yüksek güven maçları başlamadan önce bildirim al
          </div>
          <PushSubscribeButton />
        </div>
        <form action={updateNotifPrefs} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Minimum güven */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
              Minimum Güven Skoru
            </label>
            <select name="notif_min_conf" defaultValue={String(p?.notif_min_conf ?? 0.65)} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid var(--color-border)', borderRadius: '7px', fontSize: '0.88rem', fontFamily: 'var(--font-body)', background: 'var(--color-base)', color: 'var(--color-text-primary)' }}>
              <option value="0.55">%55+ (Orta güven)</option>
              <option value="0.65">%65+ (İyi güven)</option>
              <option value="0.70">%70+ (Yüksek güven)</option>
              <option value="0.80">%80+ (Çok yüksek güven)</option>
            </select>
          </div>

          {/* Ligler */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
              Ligler <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)' }}>(boşsa hepsi)</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {LEAGUES.map(l => {
                const active = (p?.notif_leagues ?? []).includes(l)
                return (
                  <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="notif_leagues_check" value={l} defaultChecked={active} style={{ accentColor: 'var(--color-accent)' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{l}</span>
                  </label>
                )
              })}
            </div>
            <input type="hidden" name="notif_leagues" id="notif_leagues_hidden" />
          </div>

          {/* Telegram toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.1rem' }}>Telegram Bildirimleri</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>@KritikPremiumBot üzerinden</div>
            </div>
            <select name="notif_telegram" defaultValue={p?.notif_telegram !== false ? 'true' : 'false'} style={{ padding: '0.4rem 0.65rem', border: '1.5px solid var(--color-border)', borderRadius: '6px', fontSize: '0.82rem', fontFamily: 'var(--font-body)', background: 'var(--color-base)', color: 'var(--color-text-primary)' }}>
              <option value="true">Açık</option>
              <option value="false">Kapalı</option>
            </select>
          </div>

          <button type="submit" style={{ padding: '0.65rem', background: 'var(--color-accent)', color: 'oklch(97% 0.005 255)', border: 'none', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Tercihleri Kaydet
          </button>
        </form>
      </div>

      {/* Çıkış yap */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
        <form action={signOut}>
          <button type="submit" style={{
            fontSize: '0.82rem', fontWeight: 600,
            color: 'var(--color-accent)',
            background: 'none', border: 'none',
            cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-body)',
          }}>
            Çıkış Yap →
          </button>
        </form>
      </div>

    </main>
  )
}
