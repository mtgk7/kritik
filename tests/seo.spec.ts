import { test, expect } from '@playwright/test'

test.describe('SEO — canonical URL', () => {
  const CANONICAL_PAGES = ['/', '/haberler', '/sonuclar', '/hizmetler', '/oneriler']
  for (const path of CANONICAL_PAGES) {
    test(`${path} canonical içeriyor`, async ({ page }) => {
      await page.goto(path)
      const canonical = page.locator('link[rel="canonical"]')
      await expect(canonical).toHaveCount(1)
      const href = await canonical.getAttribute('href')
      expect(href).toContain('analizkritik.com')
    })
  }
})

test.describe('SEO — auth sayfaları noindex', () => {
  for (const path of ['/giris', '/kayit', '/odeme']) {
    test(`${path} noindex`, async ({ page }) => {
      await page.goto(path)
      const robots = await page.locator('meta[name="robots"]').getAttribute('content')
      expect(robots).toContain('noindex')
    })
  }
})

test.describe('SEO — yapısal veri (JSON-LD)', () => {
  test('haber makalesi NewsArticle şeması içeriyor', async ({ page }) => {
    await page.goto('/haberler')
    // Görünürlük sorunlarını atlamak için href'i al, doğrudan git
    const href = await page.locator('a[href^="/haberler/"]').first().getAttribute('href')
    expect(href, 'haber linki bulunamadı').toBeTruthy()
    await page.goto(href!)

    const html = await page.content()
    expect(html).toContain('NewsArticle')
  })

  test('maç detayı SportsEvent şeması içeriyor', async ({ page }) => {
    await page.goto('/')
    const href = await page.locator('a[href^="/maclar/"]').first().getAttribute('href')
    expect(href, 'maç linki bulunamadı').toBeTruthy()
    await page.goto(href!)

    const html = await page.content()
    expect(html).toContain('SportsEvent')
  })
})

test.describe('SEO — robots.txt ve sitemap', () => {
  test('robots.txt erişilebilir + sitemap referansı', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('Sitemap')
    expect(body).toContain('/admin')  // disallow
  })

  test('sitemap.xml erişilebilir + redirect sayfaları içermiyor', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).not.toContain('/istatistikler')
    expect(body).not.toContain('/karli-tahminler')
  })
})
