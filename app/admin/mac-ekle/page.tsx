import { addMatch } from '@/app/actions/admin'

export default async function MacEklePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="max-w-2xl mx-auto p-6">
      <a href="/admin" className="text-sm text-gray-500 hover:text-black mb-4 inline-block">← Admin</a>
      <h1 className="text-2xl font-bold mb-6">Maç Ekle</h1>

      {params.error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{params.error}</div>
      )}

      <form action={addMatch} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ev Sahibi</label>
            <input name="home_team" required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deplasman</label>
            <input name="away_team" required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Maç Tarihi & Saati</label>
          <input name="match_time" type="datetime-local" required className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Durum</label>
          <select name="status" defaultValue="yakında" className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="yakında">Yakında</option>
            <option value="canlı">Canlı</option>
            <option value="bitti">Bitti</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ev Skoru</label>
            <input name="home_score" type="number" min="0" placeholder="—" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deplasman Skoru</label>
            <input name="away_score" type="number" min="0" placeholder="—" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ev xG</label>
            <input name="home_xg" type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deplasman xG</label>
            <input name="away_xg" type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ev Form Skoru</label>
            <input name="home_form_score" type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deplasman Form Skoru</label>
            <input name="away_form_score" type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Kritik Eksik Etkisi (%)</label>
            <input name="critical_missing_effect" type="number" step="0.01" min="0" max="1" placeholder="0.00 - 1.00" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Güven Skoru</label>
            <input name="confidence_score" type="number" step="0.01" min="0" max="1" placeholder="0.00 - 1.00" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tahmin</label>
          <input name="prediction" placeholder="örn: MS1, MS2, 2.5 Üst" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Eksik Oyuncular <span className="text-gray-400 font-normal">(JSON)</span>
          </label>
          <textarea
            name="missing_players"
            rows={3}
            placeholder='[{"name":"Oyuncu Adı","reason":"Sakatlık","missed_matches_count":3}]'
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 transition"
        >
          Maçı Kaydet
        </button>
      </form>
    </main>
  )
}
