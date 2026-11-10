import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', testMatch: 'cv.spec.ts', workers: 1, fullyParallel: false,
  timeout: 45_000, expect: { timeout: 10_000 }, reporter: 'list',
  outputDir: '/tmp/opencode/cv-e2e-results',
  use: { baseURL: process.env.CV_E2E_BASE_URL || 'http://localhost:3211', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: process.env.CV_E2E_BASE_URL ? undefined : {
    command: 'node --import tsx tests/e2e/helpers/cv-server.ts',
    url: 'http://localhost:3211/api/health', reuseExistingServer: false, timeout: 60_000,
  },
})
