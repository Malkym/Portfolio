/**
 * Types partagés entre le client et le serveur.
 * C'est le contrat unique du système : toute donnée qui transite par l'API
 * est décrite ici, y compris les sections créées dynamiquement en admin.
 */

/* ------------------------------------------------------------------ */
/* Champs dynamiques                                                    */
/* ------------------------------------------------------------------ */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'rich-text'
  | 'number'
  | 'date'
  | 'image'
  | 'url'
  | 'boolean'
  | 'select'
  | 'tags'
  | 'color'
  | 'rating'

export interface CustomField {
  name: string
  label: string
  type: FieldType
  required: boolean
  /** Uniquement pour `select`. */
  options?: string[]
  placeholder?: string
  help?: string
  /** Affiché dans la carte publique en tant que titre / sous-titre / média. */
  role?: 'title' | 'subtitle' | 'body' | 'media' | 'link' | 'meta'
}

/**
 * Une section dynamique. C'est le mécanisme qui rend le portfolio
 * extensible sans toucher au code : l'admin définit des champs,
 * le formulaire CRUD et l'affichage public en sont dérivés.
 */
export interface CustomSection {
  id: string
  name: string
  slug: string
  icon: string
  enabled: boolean
  order: number
  /** Gabarit d'affichage public. */
  layout: 'cards' | 'list' | 'timeline' | 'grid' | 'table'
  fields: CustomField[]
  items: DynamicItem[]
}

export interface DynamicItem {
  id: string
  order: number
  enabled: boolean
  archived: boolean
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Sections natives                                                     */
/* ------------------------------------------------------------------ */

export interface BaseItem {
  id: string
  order: number
  enabled: boolean
  archived: boolean
}

export interface Stat extends BaseItem {
  label: string
  value: number
  suffix: string
  icon: string
}

export interface Skill {
  id: string
  name: string
  level: 'Junior' | 'Mid' | 'Senior' | 'Expert'
  /** 0-100, utilisé par les barres de progression. */
  score: number
  icon: string
  order: number
}

export interface SkillCategory extends BaseItem {
  name: string
  icon: string
  skills: Skill[]
}

export interface Project extends BaseItem {
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

export interface Experience extends BaseItem {
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

export interface Education extends BaseItem {
  school: string
  degree: string
  field: string
  startYear: string
  endYear: string
  description: string
  logo: string
}

export interface Testimonial extends BaseItem {
  name: string
  role: string
  company: string
  photo: string
  quote: string
  rating: number
}

export interface Article extends BaseItem {
  title: string
  date: string
  excerpt: string
  url: string
  cover: string
  tags: string[]
}

export interface TimelineEvent extends BaseItem {
  date: string
  title: string
  description: string
  icon: string
}

export interface GalleryItem extends BaseItem {
  title: string
  media: string
  type: 'image' | 'video'
  caption: string
}

export interface SocialLink extends BaseItem {
  platform: string
  url: string
  icon: string
}

/* ------------------------------------------------------------------ */
/* Configuration globale                                                */
/* ------------------------------------------------------------------ */

export interface SectionFlag {
  enabled: boolean
  title: string
  subtitle: string
}

export interface PortfolioData {
  personal: {
    name: string
    title: string
    bio: string
    photo: string
    email: string
    phone: string
    location: string
    resumeUrl: string
  }
  hero: {
    subtitle: string
    typedWords: string[]
    ctaText: string
    ctaLink: string
    ctaSecondaryText: string
    ctaSecondaryLink: string
    background: 'particles' | 'video' | 'gradient' | 'image' | 'grid' | 'none'
    backgroundMedia: string
  }
  about: SectionFlag & { content: string; image: string; values: string[] }
  stats: SectionFlag & { items: Stat[] }
  skills: SectionFlag & { categories: SkillCategory[] }
  projects: SectionFlag & { items: Project[] }
  experience: SectionFlag & { items: Experience[] }
  education: SectionFlag & { items: Education[] }
  testimonials: SectionFlag & { items: Testimonial[] }
  articles: SectionFlag & { items: Article[] }
  timeline: SectionFlag & { items: TimelineEvent[] }
  gallery: SectionFlag & { items: GalleryItem[] }
  contact: SectionFlag & {
    email: string
    phone: string
    address: string
    mapEmbed: string
    socialLinks: SocialLink[]
    formEnabled: boolean
  }
  customSections: CustomSection[]
  design: {
    active: string
    /** Rotation mensuelle : "1".."12" → id de thème. */
    schedule: Record<string, string>
    autoRotate: boolean
    customColors: Record<string, string>
    customTypography: Record<string, string>
    customCss: string
    animationSpeed: number
    animationsEnabled: boolean
  }
  seo: {
    title: string
    description: string
    keywords: string
    ogImage: string
    author: string
    siteUrl: string
  }
  analytics: {
    googleAnalyticsId: string
    enableTracking: boolean
  }
  engagement: {
    likesEnabled: boolean
    commentsEnabled: boolean
    ratingsEnabled: boolean
    /** Les commentaires attendent une validation admin avant publication. */
    commentsModerated: boolean
    /**
     * Faux par défaut : seule la note en étoiles est publique.
     * Vues et commentaires ne sont JAMAIS exposés, quelle que soit la valeur.
     */
    likeCountPublic: boolean
  }
  branding: {
    logo: string
    favicon: string
    footerText: string
  }
}

/* ------------------------------------------------------------------ */
/* Thèmes                                                               */
/* ------------------------------------------------------------------ */

export interface ThemeDefinition {
  id: string
  name: string
  description: string
  scheme: 'light' | 'dark'
  colors: {
    primary: string
    secondary: string
    tertiary: string
    bg: string
    surface: string
    surfaceAlt: string
    text: string
    textMuted: string
    border: string
    accentGradient: string
  }
  typography: {
    heading: string
    body: string
    mono: string
    googleFonts: string[]
    headingWeight: string
    letterSpacing: string
  }
  radius: { sm: string; md: string; lg: string; full: string }
  shadows: { sm: string; md: string; lg: string; glow: string }
  motion: { duration: string; ease: string; reveal: string }
  effects: {
    /** Motif de fond appliqué au <body>. */
    backdrop: 'none' | 'grid' | 'dots' | 'noise' | 'aurora' | 'scanlines' | 'stars' | 'waves'
    glass: boolean
    /** Intensité du blur des surfaces vitrées, en px. */
    blur: number
    cardBorder: string
  }
}

/* ------------------------------------------------------------------ */
/* Engagement : vues, likes, notes, commentaires                        */
/* ------------------------------------------------------------------ */

export interface Comment {
  id: string
  author: string
  email: string
  body: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  /** Jamais exposé publiquement — visible uniquement dans l'admin. */
  ip?: string
  userAgent?: string
}

/** Ce que voit un visiteur : uniquement la moyenne des étoiles. */
export interface PublicEngagement {
  rating: { average: number; count: number }
  likes: number
  /** Ce que *ce* visiteur a déjà fait, pour verrouiller le double vote. */
  me: { liked: boolean; rated: number | null }
}

/** Ce que voit l'admin : tout, y compris vues et commentaires. */
export interface AdminEngagement extends PublicEngagement {
  views: { total: number; unique: number; today: number; last30: { date: string; count: number }[] }
  comments: { total: number; pending: number; approved: number; rejected: number }
}
