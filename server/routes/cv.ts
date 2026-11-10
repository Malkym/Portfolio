import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import {
  loadCV,
  loadAllCVs,
  saveCV,
  deleteCV,
  syncFromPortfolio,
  toPublicView,
} from '../models/CVData.js'
import { requireAuth, asyncMiddleware } from '../middleware/auth.js'
import { buildCVHTML, generateCVPDF } from '../services/pdfGenerator.js'
import type { CVData, CVThemeDefinition, PublicCVView, CVPublicBrief } from '../../src/shared/types/cv.types.js'
import { cvDataSchema, cvMetaSchema, cvSectionSchema } from '../../src/shared/types/cv.schemas.js'
import { renderCVRichText } from '../../src/shared/utils/cvRichText.js'

const router = Router()
const CV_DESIGNS_DIR = resolve(process.env.CV_DESIGNS_PATH || './data/cv-designs')
let cvThemesCache: Map<string, CVThemeDefinition> | null = null

function loadCVThemes(): Map<string, CVThemeDefinition> {
  if (cvThemesCache) return cvThemesCache

  const themes = new Map<string, CVThemeDefinition>()
  if (!existsSync(CV_DESIGNS_DIR)) {
    console.warn('[cv] data/cv-designs introuvable — lancez `npm run cv:themes`.')
    cvThemesCache = themes
    return themes
  }

  for (const file of readdirSync(CV_DESIGNS_DIR)) {
    if (!file.endsWith('.json') || file === 'index.json') continue
    try {
      const theme = JSON.parse(readFileSync(resolve(CV_DESIGNS_DIR, file), 'utf8')) as CVThemeDefinition
      if (theme.id) themes.set(theme.id, theme)
    } catch {
      console.error(`[cv] thème CV illisible ignoré : ${file}`)
    }
  }

  cvThemesCache = themes
  return themes
}

function resolveCVTheme(themeId: string): CVThemeDefinition | undefined {
  const themes = loadCVThemes()
  return themes.get(themeId) ?? themes.get('clean-white')
}

/* ================================================================== */
/* VALIDATION                                                         */
/* ================================================================== */

async function slugAvailable(slug: string, id?: string): Promise<boolean> {
  return !(await loadAllCVs()).some(cv => cv.meta.slug === slug && cv.meta.id !== id)
}

/* ================================================================== */
/* PUBLIC                                                             */
/* ================================================================== */

/** Liste les thèmes complets utilisés par le générateur de CV. */
router.get('/cv/themes', (_req, res) => {
  res.json([...loadCVThemes().values()])
})

/** Liste publique simplifiée des CV publiés : métadonnées + aperçu bref sans données privées. */
function cvBrief(cv: CVData): CVPublicBrief {
  const view = toPublicView(cv)
  const header = (view.sections.find((s) => s.type === 'header')?.data ?? {}) as Record<string, unknown>
  const summary = view.sections.find((s) => s.type === 'summary')
  const excerpt = renderCVRichText(summary?.content ?? summary?.data.content)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
  return {
    id: cv.meta.id,
    slug: cv.meta.slug,
    title: cv.meta.title,
    themeId: cv.meta.themeId,
    name: String(header.name ?? ''),
    role: String(header.title ?? ''),
    excerpt,
    updatedAt: cv.meta.updatedAt,
  }
}

router.get('/cv/public', asyncMiddleware(async (_req, res) => {
  const cvs = await loadAllCVs()
  res.json(cvs.filter((m) => m.meta.isPublic).map(cvBrief))
}))

/** CV public par slug (sans données sensibles). */
router.get('/cv/public/:slug', asyncMiddleware(async (req, res) => {
  const cvs = await loadAllCVs()
  const meta = cvs.find((m) => m.meta.slug === req.params.slug && m.meta.isPublic)
  if (!meta) {
    res.status(404).json({ error: 'CV introuvable' })
    return
  }

  const cv = await loadCV(meta.meta.id)
  if (!cv) {
    res.status(404).json({ error: 'CV introuvable' })
    return
  }

  res.json(toPublicView(cv))
}))

