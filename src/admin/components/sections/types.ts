import type { CVSection, CVThemeDefinition } from '@shared/types/cv.types'
import type { PortfolioData } from '@shared/types/portfolio.types'
import { renderCVRichText } from '@shared/utils/cvRichText'

export interface CVSectionEditorProps {
  section: CVSection
  theme: CVThemeDefinition
  readonly?: boolean
  portfolioData?: PortfolioData
}

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/* ---------------- header ---------------- */

export interface HeaderLink {
  id: string
  platform: string
  url: string
  icon: string
}

export interface HeaderData {
  name: string
  title: string
  email: string
  phone: string
  location: string
  photo: string
  links: HeaderLink[]
}

export function emptyHeader(): HeaderData {
  return { name: '', title: '', email: '', phone: '', location: '', photo: '', links: [] }
}

export function loadHeader(data: Record<string, unknown> | undefined): HeaderData {
  const h = emptyHeader()
  if (!data) return h
  h.name = String(data.name ?? '')
  h.title = String(data.title ?? '')
  h.email = String(data.email ?? '')
  h.phone = String(data.phone ?? '')
  h.location = String(data.location ?? '')
  h.photo = String(data.photo ?? '')
  h.links = Array.isArray(data.links)
    ? (data.links as HeaderLink[]).map((l) => ({ id: l.id ?? uid(), platform: l.platform, url: l.url, icon: l.icon }))
    : []
  return h
}

/* ---------------- summary ---------------- */

export interface SummaryData {
  content: string
}

export function emptySummary(): SummaryData {
  return { content: '' }
}

export function loadSummary(data: Record<string, unknown> | undefined): SummaryData {
  return { content: renderCVRichText(data?.content) }
}

/* ---------------- experience ---------------- */

export interface ExperienceItem {
  id: string
  order: number
  enabled: boolean
  company: string
  role: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  description: string
  achievements: string[]
  technologies: string[]
  logo: string
}

export interface ExperienceData {
  items: ExperienceItem[]
}

export function emptyExperienceItem(): ExperienceItem {
  return {
    id: uid(),
    order: 0,
    enabled: true,
    company: '',
    role: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
    achievements: [],
    technologies: [],
    logo: '',
  }
}

export function emptyExperience(): ExperienceData {
  return { items: [] }
}

export function loadExperience(data: Record<string, unknown> | undefined): ExperienceData {
  const items: ExperienceItem[] = []
  if (data && Array.isArray(data.items)) {
    for (const it of data.items as Record<string, unknown>[]) {
      items.push({
        id: String(it.id ?? uid()),
        order: Number(it.order ?? 0),
        enabled: it.enabled !== false,
        company: String(it.company ?? ''),
        role: String(it.role ?? ''),
        location: String(it.location ?? ''),
        startDate: String(it.startDate ?? ''),
        endDate: String(it.endDate ?? ''),
        current: Boolean(it.current),
        description: renderCVRichText(it.description),
        achievements: Array.isArray(it.achievements)
          ? (it.achievements as string[]).filter((a) => typeof a === 'string')
          : [],
        technologies: Array.isArray(it.technologies)
          ? (it.technologies as string[]).filter((t) => typeof t === 'string')
          : [],
        logo: String(it.logo ?? ''),
      })
    }
  }
  return { items }
}

/* ---------------- education ---------------- */

export interface EducationItem {
  id: string
  order: number
  enabled: boolean
  school: string
  degree: string
  field: string
  startYear: string
  endYear: string
  description: string
  logo: string
}

export interface EducationData {
  items: EducationItem[]
}

export function emptyEducationItem(): EducationItem {
  return {
    id: uid(),
    order: 0,
    enabled: true,
    school: '',
    degree: '',
    field: '',
    startYear: '',
    endYear: '',
    description: '',
    logo: '',
  }
}

export function emptyEducation(): EducationData {
  return { items: [] }
}

