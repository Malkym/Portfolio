import { test, expect, type Page } from '@playwright/test'

// Les tests de ce fichier ont besoin d’une session admin : le cookie est
// réinjecté depuis l’ouverture de session unique (auth.setup).
test.use({ storageState: 'tests/e2e/.auth/admin.json' })

const PROJECTS_PATH = '/admin-secret/projects'

function row(page: Page, title: string) {
  return page.locator('ul li').filter({ hasText: title })
}

test.describe('CRUD sections (projets)', () => {
  test('créer, modifier, archiver, supprimer définitivement et réordonner', async ({ page, request }) => {
    const suffix = String(Date.now())
    const t1 = `Projet E2E Alpha ${suffix}`
    const t1Modifie = `Projet E2E Omega ${suffix}`
    const t3 = `Projet E2E Gamma ${suffix}`

    // ---------- Créer ----------
    await page.goto(PROJECTS_PATH)
    await page.locator('button:has-text("+ Ajouter")').click()
    await page.locator('#f-title').fill(t1)
    await page.locator('#f-description').fill('Description de test')
    await page.locator('button[type="submit"]:has-text("Enregistrer")').click()
    await expect(row(page, t1)).toBeVisible()

    const created = (await (await request.get('/api/admin/collection/projects')).json()) as {
      id: string
      title: string
    }[]
    const item = created.find((i) => i.title === t1)
    expect(item).toBeDefined()
    const itemId = item!.id

    // ---------- Modifier ----------
    await row(page, t1).locator('button:has-text("Modifier")').click()
    await page.locator('#f-title').fill(t1Modifie)
    await page.locator('button[type="submit"]:has-text("Enregistrer")').click()
    await expect(row(page, t1Modifie)).toBeVisible()
    await expect(row(page, t1)).not.toBeVisible()

    // ---------- Archiver (soft delete) ----------
    await row(page, t1Modifie).locator('button:has-text("Supprimer")').click()
    await page.locator('button:has-text("Archiver")').click()
    await expect(row(page, t1Modifie).locator('text=Archivé')).toBeVisible()
    const archivedList = (await (await request.get('/api/admin/collection/projects')).json()) as {
      id: string
      archived: boolean
    }[]
    expect(archivedList.find((i) => i.id === itemId)?.archived).toBe(true)

    // ---------- Suppression définitive (hard delete) ----------
    await page.locator('button:has-text("+ Ajouter")').click()
    await page.locator('#f-title').fill(t3)
    await page.locator('#f-description').fill('À supprimer')
    await page.locator('button[type="submit"]:has-text("Enregistrer")').click()
    await expect(row(page, t3)).toBeVisible()

    const allBefore = (await (await request.get('/api/admin/collection/projects')).json()) as {
      id: string
      title: string
    }[]
    const hardItem = allBefore.find((i) => i.title === t3)
    expect(hardItem).toBeDefined()
    const hardId = hardItem!.id

    await row(page, t3).locator('button:has-text("Supprimer")').click()
    await page.locator('button:has-text("Supprimer définitivement")').click()
    await expect(row(page, t3)).not.toBeVisible()

    const allAfter = (await (await request.get('/api/admin/collection/projects')).json()) as { id: string }[]
    expect(allAfter.find((i) => i.id === hardId)).toBeUndefined()

    // ---------- Réordonnancement drag & drop ----------
    await page.goto(PROJECTS_PATH)
    const list = (await (await request.get('/api/admin/collection/projects')).json()) as {
      id: string
      title: string
      order: number
    }[]
    const mine = list.filter((i) => String(i.title).startsWith('Projet E2E'))
    mine.sort((a, b) => a.order - b.order)
    expect(mine.length).toBeGreaterThanOrEqual(2)

    const first = page.locator('ul li').filter({ hasText: mine[0].title })
    const last = page.locator('ul li').filter({ hasText: mine[mine.length - 1].title })

    const reorderResponse = page.waitForResponse(
      (resp) => resp.url().includes('/reorder') && resp.request().method() === 'POST',
    )
    await last.dragTo(first)
    await reorderResponse

    const after = (await (await request.get('/api/admin/collection/projects')).json()) as {
      id: string
      order: number
    }[]
    const moved = after.find((i) => i.id === mine[mine.length - 1].id)
    const ref = after.find((i) => i.id === mine[0].id)
    expect(moved).toBeDefined()
    expect(ref).toBeDefined()
    expect(moved!.order).toBeLessThan(ref!.order)
  })
})
