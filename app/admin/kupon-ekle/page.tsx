import { addCoupon } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/server'
import { Match } from '@/lib/types'

export default async function KuponEklePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_time')
    .order('match_time', { ascending: true })

  return (
    <main className="max-w-2xl mx-auto p-6">
      <a href="/admin" className="text-sm text-gray-500 hover:text-black mb-4 inline-block">← Admin</a>
      <h1 className="text-2xl font-bold mb-6">Kupon Ekle</h1>

      {params.error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{params.error}</div>
      )}

      <form action={addCoupon} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Kupon Tipi</label>
          <select name="coupon_type" required className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="Banko">Banko</option>
            <option value="xG Canavarı">xG Canavarı</option>
            <option value="Premium Sürpriz">Premium Sürpriz</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Maçlar (ID'leri virgülle ayır)</label>
          {matches && matches.length > 0 && (
            <div className="mb-2 border rounded-lg divide-y text-sm max-h-48 overflow-y-auto">
              {(matches as Match[]).map((m) => (
                <div key={m.id} className="px-3 py-2 flex justify-between">
                  <span>{m.home_team} — {m.away_team}</span>
                  <span className="text-gray-400 font-mono text-xs">{m.id.slice(0, 8)}…</span>
                </div>
              ))}
            </div>
          )}
          <textarea
            name="matches"
            rows={2}
            required
            placeholder="uuid1, uuid2, uuid3"
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Toplam Oran</label>
          <input name="total_rate" type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Premium mi?</label>
          <select name="is_premium" className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="false">Hayır (Ücretsiz)</option>
            <option value="true">Evet (Premium)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Editör Seçimi mi?</label>
          <select name="is_editor_pick" className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="false">Hayır (AI Kupon)</option>
            <option value="true">Evet (Editör Hazır Kupon)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Editör Notu (opsiyonel)</label>
          <textarea
            name="editor_note"
            rows={2}
            placeholder="Bu kuponu neden seçtiniz? Kısa analiz notu..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 transition"
        >
          Kuponu Kaydet
        </button>
      </form>
    </main>
  )
}
