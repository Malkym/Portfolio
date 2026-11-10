import { test, expect, type Page } from '@playwright/test'
import { sampleCV } from '../fixtures/cv'
import { readFile } from 'node:fs/promises'

test.describe('Générateur CV — parcours réels', () => {
  let pageErrors: string[] = []
  let storageState: Awaited<ReturnType<import('@playwright/test').APIRequestContext['storageState']>>
  let token: string
  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL })
    const res = await request.post('/api/auth/login', { data: { password: 'CV-Audit-Local-2026!' } })
    expect(res.ok()).toBeTruthy()
    token = (await res.json()).token
    storageState = await request.storageState()
    await request.dispose()
  })
  test.beforeEach(async ({ context, page }, info) => {
    // Distinct documentation-only addresses keep the production rate limiter enabled.
    await context.setExtraHTTPHeaders({ 'X-Forwarded-For': `192.0.2.${info.line % 250 + 1}` })
    pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    await context.addCookies(storageState.cookies)
    await context.addInitScript(value => {
      if (window.top === window && /^https?:$/.test(location.protocol)) localStorage.setItem('pf_token', value)
    }, token)
  })
  test.afterEach(() => { expect(pageErrors).toEqual([]) })

  async function openSample(page: Page) {
    const cv = sampleCV(crypto.randomUUID())
    const response = await page.request.post('/api/admin/cv', { data: cv })
    expect(response.status()).toBe(201)
    const saved = await response.json()
    await page.goto(`/admin-secret/cv/${saved.meta.id}`)
    await expect(page.getByRole('heading', { name: 'Sections du CV' })).toBeVisible()
    return saved as ReturnType<typeof sampleCV>
  }
  async function readyForScreenshot(page: Page, title: string) {
    await page.frameLocator(`iframe[title="${title}"]`).locator('body').evaluate(async () => {
      await document.fonts.ready
    })
    // The document is intentionally script-free; wait for paint in its parent.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
  }

  test('créer un CV depuis un thème, ajouter et éditer une section, conserver la saisie après autosave', async ({ page }) => {
    await page.goto('/admin-secret/cv')
    await page.getByRole('button', { name: 'Nouveau CV', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Titre du CV').fill('CV de candidature')
    await dialog.getByLabel('Thème de départ').selectOption('executive-dark')
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click()
    await expect(dialog).toBeHidden()
    await page.getByRole('button', { name: 'Ajouter une section', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'En-tête', exact: true }).click()
    const name = page.getByRole('textbox', { name: 'Nom complet', exact: true })
    await name.fill('Alex Morgan')
    await expect(name).toBeFocused()
    await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
    await expect(name).toBeFocused()
    await page.reload()
    await expect(name).toHaveValue('Alex Morgan')
    await expect(page.frameLocator('iframe[title="Aperçu du CV"]').getByRole('heading', { name: 'Alex Morgan' })).toBeVisible()
  })

  test('l’aperçu et la page publique affichent les dix sections et respectent les données privées', async ({ page, browser }) => {
    const cv = await openSample(page)
    const preview = page.frameLocator('iframe[title="Aperçu du CV"]')
    await expect(preview.getByText('Studio Horizon', { exact: true })).toBeVisible()
    await expect(preview.getByText('camille@example.com', { exact: true })).toBeVisible()
    await readyForScreenshot(page, 'Aperçu du CV')
    await page.screenshot({ path: '/tmp/opencode/cv-admin-desktop.png', fullPage: true })
    await page.getByRole('button', { name: 'Publier le CV', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Voir le CV public' })).toBeVisible()
    expect(JSON.stringify(await (await page.request.get(`/api/cv/public/${cv.meta.slug}`)).json())).not.toContain('EMPLOI MASQUÉ')
    expect(await (await page.request.get(`/cv/${cv.meta.slug}`)).text()).toContain('<title>CV Camille Martin</title>')
    const guest = await browser.newContext()
    const publicPage = await guest.newPage()
    await publicPage.goto(`http://localhost:${new URL(page.url()).port}/cv/${cv.meta.slug}`)
    const doc = publicPage.frameLocator('iframe[title="CV publié"]')
    for (const text of ['Studio Horizon', 'Université de Lyon', 'Vue.js', 'Atlas culturel', 'Opquast', 'Français', 'Concevoir pour tous', 'Mentorat de jeunes développeurs.']) await expect(doc.getByText(text, { exact: false }).first()).toBeVisible()
    await expect(doc.getByText('camille@example.com', { exact: true })).toHaveCount(0)
    await expect(doc.getByText('EMPLOI MASQUÉ')).toHaveCount(0)
    await readyForScreenshot(publicPage, 'CV publié')
    await publicPage.screenshot({ path: '/tmp/opencode/cv-public-desktop.png', fullPage: true })
    await publicPage.setViewportSize({ width: 390, height: 844 })
    await expect(doc.getByText('Studio Horizon', { exact: true })).toBeVisible()
    expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await readyForScreenshot(publicPage, 'CV publié')
    await publicPage.screenshot({ path: '/tmp/opencode/cv-public-mobile.png', fullPage: true })
    await guest.close()
    await page.getByRole('button', { name: 'Dépublier le CV', exact: true }).click()
    await expect.poll(async () => (await page.request.get(`/api/cv/public/${cv.meta.slug}`)).status()).toBe(404)
  })

  test('ajouter, sélectionner, réordonner au clavier, masquer et supprimer une section', async ({ page }) => {
    const cv = await openSample(page)
    await page.getByRole('button', { name: 'Ajouter une section', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Langues', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Langues', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Monter la section' }).click()
    await page.getByRole('button', { name: 'Masquer la section', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Afficher la section', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Supprimer la section', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText('10 sections', { exact: true })).toBeVisible()
    await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
    const saved = await (await page.request.get(`/api/admin/cv/${cv.meta.id}`)).json()
    expect(saved.sections.map((section: { order: number }) => section.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  test('les 30 thèmes se sélectionnent et le survol ne modifie pas le CV', async ({ page }) => {
    const cv = await openSample(page)
    await page.getByRole('button', { name: 'Choisir un thème', exact: true }).click()
    const themes = page.getByRole('dialog', { name: 'Thèmes du CV' })
    const choices = themes.getByRole('button', { name: /^Appliquer le thème/ })
    await expect(choices).toHaveCount(30)
    await choices.last().hover()
    await expect(page.frameLocator('iframe[title="Aperçu du CV"]').locator('body')).toHaveClass('layout-classic')
    await expect(page.frameLocator('iframe[title="Aperçu du CV"]').getByText('Opquast')).toBeVisible()
    expect((await (await page.request.get(`/api/admin/cv/${cv.meta.id}`)).json()).meta.themeId).toBe('clean-white')
    await choices.last().click()
    await themes.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
    expect((await (await page.request.get(`/api/admin/cv/${cv.meta.id}`)).json()).meta.themeId).not.toBe('clean-white')
  })

  test('exporter et réimporter réellement le JSON, et signaler un import invalide', async ({ page }) => {
    const cv = await openSample(page)
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exporter le CV en JSON' }).click()
    const download = await pending
    const payload = await readFile((await download.path())!, 'utf8')
    expect(JSON.parse(payload).sections).toHaveLength(10)
    const restored = JSON.parse(payload)
    restored.sections[0].data.name = 'Camille restaurée'
    await page.locator('input[type="file"][accept=".json"]').setInputFiles({ name: 'cv.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(restored)) })
    await expect(page.getByRole('textbox', { name: 'Nom complet', exact: true })).toHaveValue('Camille restaurée')
    await page.locator('input[type="file"][accept=".json"]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"meta":{}}') })
    await expect(page.getByRole('status')).toContainText(/invalide|requis|Required/i)
    expect((await (await page.request.get(`/api/admin/cv/${cv.meta.id}`)).json()).sections[0].data.name).toBe('Camille restaurée')
  })

  test('synchroniser le portfolio puis éditer une expérience sans la faire disparaître', async ({ page }) => {
    await openSample(page)
    page.on('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Remplacer les sections avec les données du portfolio' }).click()
    await expect(page.getByText('6 sections', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Éditer Expérience', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Entreprise', exact: true })).toHaveValue('Studio Horizon')
    await page.getByRole('textbox', { name: 'Entreprise', exact: true }).fill('Studio Horizon revisité')
    await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
    await expect(page.frameLocator('iframe[title="Aperçu du CV"]').getByText('Studio Horizon revisité', { exact: true })).toBeVisible()
  })

  test('les PDF admin et public sont des fichiers PDF valides', async ({ page }) => {
    await openSample(page)
    let pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Télécharger le CV en PDF', exact: true }).click()
    const adminPDF = await pending
    expect((await readFile((await adminPDF.path())!)).subarray(0, 5).toString()).toBe('%PDF-')
    await page.getByRole('button', { name: 'Publier le CV', exact: true }).click()
    await page.getByRole('link', { name: 'Voir le CV public' }).click()
    pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Télécharger en PDF', exact: true }).click()
    const publicPDF = await pending
    expect((await readFile((await publicPDF.path())!)).subarray(0, 5).toString()).toBe('%PDF-')
  })

  test('la photo saisie ou téléversée et le texte enrichi sont sauvegardés', async ({ page }) => {
    const cv = await openSample(page)
    await page.getByRole('textbox', { name: 'URL de la photo' }).fill('https://example.com/avatar.png')
    await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
    expect((await (await page.request.get(`/api/admin/cv/${cv.meta.id}`)).json()).sections[0].data.photo).toBe('https://example.com/avatar.png')
    const uploaded = page.waitForResponse(response => response.url().endsWith('/api/admin/upload') && response.request().method() === 'POST')
    await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64') })
    const photo = (await (await uploaded).json())[0].url
    expect(photo).toMatch(/^\/uploads\/.+\.png$/)
    await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
    expect((await (await page.request.get(`/api/admin/cv/${cv.meta.id}`)).json()).sections[0].data.photo).toBe(photo)
    expect((await page.request.get(photo)).status()).toBe(200)
    await page.getByRole('button', { name: 'Éditer Résumé', exact: true }).click()
    const editor = page.getByRole('textbox', { name: 'Présentez votre profil…', exact: true })
    await editor.fill('Un profil accessible et créatif.')
    await editor.press('ControlOrMeta+a')
    await page.getByRole('button', { name: 'Gras', exact: true }).click()
    await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
    await expect(page.frameLocator('iframe[title="Aperçu du CV"]').locator('strong')).toContainText('Un profil accessible et créatif.')
    await page.reload()
    await page.getByRole('button', { name: 'Éditer Résumé', exact: true }).click()
    await expect(editor).toContainText('Un profil accessible et créatif.')
  })

  test('mobile : champs utilisables, aperçu lisible et aucun débordement horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openSample(page)
    await expect(page.getByRole('textbox', { name: 'Nom complet', exact: true })).toBeVisible()
    await expect(page.frameLocator('iframe[title="Aperçu du CV"]').getByText('Camille Martin', { exact: true })).toBeVisible()
    await readyForScreenshot(page, 'Aperçu du CV')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: '/tmp/opencode/cv-admin-mobile.png', fullPage: true })
  })

  test('API : accès protégé, données invalides refusées, adresses publiques uniques', async ({ page, playwright, baseURL }) => {
    const guest = await playwright.request.newContext({ baseURL })
    expect((await guest.get('/api/admin/cv')).status()).toBe(401)
    const cv = await openSample(page)
    expect((await guest.get(`/api/cv/public/${cv.meta.slug}`)).status()).toBe(404)
    expect((await page.request.patch(`/api/admin/cv/${cv.meta.id}`, { data: { sections: [{ type: 'invalid', data: {}, order: 0 }] } })).status()).toBe(400)
    expect((await page.request.post('/api/admin/cv', { data: cv })).status()).toBe(409)
    await guest.dispose()
  })

  test('les thèmes se chargent depuis le répertoire configuré, hors du volume de données', async ({ page }) => {
    const themes = await (await page.request.get('/api/cv/themes')).json()
    expect(themes).toHaveLength(30)
    expect(themes.find((theme: { id: string }) => theme.id === 'clean-white').description).toContain('[test isolé]')
  })

  test('le glisser-déposer modifie réellement l’ordre enregistré des sections', async ({ page }) => {
    const cv = await openSample(page)
    const sidebar = page.getByRole('complementary', { name: 'Sections du CV', exact: true })
    await sidebar.getByRole('button', { name: 'Éditer Expérience', exact: true }).locator('..').dragTo(sidebar.getByRole('button', { name: 'Éditer Éducation', exact: true }).locator('..'))
    await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
    const saved = await (await page.request.get(`/api/admin/cv/${cv.meta.id}`)).json()
    expect(saved.sections[2].type).toBe('education')
    expect(saved.sections[3].type).toBe('experience')
  })

  test('les sections restantes sont éditables et leurs données restent visibles après sauvegarde', async ({ page }) => {
    const cv = await openSample(page)
    for (const [section, field, value, type, key] of [
      ['Éducation', 'École', 'Université révisée', 'education', 'school'],
      ['Compétences', 'Nom de la catégorie', 'Ingénierie créative', 'skills', 'name'],
      ['Projets', 'Titre du projet', 'Atlas révisé', 'projects', 'title'],
      ['Certifications', 'Nom de la certification', 'Certification révisée', 'certifications', 'name'],
      ['Langues', 'Langue', 'Anglais', 'languages', 'name'],
      ['Publications', 'Titre de la publication', 'Article révisé', 'publications', 'title'],
    ]) {
      await page.getByRole('button', { name: `Éditer ${section}`, exact: true }).click()
      await page.getByRole('textbox', { name: field, exact: true }).fill(value!)
      await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
      const saved = await (await page.request.get(`/api/admin/cv/${cv.meta.id}`)).json()
      expect(saved.sections.find((s: { type: string }) => s.type === type).data.items[0][key!]).toBe(value)
      await expect(page.frameLocator('iframe[title="Aperçu du CV"]').getByText(value!, { exact: true })).toBeVisible()
    }
  })

  test('une sauvegarde refusée conserve le brouillon et peut être réessayée', async ({ page }) => {
    const cv = await openSample(page)
    await page.route(`**/api/admin/cv/${cv.meta.id}`, route => route.request().method() === 'PATCH' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Serveur temporairement indisponible' }) }) : route.continue())
    await page.getByRole('textbox', { name: 'Nom complet', exact: true }).fill('Brouillon conservé')
    await expect(page.getByText('Enregistrement impossible. Réessayez avec Sauvegarder.', { exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Nom complet', exact: true })).toHaveValue('Brouillon conservé')
    await page.unroute(`**/api/admin/cv/${cv.meta.id}`)
    await page.getByRole('button', { name: 'Sauvegarder le CV', exact: true }).click()
    await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Nom complet', exact: true })).toHaveValue('Brouillon conservé')
  })

  test('une réponse lente ne remplace pas les frappes récentes et quitter l’éditeur enregistre le brouillon', async ({ page }) => {
    const cv = await openSample(page)
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    let first = true
    await page.route(`**/api/admin/cv/${cv.meta.id}`, async route => {
      if (route.request().method() === 'PATCH' && first) { first = false; await gate }
      await route.continue()
    })
    const name = page.getByRole('textbox', { name: 'Nom complet', exact: true })
    await name.fill('Première version')
    await expect(page.getByText('Enregistrement en cours…', { exact: true })).toBeVisible()
    await name.fill('Dernière version')
    release()
    await expect(page.getByText('Toutes les modifications sont enregistrées', { exact: true })).toBeVisible()
    await expect(name).toHaveValue('Dernière version')
    await name.fill('Version en quittant')
    await page.getByRole('link', { name: 'Admin', exact: true }).click()
    await expect(page).toHaveURL(/\/admin-secret$/)
    expect((await (await page.request.get(`/api/admin/cv/${cv.meta.id}`)).json()).sections[0].data.name).toBe('Version en quittant')
  })

  test('supprimer un CV le retire de la liste et du site public', async ({ page }) => {
    const cv = await openSample(page)
    await page.getByRole('button', { name: 'Publier le CV', exact: true }).click()
    await page.getByRole('button', { name: 'CV Camille Martin', exact: true }).click()
    page.once('dialog', dialog => dialog.accept())
    await page.locator(`[data-cv-id="${cv.meta.id}"]`).getByRole('button', { name: 'Supprimer le CV CV Camille Martin', exact: true }).click()
    await expect.poll(async () => (await page.request.get(`/api/admin/cv/${cv.meta.id}`)).status()).toBe(404)
    expect((await page.request.get(`/api/cv/public/${cv.meta.slug}`)).status()).toBe(404)
  })

  test('le générateur suit le chemin admin configuré au démarrage', async ({ page }) => {
    await page.route('**/api/config', route => route.fulfill({ json: { adminPath: '/atelier-cv', ephemeral: false } }))
    await page.goto('/atelier-cv/cv')
    await page.getByRole('button', { name: 'Nouveau CV', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Titre du CV').fill('CV chemin personnalisé')
    await dialog.getByRole('button', { name: 'Créer', exact: true }).click()
    await expect(page).toHaveURL(/\/atelier-cv\/cv\/[a-z0-9-]+$/)
    await expect(page.getByRole('button', { name: 'Ajouter une section', exact: true })).toBeVisible()
  })

  test('un rechargement immédiat avertit avant de perdre une saisie non enregistrée', async ({ page }) => {
    await openSample(page)
    await page.getByRole('textbox', { name: 'Nom complet', exact: true }).fill('Saisie non enregistrée')
    await expect(page.getByText('Modifications en attente…', { exact: true })).toBeVisible()
    let kind = ''
    page.once('dialog', async dialog => { kind = dialog.type(); await dialog.dismiss() })
    await page.reload({ timeout: 3000 }).catch(() => {})
    expect(kind).toBe('beforeunload')
    await expect(page.getByRole('textbox', { name: 'Nom complet', exact: true })).toHaveValue('Saisie non enregistrée')
  })

  test('le portfolio public affiche les CV publiés : aperçu bref, lien direct et téléchargement PDF', async ({ page, browser }) => {
    const cv = await openSample(page)
    await page.getByRole('button', { name: 'Publier le CV', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Voir le CV public' })).toBeVisible()

    const guest = await browser.newContext()
    const visitor = await guest.newPage()
    await visitor.goto('/')
    const board = visitor.locator('#cv')
    // D'autres tests de la suite laissent des CV publiés : on vise la carte
    // de CE CV, identifiée par son lien direct /cv/{slug}.
    const card = board.locator('article').filter({ has: visitor.locator(`a[href="/cv/${cv.meta.slug}"]`) })
    await expect(board).toBeVisible()
    await expect(card.getByText('Camille Martin', { exact: true })).toBeVisible()
    await expect(card.getByText('Développeuse créative', { exact: true })).toBeVisible()
    await expect(card.getByText('expériences utiles')).toBeVisible()
    await expect(visitor.getByRole('navigation').getByRole('link', { name: 'CV en ligne', exact: true })).toBeVisible()

    const seeCV = card.getByRole('link', { name: 'Voir le CV', exact: true })
    await expect(seeCV).toHaveAttribute('href', new RegExp(`/cv/${cv.meta.slug.replace(/[^\w-]/g, '\\$&')}$`))
    const [download] = await Promise.all([
      visitor.waitForEvent('download'),
      card.getByRole('button', { name: 'Télécharger le CV en PDF', exact: true }).click(),
    ])
    expect((await readFile((await download.path())!, 'utf8')).slice(0, 5)).toBe('%PDF-')

    await page.getByRole('button', { name: 'Dépublier le CV', exact: true }).click()
    await expect.poll(async () => {
      await visitor.reload()
      return card.count()
    }).toBe(0)
    await guest.close()
  })

  test('un CV supprimé depuis un autre onglet affiche une erreur sans conserver l’ancien éditeur', async ({ page }) => {
    const stale = await (await page.request.post('/api/admin/cv', { data: sampleCV(crypto.randomUUID()) })).json()
    await openSample(page)
    await page.request.delete(`/api/admin/cv/${stale.meta.id}`)
    await page.getByRole('button', { name: 'CV Camille Martin', exact: true }).click()
    await page.locator(`[data-cv-id="${stale.meta.id}"]`).getByRole('button', { name: 'CV Camille Martin', exact: true }).click()
    await expect(page.getByText('CV introuvable', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Nom complet', exact: true })).toHaveCount(0)
  })
})