/** Génère et télécharge le PDF d'un CV publié (route publique, sans auth). */
router.post('/cv/public/:slug/pdf', asyncMiddleware(async (req, res) => {
  const cvs = await loadAllCVs()
  const meta = cvs.find((m) => m.meta.slug === req.params.slug && m.meta.isPublic)
  if (!meta) {
    res.status(404).json({ error: 'CV introuvable' })
    return
  }

  const cv = await loadCV(meta.meta.id)
  if (!cv) {
    res.status(404).json({ error: 'CV introuvable' })
    return
  }

  const theme = resolveCVTheme(cv.meta.themeId)
  if (!theme) {
    res.status(500).json({ error: 'Aucun thème CV disponible. Lancez `npm run cv:themes`.' })
    return
  }
  const publicView = toPublicView(cv) as PublicCVView

  let html: string
  try {
    html = buildCVHTML(publicView, theme)
  } catch (e) {
    res.status(500).json({ error: 'Échec de la construction du HTML : ' + (e as Error).message })
    return
  }

  let pdf: Buffer
  try {
    pdf = await generateCVPDF(html)
  } catch (e) {
    res.status(500).json({ error: 'Échec de la génération PDF : ' + (e as Error).message })
    return
  }

  const slug = String(cv.meta.slug || cv.meta.id).replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="cv-${slug}.pdf"`)
  res.setHeader('Content-Length', String(pdf.length))
  res.send(pdf)
}))

/* ================================================================== */
/* ADMIN — requireAuth sur tout ce qui suit                           */
/* ================================================================== */

router.use('/admin', requireAuth)

/** Liste complète des CV (admin). */
router.get('/admin/cv', asyncMiddleware(async (_req, res) => {
  const cvs = await loadAllCVs()
  res.json(cvs)
}))

/** CV complet par id (admin). */
router.get('/admin/cv/:id', asyncMiddleware(async (req, res) => {
  const cv = await loadCV(req.params.id)
  if (!cv) {
    res.status(404).json({ error: 'CV introuvable' })
    return
  }
  res.json(cv)
}))

/** Créer un CV (vide ou depuis template). */
router.post('/admin/cv', asyncMiddleware(async (req, res) => {
  const parsed = cvDataSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'CV invalide' })
    return
  }

  const id = randomUUID()
  const existing = await loadCV(id)
  if (existing) {
    res.status(409).json({ error: 'Un CV avec cet id existe déjà' })
    return
  }

  const now = new Date().toISOString()
  if (!(await slugAvailable(parsed.data.meta.slug))) {
    res.status(409).json({ error: 'Cette adresse de CV est déjà utilisée. Choisissez un autre titre ou une autre adresse.' })
    return
  }
  const cv: CVData = {
    meta: {
      id,
      slug: parsed.data.meta.slug || id,
      title: parsed.data.meta.title,
      isPublic: parsed.data.meta.isPublic ?? false,
      themeId: parsed.data.meta.themeId || 'clean-white',
      themeOverrides: parsed.data.meta.themeOverrides,
      createdAt: now,
      updatedAt: now,
    },
    sections: parsed.data.sections?.map((s, i) => ({
      id: s.id || randomUUID(),
      type: s.type as CVData['sections'][number]['type'],
      enabled: s.enabled ?? true,
      order: s.order ?? i,
      data: s.data,
      content: s.content,
    })) ?? [],
  }

  await saveCV(cv)
  res.status(201).json(cv)
}))

/** Remplacement complet d'un CV. */
router.put('/admin/cv/:id', asyncMiddleware(async (req, res) => {
  const parsed = cvDataSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'CV invalide' })
    return
  }

  const existing = await loadCV(req.params.id)
  const now = new Date().toISOString()
  const id = req.params.id
  if (!(await slugAvailable(parsed.data.meta.slug, id))) {
    res.status(409).json({ error: 'Cette adresse de CV est déjà utilisée.' })
    return
  }

  if (!existing) {
    // Import / restauration : on crée le CV s'il n'existe plus.
    const cv: CVData = {
      meta: {
        id,
        slug: parsed.data.meta.slug || id,
        title: parsed.data.meta.title,
        isPublic: parsed.data.meta.isPublic ?? false,
        themeId: parsed.data.meta.themeId || 'clean-white',
        themeOverrides: parsed.data.meta.themeOverrides,
        createdAt: now,
        updatedAt: now,
      },
      sections: parsed.data.sections?.map((s, i) => ({
        id: s.id || randomUUID(),
        type: s.type as CVData['sections'][number]['type'],
        enabled: s.enabled ?? true,
        order: s.order ?? i,
        data: s.data,
        content: s.content,
      })) ?? [],
    }

    await saveCV(cv)
    res.status(201).json(cv)
    return
  }

  const cv: CVData = {
    meta: {
      id: req.params.id,
      slug: parsed.data.meta.slug || existing.meta.slug,
      title: parsed.data.meta.title,
      isPublic: parsed.data.meta.isPublic ?? existing.meta.isPublic,
      themeId: parsed.data.meta.themeId || existing.meta.themeId,
      themeOverrides: parsed.data.meta.themeOverrides ?? existing.meta.themeOverrides,
      createdAt: existing.meta.createdAt,
      updatedAt: now,
    },
    sections: parsed.data.sections?.map((s, i) => ({
      id: s.id || randomUUID(),
      type: s.type as CVData['sections'][number]['type'],
      enabled: s.enabled ?? true,
      order: s.order ?? i,
      data: s.data,
      content: s.content,
    })) ?? [],
  }

  await saveCV(cv, 'modification')
  res.json(cv)
}))

/** Mise à jour partielle d'un CV. */
router.patch('/admin/cv/:id', asyncMiddleware(async (req, res) => {
  const cv = await loadCV(req.params.id)
  if (!cv) {
    res.status(404).json({ error: 'CV introuvable' })
    return
  }

  const patch = z
    .object({
      meta: cvMetaSchema.partial().optional(),
      sections: z.array(cvSectionSchema).optional(),
    })
    .safeParse(req.body)
  if (!patch.success) {
    res.status(400).json({ error: patch.error.issues[0]?.message ?? 'Payload invalide' })
    return
  }

  if (patch.data.meta?.slug && !(await slugAvailable(patch.data.meta.slug, cv.meta.id))) {
    res.status(409).json({ error: 'Cette adresse de CV est déjà utilisée.' })
    return
  }

  if (patch.data.meta) {
    cv.meta = {
      ...cv.meta,
      ...patch.data.meta,
      updatedAt: new Date().toISOString(),
    }
  }

  if (patch.data.sections) {
    cv.sections = patch.data.sections.map((s, i) => ({
      id: s.id || randomUUID(),
      type: s.type as CVData['sections'][number]['type'],
      enabled: s.enabled ?? true,
      order: s.order ?? i,
      data: s.data,
      content: s.content,
    }))
  }

  await saveCV(cv, 'modification')
  res.json(cv)
}))

/** Supprimer un CV. */
router.delete('/admin/cv/:id', asyncMiddleware(async (req, res) => {
  const cv = await loadCV(req.params.id)
  if (!cv) {
    res.status(404).json({ error: 'CV introuvable' })
    return
  }
  await deleteCV(req.params.id)
  res.json({ ok: true })
}))

/** Générer le PDF d'un CV et le retourner en téléchargement. */
router.post('/admin/cv/:id/pdf', asyncMiddleware(async (req, res) => {
  const cv = await loadCV(req.params.id)
  if (!cv) {
    res.status(404).json({ error: 'CV introuvable' })
    return
  }

  const theme = resolveCVTheme(cv.meta.themeId)
  if (!theme) {
    res.status(500).json({ error: 'Aucun thème CV disponible. Lancez `npm run cv:themes`.' })
    return
  }
  let html: string
  try {
    html = buildCVHTML(cv, theme)
  } catch (e) {
    res.status(500).json({ error: 'Échec de la construction du HTML : ' + (e as Error).message })
    return
  }

  let pdf: Buffer
  try {
    pdf = await generateCVPDF(html)
  } catch (e) {
    res.status(500).json({ error: 'Échec de la génération PDF : ' + (e as Error).message })
    return
  }

  const slug = String(cv.meta.slug || cv.meta.id).replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="cv-${slug}.pdf"`)
  res.setHeader('Content-Length', String(pdf.length))
  res.send(pdf)
}))

