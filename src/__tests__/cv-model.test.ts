// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { sampleCV } from '../../tests/fixtures/cv'

mkdirSync('/tmp/opencode', { recursive: true })
process.env.DATABASE_PATH = `${mkdtempSync('/tmp/opencode/cv-model-')}/test.db`
process.env.TURSO_DATABASE_URL = ''
const { saveCV, saveSnapshot, deleteCV, toPublicView } = await import('../../server/models/CVData')
const { all } = await import('../../server/database/db')

describe('Persistance et publication du CV', () => {
  it('retire aussi les éléments masqués du JSON public, pas seulement du rendu', () => {
    const cv = sampleCV()
    const published = toPublicView(cv)
    expect(JSON.stringify(published)).not.toContain('EMPLOI MASQUÉ')
    expect(JSON.stringify(published)).not.toContain('camille@example.com')
    expect(cv.sections[2]!.data.items).toHaveLength(2)
  })
  it('conserve une sauvegarde dans l’historique propre au CV avant modification', async () => {
    const cv = sampleCV('history')
    await saveCV(cv)
    cv.meta.title = 'Titre révisé'
    await saveCV(cv, 'modification')
    const rows = await all<{ payload: string }>('SELECT payload FROM cv_snapshots WHERE cv_id = ?', 'history')
    expect(rows).toHaveLength(1)
    expect(JSON.parse(rows[0]!.payload).meta.title).toBe('CV Camille Martin')
  })
  it('la rotation des sauvegardes d’un CV ne supprime pas celles d’un autre CV', async () => {
    await saveSnapshot('other', 'important', { keep: true })
    for (let i = 0; i < 51; i++) await saveSnapshot('rotating', `save-${i}`, { i })
    expect(await all('SELECT id FROM cv_snapshots WHERE cv_id = ?', 'other')).toHaveLength(1)
    expect(await all('SELECT id FROM cv_snapshots WHERE cv_id = ?', 'rotating')).toHaveLength(50)
    await deleteCV('rotating')
    expect(await all('SELECT id FROM cv_snapshots WHERE cv_id = ?', 'other')).toHaveLength(1)
  })
})
