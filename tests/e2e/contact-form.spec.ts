import { test, expect } from '@playwright/test'

// Lecture des messages côté admin requise : la session est réinjectée depuis
// l’ouverture de session unique (auth.setup).
test.use({ storageState: 'tests/e2e/.auth/admin.json' })

test.describe('Formulaire de contact', () => {
  test('envoi avec honeypot vide, le message apparaît en administration', async ({ page, request }) => {
    await page.goto('/')
    await expect(page.locator('#contact')).toBeVisible()

    await page.locator('#f-name').fill('Jean Dupont')
    await page.locator('#f-email').fill('jean@example.com')
    await page.locator('#f-body').fill('Bonjour, je souhaite travailler avec vous.')
    await page.locator('#contact button[type="submit"]').click()
    await expect(page.locator('text=Message envoyé')).toBeVisible()

    const messages = (await (await request.get('/api/admin/messages')).json()) as {
      name: string
      email: string
    }[]
    expect(messages.some((m) => m.name === 'Jean Dupont' && m.email === 'jean@example.com')).toBe(true)
  })

  test('validation des champs requis : un message trop court est rejeté', async ({ page }) => {
    await page.goto('/')

    await page.locator('#f-name').fill('Jean')
    await page.locator('#f-email').fill('jean@example.com')
    await page.locator('#f-body').fill('abc')
    await page.locator('#contact button[type="submit"]').click()
    await expect(page.locator('#err-body')).toHaveText('Message trop court (10 caractères min).')
  })

})
