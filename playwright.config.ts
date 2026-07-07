import { defineConfig, devices } from '@playwright/test'

// Testler canlı prod'a karşı çalışır (BASE_URL ile override edilebilir).
const BASE_URL = process.env.BASE_URL ?? 'https://www.analizkritik.com'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // CI'da Playwright'ın chromium'u; lokalde sistem Chrome'u varsa da çalışır
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
