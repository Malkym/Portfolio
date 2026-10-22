import { chromium, expect } from '@playwright/test'
import { resetLoginAttempts } from './helpers/auth'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

/**
 * Ouverture de session admin unique, réutilisée par tous les tests authentifiés.
 *
 * Évite de multiplier les appels à `/api/auth/login` (rate-limit serveur :
 * 10 requêtes par fenêtre de 15 minutes). Le cookie de session est capturé
 * une fois dans `storageState` puis réinjecté dans chaque contexte de test.
 *
 * Le journal des tentatives de connexion est vidé au préalable : il est
 * persistant en base et survivrait autrement d'un run à l'autre, bloquant
 * la connexion après 5 échecs enregistrés par un run précédent.
 */

export default async function () {
  resetLoginAttempts()

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`${BASE_URL}/admin-secret`)

  const loginResponse = page.waitForResponse(
    (resp) => resp.url().includes('/api/auth/login') && resp.request().method() === 'POST',
  )
  await page.locator('input#pw').fill('PortfolioAdmin2026!')
  await page.locator('button[type="submit"]').click()
  await loginResponse

  await expect(page.locator('text=Tableau de bord')).toBeVisible({ timeout: 20_000 })

  await context.storageState({ path: 'tests/e2e/.auth/admin.json' })
  await browser.close()
}
