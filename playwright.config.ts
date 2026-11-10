import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const globalSetup = fileURLToPath(new URL('./tests/e2e/auth.setup.ts', import.meta.url))

/**
 * Configuration E2E du portfolio.
 *
 * Le serveur de développement (`npm run dev`) est lancé automatiquement sur
 * le port 3000 avant les tests et arrêté à la fin. En local le serveur est
 * réutilisé d'une exécution à l'autre ; en CI il est démarré à zéro.
 *
 * Une session admin est ouverte une fois (auth.setup) et réinjectée dans les
 * tests qui en ont besoin via `storageState`, afin de ne pas consommer le
 * rate-limit de `/api/auth/login` (10 requêtes / 15 min).
 */

export default defineConfig({
  testDir: './tests/e2e',
  // CV tests use their own temporary database and credentials.
  testIgnore: '**/cv.spec.ts',
  snapshotDir: './tests/e2e/snapshots',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  globalSetup,

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'PORT=3100 npm run dev',
    url: 'http://localhost:3100/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
    },
  ],
})
