import { test, expect } from '@playwright/test'

// Session admin nécessaire pour activer un thème.
test.use({ storageState: 'tests/e2e/.auth/admin.json' })

test.describe('Thèmes', () => {
  test('changer de thème applique les variables CSS et persiste après rechargement', async ({ page, request }) => {
    const theme = (await (await request.get('/api/designs/tech-blue')).json()) as {
      colors: { primary: string }
    }
    const expectedPrimary = theme.colors.primary // #3b82f6

    const act = await request.post('/api/admin/designs/activate', { data: { id: 'tech-blue' } })
    expect(act.ok()).toBe(true)

    await page.goto('/')

    const getPrimary = () =>
      page.evaluate(
        (prop: string) => getComputedStyle(document.documentElement).getPropertyValue(prop).trim(),
        '--c-primary',
      )

    // Le thème est appliqué côté client à l’hydratation : on attend la valeur.
    await expect(async () => {
      expect(await getPrimary()).toBe(expectedPrimary)
    }).toPass({ timeout: 10_000 })

    // La sélection est persistée en base : elle survive au rechargement.
    await page.reload()
    await expect(async () => {
      expect(await getPrimary()).toBe(expectedPrimary)
    }).toPass({ timeout: 10_000 })
  })
})
