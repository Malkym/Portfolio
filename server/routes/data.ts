import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  loadPortfolio,
  savePortfolio,
  replacePortfolio,
  toPublicView,
  upsertCustomSection,
  deleteCustomSection,
} from '../models/PortfolioData.js'
import {
  listSnapshots,
  getSnapshot,
  logAction,
  recentActions,
  createSnapshot,
} from '../database/db.js'
import { requireAuth, clientIp } from '../middleware/auth.js'
import type { PortfolioData, CustomSection, DynamicItem } from '../../src/shared/types/portfolio.types.js'

const router = Router()

/* ================================================================== */
/* PUBLIC                                                              */
/* ================================================================== */

router.get('/data', (_req, res) => {
  res.json(toPublicView(loadPortfolio()))
})

/* ================================================================== */
/* ADMIN — tout ce qui suit exige une session valide                    */
/* ================================================================== */

// Portée explicite sur `/admin` : un `router.use(requireAuth)` sans chemin
// s'appliquerait à TOUTE requête traversant ce routeur — y compris celles
// destinées aux routeurs montés après lui sur `/api`, qu'il bloquerait.
router.use('/admin', requireAuth)

/** Config complète, non filtrée. */
router.get('/admin/data', (_req, res) => {
  res.json(loadPortfolio())
})

/** Mise à jour partielle par fusion profonde. */
router.patch('/admin/data', (req, res) => {
  const updated = savePortfolio(req.body ?? {}, 'modification')
  logAction('update_data', Object.keys(req.body ?? {}).join(', '), clientIp(req))
  res.json(updated)
})

/* ------------------------------------------------------------------ */
/* CRUD générique sur les collections natives                          */
/* ------------------------------------------------------------------ */

/**
 * Les sections natives partagent toutes la même forme : un tableau d'objets
 * avec `id`, `order`, `enabled`, `archived`. Un seul jeu de routes les couvre
 * donc toutes, plutôt que dix contrôleurs identiques.
 */
const COLLECTIONS = {
  projects: 'items',
  experience: 'items',
  education: 'items',
  testimonials: 'items',
  articles: 'items',
  timeline: 'items',
  gallery: 'items',
  stats: 'items',
  skills: 'categories',
} as const

type CollectionName = keyof typeof COLLECTIONS

function collectionOf(data: PortfolioData, name: CollectionName): Record<string, unknown>[] {
  const key = COLLECTIONS[name]
  const section = data[name] as unknown as Record<string, unknown[]>
  if (!Array.isArray(section[key])) section[key] = []
  return section[key] as Record<string, unknown>[]
}

function assertCollection(name: string): CollectionName {
  if (!(name in COLLECTIONS)) throw new Error(`Collection inconnue : ${name}`)
  return name as CollectionName
}

router.get('/admin/collection/:name', (req, res) => {
  try {
    const name = assertCollection(req.params.name)
    res.json(collectionOf(loadPortfolio(), name))
  } catch (e) {
    res.status(404).json({ error: (e as Error).message })
  }
})

