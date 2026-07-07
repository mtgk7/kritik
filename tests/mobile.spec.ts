import { test, expect, devices } from '@playwright/test'

// Bu testler yalnızca mobil viewport'ta anlamlı
test.use({ ...devices['Pixel 7'] })

const MOBILE_PAGES = [
  '/',
  '/haberler',
  '/sonuclar',
  '/hizmetler',
  '/oneriler',
  '/editor-tahminleri',
  '/takip',
  '/kayit',
  '/giris',
]

test.describe('Mobil — yatay taşma (overflow) yok', () => {
  for (const path of MOBILE_PAGES) {
    test(`${path} yatay overflow yok`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)

      const overflow = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth
        const scrollW = document.documentElement.scrollWidth
        const offenders: string[] = []
        document.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect()
          if (r.right > docW + 1 && r.width > 20) {
            offenders.push(`${el.tagName}.${(el.className || '').toString().slice(0, 30)}`)
          }
        })
        return { docW, scrollW, offenders: offenders.slice(0, 5) }
      })

      expect(
        overflow.scrollW,
        `${path} yatay taşma. Taşan öğeler: ${overflow.offenders.join(', ')}`
      ).toBeLessThanOrEqual(overflow.docW + 1)
    })
  }
})

test.describe('Mobil — header hamburger menüye geçiyor', () => {
  test('mobilde masaüstü nav gizli, hamburger görünür', async ({ page }) => {
    await page.goto('/')
    const desktopNav = page.locator('.nav-desktop').first()
    const hamburger = page.locator('.nav-hamburger').first()
    await expect(desktopNav).toBeHidden()
    await expect(hamburger).toBeVisible()
  })
})
