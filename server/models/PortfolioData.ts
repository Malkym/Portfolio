import type { PortfolioData, CustomSection } from '../../src/shared/types/portfolio.types.js'
import { getConfig, setConfig, createSnapshot } from '../database/db.js'

const CONFIG_KEY = 'portfolio'

/**
 * Structure par défaut. Elle sert à trois choses :
 *  1. initialiser une base vierge,
 *  2. combler les trous d'une config partielle (migration douce),
 *  3. documenter la forme attendue par le front.
 */
export function defaultPortfolio(): PortfolioData {
  const section = (title: string, subtitle = '') => ({ enabled: true, title, subtitle })

  return {
    personal: {
      name: 'Votre Nom',
      title: 'Développeur Full-Stack',
      bio: "Je conçois et construis des produits web durables, accessibles et rapides.",
      photo: '',
      email: 'contact@exemple.com',
      phone: '',
      location: 'France',
      resumeUrl: '',
    },
    hero: {
      subtitle: 'Je transforme des idées complexes en interfaces limpides.',
      typedWords: ['Développeur Full-Stack', 'Architecte Front-end', 'Passionné de Vue.js'],
      ctaText: 'Voir mes projets',
      ctaLink: '#projects',
      ctaSecondaryText: 'Me contacter',
      ctaSecondaryLink: '#contact',
      background: 'gradient',
      backgroundMedia: '',
    },
    about: { ...section('À propos'), content: '', image: '', values: [] },
    stats: { ...section('En chiffres'), items: [] },
    skills: { ...section('Compétences'), categories: [] },
    projects: { ...section('Projets'), items: [] },
    experience: { ...section('Expérience'), items: [] },
    education: { ...section('Formation'), items: [] },
    testimonials: { ...section('Témoignages'), items: [] },
    articles: { ...section('Articles'), items: [] },
    timeline: { ...section('Parcours'), items: [] },
    gallery: { ...section('Galerie'), items: [] },
    contact: {
      ...section('Contact'),
      email: 'contact@exemple.com',
      phone: '',
      address: '',
      mapEmbed: '',
      socialLinks: [],
      formEnabled: true,
    },
    customSections: [],
    design: {
      active: 'dark-matter',
      schedule: {},
      autoRotate: true,
      customColors: {},
      customTypography: {},
      customCss: '',
      animationSpeed: 1,
      animationsEnabled: true,
    },
    seo: {
      title: 'Portfolio',
      description: 'Portfolio de développeur.',
      keywords: 'développeur, portfolio, vue, typescript',
      ogImage: '',
      author: '',
      siteUrl: '',
    },
    analytics: { googleAnalyticsId: '', enableTracking: false },
    engagement: {
      likesEnabled: true,
      commentsEnabled: true,
      ratingsEnabled: true,
      commentsModerated: true,
      likeCountPublic: false,
    },
    branding: { logo: '', favicon: '', footerText: '' },
  }
}

/**
 * Fusion récursive défaut ← stocké.
 *
 * Point important pour la pérennité : les clés inconnues du stocké sont
 * CONSERVÉES au lieu d'être jetées. Si une version future du portfolio a
 * ajouté un champ que ce code ne connaît pas, on ne le détruit pas en
 * réenregistrant. C'est ce qui rend les imports de sauvegarde non destructifs.
 */
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

export function loadPortfolio(): PortfolioData {
  const stored = getConfig<Partial<PortfolioData> | null>(CONFIG_KEY, null)
  if (!stored) {
    const fresh = defaultPortfolio()
    setConfig(CONFIG_KEY, fresh)
    return fresh
  }
  return deepMerge(defaultPortfolio(), stored)
}

export function savePortfolio(data: Partial<PortfolioData>, snapshotLabel?: string): PortfolioData {
  const current = loadPortfolio()
  if (snapshotLabel) createSnapshot(snapshotLabel, current)

  const merged = deepMerge(current, data)
  setConfig(CONFIG_KEY, merged)
  return merged
}

/** Remplace intégralement la config (import de sauvegarde). */
export function replacePortfolio(data: unknown, label = 'avant-import'): PortfolioData {
  createSnapshot(label, loadPortfolio())
  const merged = deepMerge(defaultPortfolio(), data)
  setConfig(CONFIG_KEY, merged)
  return merged
}

/* ------------------------------------------------------------------ */
/* Sections dynamiques                                                  */
/* ------------------------------------------------------------------ */

export function upsertCustomSection(section: CustomSection): PortfolioData {
  const data = loadPortfolio()
  const index = data.customSections.findIndex((s) => s.id === section.id)
  if (index >= 0) data.customSections[index] = section
  else data.customSections.push(section)
  setConfig(CONFIG_KEY, data)
  return data
}

export function deleteCustomSection(id: string): PortfolioData {
  const data = loadPortfolio()
  createSnapshot(`suppression-section-${id}`, data)
  data.customSections = data.customSections.filter((s) => s.id !== id)
  setConfig(CONFIG_KEY, data)
  return data
}

/**
 * Vue publique : on retire tout ce qui ne regarde pas le visiteur.
 * Les sections désactivées et les éléments archivés ne sont jamais envoyés
 * au client — pas seulement masqués en CSS.
 */
export function toPublicView(data: PortfolioData): Record<string, unknown> {
  const clean = <T extends { enabled?: boolean; archived?: boolean }>(items: T[] = []) =>
    items.filter((i) => i.enabled !== false && i.archived !== true)

  const publicData: Record<string, unknown> = {
    personal: data.personal,
    hero: data.hero,
    about: data.about,
    stats: { ...data.stats, items: clean(data.stats.items) },
    skills: { ...data.skills, categories: clean(data.skills.categories) },
    projects: { ...data.projects, items: clean(data.projects.items) },
    experience: { ...data.experience, items: clean(data.experience.items) },
    education: { ...data.education, items: clean(data.education.items) },
    testimonials: { ...data.testimonials, items: clean(data.testimonials.items) },
    articles: { ...data.articles, items: clean(data.articles.items) },
    timeline: { ...data.timeline, items: clean(data.timeline.items) },
    gallery: { ...data.gallery, items: clean(data.gallery.items) },
    contact: { ...data.contact, socialLinks: clean(data.contact.socialLinks) },
    customSections: data.customSections
      .filter((s) => s.enabled)
      .map((s) => ({ ...s, items: clean(s.items) }))
      .sort((a, b) => a.order - b.order),
    design: data.design,
    seo: data.seo,
    engagement: data.engagement,
    branding: data.branding,
    // `analytics.googleAnalyticsId` est public par nature (il finit dans le
    // HTML), mais on n'expose que le strict nécessaire.
    analytics: data.analytics.enableTracking
      ? { googleAnalyticsId: data.analytics.googleAnalyticsId, enableTracking: true }
      : { googleAnalyticsId: '', enableTracking: false },
  }

  return publicData
}