router.post('/admin/collection/:name', (req, res) => {
  try {
    const name = assertCollection(req.params.name)
    const data = loadPortfolio()
    const list = collectionOf(data, name)

    const item = {
      id: randomUUID(),
      order: list.length,
      enabled: true,
      archived: false,
      ...(req.body ?? {}),
    }
    list.push(item)

    savePortfolio(data)
    logAction('create', `${name}/${item.id}`, clientIp(req))
    res.status(201).json(item)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

router.put('/admin/collection/:name/:id', (req, res) => {
  try {
    const name = assertCollection(req.params.name)
    const data = loadPortfolio()
    const list = collectionOf(data, name)
    const index = list.findIndex((i) => i.id === req.params.id)

    if (index < 0) {
      res.status(404).json({ error: 'Élément introuvable' })
      return
    }

    // `id` reste immuable : le client ne peut pas le réécrire par accident.
    list[index] = { ...list[index], ...(req.body ?? {}), id: req.params.id }
    savePortfolio(data)
    logAction('update', `${name}/${req.params.id}`, clientIp(req))
    res.json(list[index])
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

/**
 * Suppression. Par défaut on ARCHIVE au lieu de détruire — le mode "legacy"
 * du cahier des charges. `?hard=true` supprime réellement.
 */
router.delete('/admin/collection/:name/:id', (req, res) => {
  try {
    const name = assertCollection(req.params.name)
    const data = loadPortfolio()
    const list = collectionOf(data, name)
    const index = list.findIndex((i) => i.id === req.params.id)

    if (index < 0) {
      res.status(404).json({ error: 'Élément introuvable' })
      return
    }

    if (req.query.hard === 'true') {
      createSnapshot(`suppression-${name}`, data)
      list.splice(index, 1)
      logAction('delete_hard', `${name}/${req.params.id}`, clientIp(req))
    } else {
      list[index].archived = true
      list[index].enabled = false
      logAction('archive', `${name}/${req.params.id}`, clientIp(req))
    }

    savePortfolio(data)
    res.json({ ok: true, archived: req.query.hard !== 'true' })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

/** Réordonnancement par drag & drop : le client envoie la liste d'ids ordonnée. */
router.post('/admin/collection/:name/reorder', (req, res) => {
  try {
    const name = assertCollection(req.params.name)
    const ids = z.array(z.string()).parse(req.body?.ids)
    const data = loadPortfolio()
    const list = collectionOf(data, name)

    ids.forEach((id, position) => {
      const item = list.find((i) => i.id === id)
      if (item) item.order = position
    })
    list.sort((a, b) => Number(a.order) - Number(b.order))

    savePortfolio(data)
    logAction('reorder', name, clientIp(req))
    res.json(list)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

/* ------------------------------------------------------------------ */
/* Sections dynamiques                                                  */
/* ------------------------------------------------------------------ */

const fieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    'text', 'textarea', 'rich-text', 'number', 'date', 'image',
    'url', 'boolean', 'select', 'tags', 'color', 'rating',
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  help: z.string().optional(),
  role: z.enum(['title', 'subtitle', 'body', 'media', 'link', 'meta']).optional(),
})

const sectionSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug invalide (a-z, 0-9, tirets)'),
  icon: z.string().default('star'),
  enabled: z.boolean().default(true),
  layout: z.enum(['cards', 'list', 'timeline', 'grid', 'table']).default('cards'),
  fields: z.array(fieldSchema).min(1, 'Au moins un champ est requis'),
})

router.post('/admin/sections', (req, res) => {
  const parsed = sectionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Section invalide' })
    return
  }

  const data = loadPortfolio()
  if (data.customSections.some((s) => s.slug === parsed.data.slug)) {
    res.status(409).json({ error: 'Ce slug est déjà utilisé' })
    return
  }

  const section: CustomSection = {
    id: randomUUID(),
    order: data.customSections.length,
    items: [],
    ...parsed.data,
  }

  upsertCustomSection(section)
  logAction('create_section', section.slug, clientIp(req))
  res.status(201).json(section)
})

router.put('/admin/sections/:id', (req, res) => {
  const data = loadPortfolio()
  const existing = data.customSections.find((s) => s.id === req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Section introuvable' })
    return
  }

  const updated: CustomSection = { ...existing, ...(req.body ?? {}), id: existing.id }
  upsertCustomSection(updated)
  logAction('update_section', updated.slug, clientIp(req))
  res.json(updated)
})

router.delete('/admin/sections/:id', (req, res) => {
  deleteCustomSection(req.params.id)
  logAction('delete_section', req.params.id, clientIp(req))
  res.json({ ok: true })
})

/** CRUD sur les éléments d'une section dynamique. */
router.post('/admin/sections/:id/items', (req, res) => {
  const data = loadPortfolio()
  const section = data.customSections.find((s) => s.id === req.params.id)
  if (!section) {
    res.status(404).json({ error: 'Section introuvable' })
    return
  }

  // Validation dérivée des champs définis par l'admin lui-même.
  const payload = (req.body ?? {}) as Record<string, unknown>
  for (const field of section.fields) {
    if (field.required && !payload[field.name]) {
      res.status(400).json({ error: `Le champ « ${field.label} » est obligatoire` })
      return
    }
  }

  const now = new Date().toISOString()
  const item: DynamicItem = {
    id: randomUUID(),
    order: section.items.length,
    enabled: true,
    archived: false,
    data: payload,
    createdAt: now,
    updatedAt: now,
  }

  section.items.push(item)
  savePortfolio(data)
  res.status(201).json(item)
})

router.put('/admin/sections/:id/items/:itemId', (req, res) => {
  const data = loadPortfolio()
  const section = data.customSections.find((s) => s.id === req.params.id)
  const item = section?.items.find((i) => i.id === req.params.itemId)
  if (!section || !item) {
    res.status(404).json({ error: 'Élément introuvable' })
    return
  }

  item.data = { ...item.data, ...(req.body?.data ?? req.body ?? {}) }
  if (typeof req.body?.enabled === 'boolean') item.enabled = req.body.enabled
  item.updatedAt = new Date().toISOString()

  savePortfolio(data)
  res.json(item)
})

router.delete('/admin/sections/:id/items/:itemId', (req, res) => {
  const data = loadPortfolio()
  const section = data.customSections.find((s) => s.id === req.params.id)
  if (!section) {
    res.status(404).json({ error: 'Section introuvable' })
    return
  }

  section.items = section.items.filter((i) => i.id !== req.params.itemId)
  savePortfolio(data)
  res.json({ ok: true })
})

/* ------------------------------------------------------------------ */
/* Sauvegarde / restauration                                            */
/* ------------------------------------------------------------------ */

router.get('/admin/export', (req, res) => {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    portfolio: loadPortfolio(),
  }
  logAction('export', '', clientIp(req))
  res.setHeader('Content-Disposition', `attachment; filename="portfolio-${Date.now()}.json"`)
  res.json(payload)
})

router.post('/admin/import', (req, res) => {
  const incoming = req.body?.portfolio ?? req.body
  if (!incoming || typeof incoming !== 'object') {
    res.status(400).json({ error: 'Fichier de sauvegarde illisible' })
    return
  }

  const restored = replacePortfolio(incoming)
  logAction('import', '', clientIp(req))
  res.json(restored)
})

router.get('/admin/snapshots', (_req, res) => {
  res.json(listSnapshots())
})

router.post('/admin/snapshots/:id/restore', (req, res) => {
  const payload = getSnapshot(Number(req.params.id))
  if (!payload) {
    res.status(404).json({ error: 'Snapshot introuvable' })
    return
  }

  const restored = replacePortfolio(payload, 'avant-restauration')
  logAction('restore_snapshot', req.params.id, clientIp(req))
  res.json(restored)
})

router.get('/admin/activity', (_req, res) => {
  res.json(recentActions(30))
})

export default router
