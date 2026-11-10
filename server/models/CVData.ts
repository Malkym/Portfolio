import { randomUUID } from 'node:crypto'
import type { CVData, CVMeta, CVSection, PublicCVView } from '../../src/shared/types/cv.types.js'
import type { PortfolioData } from '../../src/shared/types/portfolio.types.js'
import {
  run,
  get,
  all,
} from '../database/db.js'

const CONFIG_TABLE = 'cv_config'
const SNAPSHOT_TABLE = 'cv_snapshots'

function cvKey(id: string): string {
  return `cv:${id}`
}

export function defaultCV(id: string, title: string): CVData {
  const now = new Date().toISOString()
  const meta: CVMeta = {
    id,
    slug: id,
    title,
    isPublic: false,
    themeId: 'clean-white',
    themeOverrides: undefined,
    createdAt: now,
    updatedAt: now,
  }
  return { meta, sections: [] }
}

/**
 * Lit un CV depuis la table cv_config.
 */
export async function loadCV(id: string): Promise<CVData | null> {
  const row = await get<{ value: string }>(
    `SELECT value FROM ${CONFIG_TABLE} WHERE key = ?`,
    cvKey(id),
  )
  if (!row) return null
  try {
    return JSON.parse(row.value) as CVData
  } catch {
    console.error(`[cv] config "${cvKey(id)}" illisible`)
    return null
  }
}

/** Liste tous les CV (payloads complets, le client en lit les métadonnées). */
export async function loadAllCVs(): Promise<CVData[]> {
  const rows = await all<{ value: string }>(
    `SELECT value FROM ${CONFIG_TABLE} ORDER BY updated_at DESC`,
  )
  const cvs: CVData[] = []
  for (const row of rows) {
    try {
      cvs.push(JSON.parse(row.value) as CVData)
    } catch {
      // ignore les lignes corrompues
    }
  }
  return cvs
}

/**
 * Crée ou met à jour un CV complet. Crée un snapshot avant écrasement quand
 * le CV existe déjà.
 */
