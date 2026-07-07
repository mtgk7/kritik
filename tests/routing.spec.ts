import { test, expect } from '@playwright/test'

test.describe('Routing — korumalı sayfalar', () => {
  // Giriş yapılmamış kullanıcı login'e yönlendirilmeli
  for (const path of ['/odeme', '/profil', '/admin']) {
    test(`${path} → giriş sayfasına yönlendiriyor`, async ({ page }) => {
      await page.goto(path)
      expect(page.url()).toContain('/giris')
    })
  }
})

test.describe('Routing — yönlendirmeler', () => {
  const REDIRECTS: [string, string][] = [
    ['/istatistikler', '/sonuclar'],
    ['/karli-tahminler', '/sonuclar'],
    ['/kuponlar', '/oneriler'],
  ]
  for (const [from, to] of REDIRECTS) {
    test(`${from} → ${to}`, async ({ page }) => {
      await page.goto(from)
      expect(page.url()).toContain(to)
    })
  }
})

test.describe('Routing — silinen API uçları 404', () => {
  for (const path of ['/api/matches', '/api/coupons', '/api/debug']) {
    test(`${path} → 404`, async ({ request }) => {
      const res = await request.get(path)
      expect(res.status()).toBe(404)
    })
  }
})