/** Publier / dépublier un CV. */
router.post('/admin/cv/:id/publish', asyncMiddleware(async (req, res) => {
  const cv = await loadCV(req.params.id)
  if (!cv) {
    res.status(404).json({ error: 'CV introuvable' })
    return
  }

  const parsed = z.object({ isPublic: z.boolean().optional() }).safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Le statut de publication doit être un booléen.' })
    return
  }
  cv.meta.isPublic = parsed.data.isPublic ?? !cv.meta.isPublic
  cv.meta.updatedAt = new Date().toISOString()
  await saveCV(cv, 'publish')
  res.json({ ok: true, isPublic: cv.meta.isPublic })
}))

/** Sync un CV depuis le portfolio. */
router.post('/admin/cv/:id/sync', asyncMiddleware(async (req, res) => {
  const existing = await loadCV(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'CV introuvable' })
    return
  }

  try {
    const cv = await syncFromPortfolio(req.params.id)
    res.json({ ok: true, sections: cv.sections.length, cv })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error(`[cv] synchronisation portfolio impossible pour ${req.params.id}: ${message}`)
    res.status(500).json({ error: `Échec de la synchronisation du portfolio : ${message}` })
  }
}))

/** Créer un CV depuis un template. */
router.post('/admin/cv/from-template/:templateId', asyncMiddleware(async (req, res) => {
  const templateId = req.params.templateId
  const theme = loadCVThemes().get(templateId)
  if (!theme) {
    res.status(404).json({ error: 'Modèle CV introuvable' })
    return
  }

  const input = z.object({ title: z.string().trim().min(1).max(200).optional() }).safeParse(req.body)
  if (!input.success) {
    res.status(400).json({ error: input.error.issues[0]?.message ?? 'Titre invalide' })
    return
  }

  const id = randomUUID()

  const existing = await loadCV(id)
  if (existing) {
    res.status(409).json({ error: 'Un CV avec cet id existe déjà' })
    return
  }

  const now = new Date().toISOString()
  const title = input.data.title ?? `CV ${theme.name}`
  const slug =
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || id
  const cv: CVData = {
    meta: {
      id,
      slug: await slugAvailable(slug) ? slug : `${slug}-${id.slice(0, 8)}`,
      title,
      isPublic: false,
      themeId: templateId,
      createdAt: now,
      updatedAt: now,
    },
    sections: [],
  }

  await saveCV(cv)
  res.status(201).json(cv)
}))

export default router
