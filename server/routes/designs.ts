import { Router } from 'express'
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { loadPortfolio, savePortfolio } from '../models/PortfolioData.js'
import { logAction } from '../database/db.js'
import { requireAuth, clientIp } from '../middleware/auth.js'
import type { ThemeDefinition } from '../../src/shared/types/portfolio.types.js'

const router = Router()
const DESIGNS_DIR = resolve('./data/designs')

/** Cache mémoire : les thèmes sont des fichiers statiques, inutile de relire le disque. */
let cache: Map<string, ThemeDefinition> | null = null

function allThemes(): Map<string, ThemeDefinition> {
  if (cache) return cache

  const map = new Map<string, ThemeDefinition>()
  if (!existsSync(DESIGNS_DIR)) {
    console.warn('[designs] data/designs introuvable — lancez `npm run themes`.')
    cache = map
    return map
  }

  for (const file of readdirSync(DESIGNS_DIR)) {
    if (!file.endsWith('.json') || file === 'index.json') continue
    try {
      const theme = JSON.parse(readFileSync(resolve(DESIGNS_DIR, file), 'utf8')) as ThemeDefinition
      if (theme?.id) map.set(theme.id, theme)
    } catch {
      // Un thème cassé ne doit pas empêcher les 21 autres de se charger.
      console.error(`[designs] thème illisible ignoré : ${file}`)
    }
  }

  cache = map
  return map
}

export function invalidateThemeCache(): void {
  cache = null
}

/**
 * Résout le thème à appliquer maintenant.
 *
 * Priorité : rotation mensuelle si activée et un thème est planifié pour le
 * mois courant, sinon le thème choisi manuellement, sinon un repli sûr.
 * Le repli est important : dans 15 ans, si un fichier de thème a disparu,
 * le site doit continuer à s'afficher.
 */
export function resolveActiveTheme(): ThemeDefinition {
  const themes = allThemes()
  const { design } = loadPortfolio()

  if (design.autoRotate) {
    const month = String(new Date().getMonth() + 1)
    const scheduled = design.schedule?.[month]
    if (scheduled && themes.has(scheduled)) return themes.get(scheduled)!
  }

  if (design.active && themes.has(design.active)) return themes.get(design.active)!

  const fallback = themes.get('dark-matter') ?? themes.values().next().value
  if (!fallback) throw new Error('Aucun thème disponible. Lancez `npm run themes`.')
  return fallback
}

/* ================================================================== */
/* PUBLIC                                                              */
/* ================================================================== */

router.get('/designs', (_req, res) => {
  res.json(
    [...allThemes().values()].map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      scheme: t.scheme,
      swatch: [t.colors.primary, t.colors.secondary, t.colors.bg],
    })),
  )
})

/** Thème actif résolu, personnalisations admin déjà fusionnées. */
router.get('/designs/active', (_req, res) => {
  const theme = resolveActiveTheme()
  const { design } = loadPortfolio()

  res.json({
    ...theme,
    colors: { ...theme.colors, ...design.customColors },
    typography: { ...theme.typography, ...design.customTypography },
    customCss: design.customCss,
    animationSpeed: design.animationSpeed,
    animationsEnabled: design.animationsEnabled,
  })
})

/** Un thème précis, pour la prévisualisation dans l'admin. */
router.get('/designs/:id', (req, res) => {
  const theme = allThemes().get(req.params.id)
  if (!theme) {
    res.status(404).json({ error: 'Thème introuvable' })
    return
  }
  res.json(theme)
})

/* ================================================================== */
/* ADMIN                                                               */
/* ================================================================== */

router.use('/admin', requireAuth)

router.post('/admin/designs/activate', (req, res) => {
  const id = String(req.body?.id ?? '')
  if (!allThemes().has(id)) {
    res.status(404).json({ error: 'Thème introuvable' })
    return
  }

  // Activer manuellement coupe la rotation : sinon le choix serait écrasé
  // au changement de mois, ce qui serait déroutant.
  savePortfolio({ design: { ...loadPortfolio().design, active: id, autoRotate: false } })
  logAction('activate_theme', id, clientIp(req))
  res.json({ ok: true, active: id })
})

router.put('/admin/designs/schedule', (req, res) => {
  const schedule = (req.body?.schedule ?? {}) as Record<string, string>
  const themes = allThemes()

  for (const [month, id] of Object.entries(schedule)) {
    if (!/^([1-9]|1[0-2])$/.test(month)) {
      res.status(400).json({ error: `Mois invalide : ${month}` })
      return
    }
    if (id && !themes.has(id)) {
      res.status(400).json({ error: `Thème inconnu : ${id}` })
      return
    }
  }

  const design = loadPortfolio().design
  savePortfolio({
    design: { ...design, schedule, autoRotate: req.body?.autoRotate ?? design.autoRotate },
  })
  logAction('update_schedule', Object.keys(schedule).join(','), clientIp(req))
  res.json({ ok: true, schedule })
})

/** Import d'un thème personnalisé fourni en JSON. */
router.post('/admin/designs/upload', (req, res) => {
  const theme = req.body as ThemeDefinition

  const missing = ['id', 'name', 'colors', 'typography'].filter(
    (k) => !(k in (theme ?? {})),
  )
  if (missing.length) {
    res.status(400).json({ error: `Champs manquants : ${missing.join(', ')}` })
    return
  }

  if (!/^[a-z0-9-]+$/.test(theme.id)) {
    res.status(400).json({ error: 'Identifiant invalide (a-z, 0-9, tirets)' })
    return
  }

  // `basename` neutralise toute tentative de traversée de chemin dans l'id.
  writeFileSync(
    resolve(DESIGNS_DIR, `${basename(theme.id)}.json`),
    JSON.stringify(theme, null, 2),
    'utf8',
  )
  invalidateThemeCache()
  logAction('upload_theme', theme.id, clientIp(req))
  res.status(201).json({ ok: true, id: theme.id })
})

/** Personnalisation du thème actif (couleurs, typo, CSS libre). */
router.patch('/admin/designs/customize', (req, res) => {
  const design = loadPortfolio().design
  const updated = savePortfolio({
    design: {
      ...design,
      customColors: req.body?.customColors ?? design.customColors,
      customTypography: req.body?.customTypography ?? design.customTypography,
      customCss: req.body?.customCss ?? design.customCss,
      animationSpeed: req.body?.animationSpeed ?? design.animationSpeed,
      animationsEnabled: req.body?.animationsEnabled ?? design.animationsEnabled,
    },
  })
  logAction('customize_theme', '', clientIp(req))
  res.json(updated.design)
})

router.post('/admin/designs/reset-customization', (req, res) => {
  const design = loadPortfolio().design
  const updated = savePortfolio({
    design: { ...design, customColors: {}, customTypography: {}, customCss: '' },
  })
  logAction('reset_customization', '', clientIp(req))
  res.json(updated.design)
})

export default router
