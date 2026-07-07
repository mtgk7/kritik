import { test, expect } from '@playwright/test'

// Tüm public sayfalar yüklenmeli ve doğru başlığa sahip olmalı
const PUBLIC_PAGES = [
  '/',
  '/haberler',
  '/sonuclar',
  '/hizmetler',
  '/oneriler',
  '/editor-tahminleri',
  '/takip',
  '/ai-oneri',
  '/iletisim',
  '/kayit',
  '/giris',
  '/tahminler/bugun',
  '/tahminler/yarin',
  '/lig/super-lig',
  '/gizlilik-politikasi',
  '/kullanim-kosullari',
  '/mesafeli-satis-sozlesmesi',
]

// Üçüncü taraf (reklam/analitik) hataları bizim sorumluluğumuz değil — filtrele
function isOwnError(text: string): boolean {
  const thirdParty = ['adsbygoogle', 'googlesyndication', 'doubleclick', 'tawk.to', 'google.com/recaptcha', 'adtrafficquality']
  return !thirdParty.some(tp => text.includes(tp))
}

test.describe('Smoke — sayfa yükleme', () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} yükleniyor (200 + başlık)`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(res?.status(), `${path} HTTP durumu`).toBeLessThan(400)
      await expect(page).toHaveTitle(/Kritik/)
    })
  }
})

test.describe('Smoke — JS hatası yok', () => {
  // Daha önce hata veren sayfalar: hydration (#418) ve BOM WebSocket
  const CRITICAL = ['/', '/takip', '/sonuclar', '/haberler']

  for (const path of CRITICAL) {
    test(`${path} — uncaught JS hatası yok`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', e => errors.push(e.message))
      page.on('console', msg => {
        if (msg.type() === 'error' && isOwnError(msg.text())) errors.push(msg.text())
      })

      await page.goto(path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)

      // Hydration ve WebSocket hataları özellikle yakalanmalı
      const hydration = errors.filter(e => /hydrat|#418|#419|#423/i.test(e))
      const websocket = errors.filter(e => /websocket.*failed|Authentication failed/i.test(e))

      expect(hydration, 'hydration hatası').toHaveLength(0)
      expect(websocket, 'websocket auth hatası (BOM)').toHaveLength(0)
      expect(errors, `konsol hataları:\n${errors.join('\n')}`).toHaveLength(0)
    })
  }
})
