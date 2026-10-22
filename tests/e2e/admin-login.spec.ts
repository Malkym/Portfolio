import { test, expect } from '@playwright/test'
import { resetLoginAttempts } from './helpers/auth'

const ADMIN_PATH = '/admin-secret'
const PASSWORD = 'PortfolioAdmin2026!'

test.describe('Connexion admin', () => {
  test('connexion valide ouvre le panneau d’administration', async ({ page }) => {
    await page.goto(ADMIN_PATH)
    await expect(page.locator('input#pw')).toBeVisible()

    await page.locator('input#pw').fill(PASSWORD)
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(new RegExp(`${ADMIN_PATH}$`))
    await expect(page.locator('text=Tableau de bord')).toBeVisible({ timeout: 20_000 })
  })

  test('mot de passe invalide est refusé sans fuite', async ({ page }) => {
    await page.goto(ADMIN_PATH)
    await page.locator('input#pw').fill('mot-de-passe-faux')
    await page.locator('button[type="submit"]').click()

    await expect(page.locator('[role="alert"]')).toHaveText('Identifiants invalides.')
    // L’URL reste sur la page de connexion : aucun bascule côté client.
    await expect(page).toHaveURL(new RegExp(`${ADMIN_PATH}$`))
  })

  test('blocage après 5 échecs pendant 15 minutes', async ({ page, request }) => {
    resetLoginAttempts()

    // 5 échecs consécutifs → 401 à chaque fois.
    for (let i = 0; i < 5; i += 1) {
      const res = await request.post('/api/auth/login', { data: { password: 'faux' } })
      expect(res.status()).toBe(401)
    }

    // 6e tentative → blocage 429, message qui mentionne 15 minutes.
    const res = await request.post('/api/auth/login', { data: { password: 'faux' } })
    expect(res.status()).toBe(429)
    const body = await res.json()
    expect(body.error).toContain('15 minutes')

    // L’UI affiche toujours l’erreur générique : pas de fuite sur la cause.
    await page.goto(ADMIN_PATH)
    await page.locator('input#pw').fill('faux')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('[role="alert"]')).toHaveText('Identifiants invalides.')
  })
})
