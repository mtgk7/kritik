import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User } from '@/lib/types'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) redirect('/giris')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const p = profile as User

  const premiumAktif = p?.is_premium && p?.premium_until
    ? new Date(p.premium_until) > new Date()
    : false

  const kalanGun = p?.premium_until
    ? Math.ceil((new Date(p.premium_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <main className="max-w-xl mx-auto p-6 mt-8">
      <h1 className="text-2xl font-bold mb-6">Profilim</h1>

      {/* Kullanıcı Bilgileri */}
      <div className="bg-white border rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-lg">{p?.email ?? authUser.email}</p>
            {p?.username && <p className="text-sm text-gray-500">{p.username}</p>}
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
            premiumAktif
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {premiumAktif ? '⭐ Premium' : 'Ücretsiz'}
          </span>
        </div>

        <div className="text-sm text-gray-500 space-y-1">
          <p>Kayıt tarihi: {new Date(p?.created_at ?? authUser.created_at).toLocaleDateString('tr-TR')}</p>
          {premiumAktif && kalanGun !== null && (
            <p className="text-yellow-600 font-medium">
              Premium üyeliğin {kalanGun} gün sonra sona eriyor
              ({new Date(p.premium_until!).toLocaleDateString('tr-TR')})
            </p>
          )}
          {!premiumAktif && (
            <p className="text-gray-400">
              Premium kupona erişmek için premium üyelik gereklidir.
            </p>
          )}
        </div>
      </div>

      {/* Premium değilse teşvik */}
      {!premiumAktif && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-5">
          <h2 className="font-semibold text-yellow-800 mb-1">Premium'a Geç</h2>
          <p className="text-sm text-yellow-700 mb-3">
            Yüksek güven skorlu kombinasyon kuponlarına, xG analizlerine ve
            sakatlık alarmlarına tam erişim sağla.
          </p>
          <span className="inline-block bg-yellow-400 text-yellow-900 text-sm font-semibold px-4 py-2 rounded-lg">
            Yakında →
          </span>
        </div>
      )}
    </main>
  )
}