export function loadEducation(data: Record<string, unknown> | undefined): EducationData {
  const items: EducationItem[] = []
  if (data && Array.isArray(data.items)) {
    for (const it of data.items as Record<string, unknown>[]) {
      items.push({
        id: String(it.id ?? uid()),
        order: Number(it.order ?? 0),
        enabled: it.enabled !== false,
        school: String(it.school ?? ''),
        degree: String(it.degree ?? ''),
        field: String(it.field ?? ''),
        startYear: String(it.startYear ?? ''),
        endYear: String(it.endYear ?? ''),
        description: renderCVRichText(it.description),
        logo: String(it.logo ?? ''),
      })
    }
  }
  return { items }
}

/* ---------------- skills ---------------- */

export interface Skill {
  id: string
  name: string
  level: 'Junior' | 'Mid' | 'Senior' | 'Expert'
  score: number
  icon: string
}

export interface SkillCategory {
  id: string
  order: number
  enabled: boolean
  name: string
  icon: string
  skills: Skill[]
}

export interface SkillsData {
  items: SkillCategory[]
}

export function emptySkill(): Skill {
  return { id: uid(), name: '', level: 'Junior', score: 50, icon: 'zap' }
}

export function emptySkillCategory(): SkillCategory {
  return { id: uid(), order: 0, enabled: true, name: '', icon: 'zap', skills: [] }
}

export function emptySkills(): SkillsData {
  return { items: [] }
}

export function loadSkills(data: Record<string, unknown> | undefined): SkillsData {
  const items: SkillCategory[] = []
  if (data && Array.isArray(data.items)) {
    for (const it of data.items as Record<string, unknown>[]) {
      const skills: Skill[] = []
      if (Array.isArray(it.skills)) {
        for (const s of it.skills as Record<string, unknown>[]) {
          skills.push({
            id: String(s.id ?? uid()),
            name: String(s.name ?? ''),
            level: (s.level ?? 'Junior') as 'Junior' | 'Mid' | 'Senior' | 'Expert',
            score: Number(s.score ?? 50),
            icon: String(s.icon ?? 'zap'),
          })
        }
      }
      items.push({
        id: String(it.id ?? uid()),
        order: Number(it.order ?? 0),
        enabled: it.enabled !== false,
        name: String(it.name ?? ''),
        icon: String(it.icon ?? 'zap'),
        skills,
      })
    }
  }
  return { items }
}

/* ---------------- projects ---------------- */

export interface ProjectItem {
  id: string
  order: number
  enabled: boolean
  title: string
  description: string
  longDescription: string
  image: string
  video: string
  technologies: string[]
  demoUrl: string
  repoUrl: string
  startDate: string
  endDate: string
  kind: 'personnel' | 'client' | 'open-source'
  tags: string[]
  featured: boolean
}

export interface ProjectsData {
  items: ProjectItem[]
}

export function emptyProjectItem(): ProjectItem {
  return {
    id: uid(),
    order: 0,
    enabled: true,
    title: '',
    description: '',
    longDescription: '',
    image: '',
    video: '',
    technologies: [],
    demoUrl: '',
    repoUrl: '',
    startDate: '',
    endDate: '',
    kind: 'personnel',
    tags: [],
    featured: false,
  }
}

export function emptyProjects(): ProjectsData {
  return { items: [] }
}

export function loadProjects(data: Record<string, unknown> | undefined): ProjectsData {
  const items: ProjectItem[] = []
  if (data && Array.isArray(data.items)) {
    for (const it of data.items as Record<string, unknown>[]) {
      items.push({
        id: String(it.id ?? uid()),
        order: Number(it.order ?? 0),
        enabled: it.enabled !== false,
        title: String(it.title ?? ''),
        description: renderCVRichText(it.description),
        longDescription: String(it.longDescription ?? ''),
        image: String(it.image ?? ''),
        video: String(it.video ?? ''),
        technologies: Array.isArray(it.technologies) ? (it.technologies as string[]).filter((t) => typeof t === 'string') : [],
        demoUrl: String(it.demoUrl ?? ''),
        repoUrl: String(it.repoUrl ?? ''),
        startDate: String(it.startDate ?? ''),
        endDate: String(it.endDate ?? ''),
        kind: (it.kind ?? 'personnel') as 'personnel' | 'client' | 'open-source',
        tags: Array.isArray(it.tags) ? (it.tags as string[]).filter((t) => typeof t === 'string') : [],
        featured: Boolean(it.featured),
      })
    }
  }
  return { items }
}