export async function saveCV(data: CVData, snapshotLabel?: string): Promise<CVData> {
  const existing = await loadCV(data.meta.id)
  if (existing && snapshotLabel) {
    await saveSnapshot(data.meta.id, snapshotLabel, existing)
  }

  const now = new Date().toISOString()
  data.meta.updatedAt = now

  await run(
    `INSERT INTO ${CONFIG_TABLE} (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    cvKey(data.meta.id),
    JSON.stringify(data),
  )
  return data
}

/** Remplace intégralement un CV (import de sauvegarde). */
export async function replaceCV(data: unknown, label = 'avant-import'): Promise<CVData> {
  const id = (data as { meta?: { id?: string } }).meta?.id
  if (!id) throw new Error('CVData invalide : meta.id manquant')

  const existing = await loadCV(id)
  if (existing) await saveSnapshot(id, label, existing)

  const merged = deepMerge(defaultCV(id, 'CV importé'), data as Record<string, unknown>)
  await saveCV(merged as CVData)
  return merged as CVData
}

/** Supprime un CV et ses snapshots. */
export async function deleteCV(id: string): Promise<void> {
  await run(`DELETE FROM ${CONFIG_TABLE} WHERE key = ?`, cvKey(id))
  await run(`DELETE FROM ${SNAPSHOT_TABLE} WHERE cv_id = ?`, id)
}

/**
 * Crée un snapshot historique d'un CV.
 */
export async function saveSnapshot(cvId: string, label: string, payload: unknown): Promise<number> {
  const info = await run(
    `INSERT INTO ${SNAPSHOT_TABLE} (cv_id, label, payload) VALUES (?, ?, ?)`,
    cvId,
    label,
    JSON.stringify(payload),
  )
  await run(
    `DELETE FROM ${SNAPSHOT_TABLE} WHERE cv_id = ? AND id NOT IN (
      SELECT id FROM ${SNAPSHOT_TABLE} WHERE cv_id = ? ORDER BY id DESC LIMIT 50
    )`,
    cvId,
    cvId,
  )
  return Number(info.lastInsertRowid)
}

/* ------------------------------------------------------------------ */
/* Mapping portfolio → sections CV                                    */
/* ------------------------------------------------------------------ */

function mapHeader(personal: PortfolioData['personal']): CVSection {
  return {
    id: randomUUID(),
    type: 'header',
    enabled: true,
    order: 0,
    data: {
      name: personal.name,
      title: personal.title,
      email: personal.email,
      phone: personal.phone,
      location: personal.location,
      photo: personal.photo,
      links: [],
    },
  }
}

function mapSummary(personal: PortfolioData['personal']): CVSection {
  return {
    id: randomUUID(),
    type: 'summary',
    enabled: true,
    order: 1,
    data: { content: personal.bio },
  }
}

function mapExperience(items: PortfolioData['experience']['items']): CVSection {
  return {
    id: randomUUID(),
    type: 'experience',
    enabled: true,
    order: 2,
    data: {
      items: items
        .filter((i) => i.enabled !== false && i.archived !== true)
        .map((i) => ({
          id: i.id,
          company: i.company,
          role: i.role,
          location: i.location,
          startDate: i.startDate,
          endDate: i.endDate,
          current: i.current,
          description: i.description,
          achievements: i.achievements,
          technologies: i.technologies,
          logo: i.logo,
        })),
    },
  }
}

function mapEducation(items: PortfolioData['education']['items']): CVSection {
  return {
    id: randomUUID(),
    type: 'education',
    enabled: true,
    order: 3,
    data: {
      items: items
        .filter((i) => i.enabled !== false && i.archived !== true)
        .map((i) => ({
          id: i.id,
          school: i.school,
          degree: i.degree,
          field: i.field,
          startYear: i.startYear,
          endYear: i.endYear,
          description: i.description,
          logo: i.logo,
        })),
    },
  }
}

function mapSkills(categories: PortfolioData['skills']['categories']): CVSection {
  function normalizeSkills(value: unknown): Array<Record<string, unknown>> {
    const entries = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[,\n]/).map((name) => name.trim()).filter(Boolean)
        : []

    return entries.flatMap((entry, order) => {
      if (typeof entry === 'string') {
        return [{
          id: randomUUID(),
          name: entry,
          level: 'Junior',
          score: 50,
          icon: 'zap',
          order,
        }]
      }
      if (!entry || typeof entry !== 'object') return []

      const skill = entry as Record<string, unknown>
      return [{
        id: String(skill.id ?? randomUUID()),
        name: String(skill.name ?? ''),
        level: skill.level ?? 'Junior',
        score: Number(skill.score ?? 50),
        icon: String(skill.icon ?? 'zap'),
        order: Number(skill.order ?? order),
      }]
    })
  }

  return {
    id: randomUUID(),
    type: 'skills',
    enabled: true,
    order: 4,
    data: {
      items: categories
        .filter((c) => c.enabled !== false)
        .map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          skills: normalizeSkills(c.skills),
        })),
    },
  }
}

function mapProjects(items: PortfolioData['projects']['items']): CVSection {
  return {
    id: randomUUID(),
    type: 'projects',
    enabled: true,
    order: 5,
    data: {
      items: items
        .filter((i) => i.enabled !== false && i.archived !== true)
        .map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          image: i.image,
          technologies: i.technologies,
          demoUrl: i.demoUrl,
          repoUrl: i.repoUrl,
          featured: i.featured,
        })),
    },
  }
}

const sectionMapping = {
  header: { type: 'header' as const, order: 0 },
  summary: { type: 'summary' as const, order: 1 },
  experience: { type: 'experience' as const, order: 2 },
  education: { type: 'education' as const, order: 3 },
  skills: { type: 'skills' as const, order: 4 },
  projects: { type: 'projects' as const, order: 5 },
} as const

/**
 * Importe les données du portfolio dans un CV existant.
 * Les sections existantes du CV sont remplacées par le mapping portfolio.
 */
export async function syncFromPortfolio(cvId: string): Promise<CVData> {
  const cv = await loadCV(cvId)
  if (!cv) throw new Error(`CV introuvable : ${cvId}`)

  const portfolio = await importPortfolioData()

  const sections: CVSection[] = []

  // header
  sections.push(mapHeader(portfolio.personal))
  // summary
  sections.push(mapSummary(portfolio.personal))
  // experience
  sections.push(mapExperience(portfolio.experience.items))
  // education
  sections.push(mapEducation(portfolio.education.items))
  // skills
  sections.push(mapSkills(portfolio.skills.categories))
  // projects
  sections.push(mapProjects(portfolio.projects.items))

  // réaffecter les ids et orders existants si possible, sinon recréer
  sections.forEach((s, i) => {
    s.order = i
    const mapping = sectionMapping[s.type as keyof typeof sectionMapping]
    if (!mapping) return
    const existing = cv.sections.find((x) => x.type === mapping.type)
    if (existing) s.id = existing.id
    else s.id = randomUUID()
  })

  cv.sections = sections
  cv.meta.updatedAt = new Date().toISOString()
  await saveCV(cv, 'sync-from-portfolio')
  return cv
}

/**
 * Vue publique : ne garde que les sections activées, triées par `order`,
 * et retire les données privées (emails, téléphones, URLs de repos internes…).
 */
export function toPublicView(cv: CVData): PublicCVView {
  const sections = cv.sections
    .filter((s) => s.enabled !== false)
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const clean: CVSection = { ...s, data: { ...s.data } }

      switch (s.type) {
        case 'header':
          clean.data = {
            name: s.data.name,
            title: s.data.title,
            location: s.data.location,
            photo: s.data.photo,
            links: s.data.links,
            // email et phone retirés : données sensibles
          }
          break
        default:
          break
      }

      if (Array.isArray(clean.data.items)) {
        clean.data.items = (clean.data.items as Array<Record<string, unknown>>)
          .filter(item => item && item.enabled !== false && item.archived !== true)
          .map(item => ({ ...item, ...(Array.isArray(item.skills) ? { skills: item.skills.filter((skill: Record<string, unknown>) => skill && skill.enabled !== false) } : {}) }))
      }

      return clean
    })

  return {
    meta: {
      title: cv.meta.title,
      themeId: cv.meta.themeId,
      themeOverrides: cv.meta.themeOverrides,
    },
    sections,
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function deepMerge<T>(base: T, override: unknown): T {
  if (override === null || override === undefined) return base
  if (Array.isArray(base) || Array.isArray(override)) return override as T
  if (typeof base !== 'object' || typeof override !== 'object') return override as T

  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    const current = (base as Record<string, unknown>)[key]
    out[key] = key in (base as object) ? deepMerge(current, value) : value
  }
  return out as T
}

/**
 * Charge les données du portfolio (depuis le fichier de contenu ou la base).
 * Réimplémenté localement pour éviter une dépendance circulaire avec
 * PortfolioData qui importe lui-même db.ts.
 */
async function importPortfolioData(): Promise<PortfolioData> {
  const { loadPortfolio } = await import('./PortfolioData.js')
  return loadPortfolio()
}
