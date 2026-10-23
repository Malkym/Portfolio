import type { ThemeDefinition } from './portfolio.types'

export type CVSectionType =
  | 'header'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'publications'
  | 'custom'

export interface CVSection {
  id: string
  type: CVSectionType
  enabled: boolean
  order: number
  data: Record<string, unknown>
  content?: unknown
}

export interface CVMeta {
  id: string
  slug: string
  title: string
  isPublic: boolean
  themeId: string
  themeOverrides?: Partial<ThemeDefinition>
  createdAt: string
  updatedAt: string
}

export interface CVData {
  meta: CVMeta
  sections: CVSection[]
}

export interface CVThemeDefinition extends ThemeDefinition {
  cv?: {
    pageMargin?: string
    fontSizeBase?: string
    lineHeight?: string
    sectionGap?: string
    headerStyle?: 'minimal' | 'banner' | 'sidebar' | 'split' | 'classic'
  }
}

export interface CVTemplate {
  id: string
  name: string
  description: string
  sections: Omit<CVSection, 'id' | 'order'>[]
}

export interface PublicCVView {
  meta: Pick<CVMeta, 'title' | 'themeId' | 'themeOverrides'>
  sections: CVSection[]
}