/* ---------------- certifications ---------------- */

export interface CertificationItem {
  id: string
  order: number
  enabled: boolean
  name: string
  issuer: string
  date: string
  url: string
  logo: string
}

export interface CertificationsData {
  items: CertificationItem[]
}

export function emptyCertificationItem(): CertificationItem {
  return { id: uid(), order: 0, enabled: true, name: '', issuer: '', date: '', url: '', logo: '' }
}

export function emptyCertifications(): CertificationsData {
  return { items: [] }
}

export function loadCertifications(data: Record<string, unknown> | undefined): CertificationsData {
  const items: CertificationItem[] = []
  if (data && Array.isArray(data.items)) {
    for (const it of data.items as Record<string, unknown>[]) {
      items.push({
        id: String(it.id ?? uid()),
        order: Number(it.order ?? 0),
        enabled: it.enabled !== false,
        name: String(it.name ?? ''),
        issuer: String(it.issuer ?? ''),
        date: String(it.date ?? ''),
        url: String(it.url ?? ''),
        logo: String(it.logo ?? ''),
      })
    }
  }
  return { items }
}

/* ---------------- languages ---------------- */

export interface LanguageItem {
  id: string
  order: number
  enabled: boolean
  name: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native'
  certified: boolean
}

export interface LanguagesData {
  items: LanguageItem[]
}

export function emptyLanguageItem(): LanguageItem {
  return { id: uid(), order: 0, enabled: true, name: '', level: 'B1', certified: false }
}

export function emptyLanguages(): LanguagesData {
  return { items: [] }
}

export function loadLanguages(data: Record<string, unknown> | undefined): LanguagesData {
  const items: LanguageItem[] = []
  if (data && Array.isArray(data.items)) {
    for (const it of data.items as Record<string, unknown>[]) {
      items.push({
        id: String(it.id ?? uid()),
        order: Number(it.order ?? 0),
        enabled: it.enabled !== false,
        name: String(it.name ?? ''),
        level: (it.level ?? 'B1') as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native',
        certified: Boolean(it.certified),
      })
    }
  }
  return { items }
}

/* ---------------- publications ---------------- */

export interface PublicationItem {
  id: string
  order: number
  enabled: boolean
  title: string
  date: string
  excerpt: string
  url: string
  cover: string
  tags: string[]
}

export interface PublicationsData {
  items: PublicationItem[]
}

export function emptyPublicationItem(): PublicationItem {
  return { id: uid(), order: 0, enabled: true, title: '', date: '', excerpt: '', url: '', cover: '', tags: [] }
}

export function emptyPublications(): PublicationsData {
  return { items: [] }
}

export function loadPublications(data: Record<string, unknown> | undefined): PublicationsData {
  const items: PublicationItem[] = []
  if (data && Array.isArray(data.items)) {
    for (const it of data.items as Record<string, unknown>[]) {
      items.push({
        id: String(it.id ?? uid()),
        order: Number(it.order ?? 0),
        enabled: it.enabled !== false,
        title: String(it.title ?? ''),
        date: String(it.date ?? ''),
        excerpt: renderCVRichText(it.excerpt),
        url: String(it.url ?? ''),
        cover: String(it.cover ?? ''),
        tags: Array.isArray(it.tags) ? (it.tags as string[]).filter((t) => typeof t === 'string') : [],
      })
    }
  }
  return { items }
}

/* ---------------- custom ---------------- */

export interface CustomData {
  title: string
  content: string
}

export function emptyCustom(): CustomData {
  return { title: '', content: '' }
}

export function loadCustom(data: Record<string, unknown> | undefined): CustomData {
  return {
    title: data && typeof data.title === 'string' ? data.title : '',
    content: renderCVRichText(data?.content),
  }
}
