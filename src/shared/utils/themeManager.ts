import type { ThemeDefinition } from '../types/portfolio.types'

/**
 * Moteur de thème.
 *
 * Principe : un thème ne change JAMAIS de classes CSS ni de composants.
 * Il réécrit uniquement des variables CSS sur `:root`. Conséquence directe :
 * changer de thème est instantané, ne provoque aucun re-render Vue, et
 * fonctionne même sur des composants écrits bien après le thème.
 */

export type ActiveTheme = ThemeDefinition & {
  customCss?: string
  animationSpeed?: number
  animationsEnabled?: boolean
}

const FONT_LINK_ID = 'pf-theme-fonts'
const CUSTOM_CSS_ID = 'pf-custom-css'

/** Fabrique la table des variables CSS à partir d'une définition de thème. */
export function themeToVars(theme: ActiveTheme): Record<string, string> {
  const speed = theme.animationsEnabled === false ? 0 : (theme.animationSpeed ?? 1)
  const scale = (ms: string) => {
    if (speed === 0) return '0ms'
    const n = parseFloat(ms) || 300
    return `${Math.round(n / speed)}ms`
  }

  return {
    '--c-primary': theme.colors.primary,
    '--c-secondary': theme.colors.secondary,
    '--c-tertiary': theme.colors.tertiary,
    '--c-bg': theme.colors.bg,
    '--c-surface': theme.colors.surface,
    '--c-surface-alt': theme.colors.surfaceAlt,
    '--c-text': theme.colors.text,
    '--c-text-muted': theme.colors.textMuted,
    '--c-border': theme.colors.border,
    '--c-gradient': theme.colors.accentGradient,

    '--f-heading': theme.typography.heading,
    '--f-body': theme.typography.body,
    '--f-mono': theme.typography.mono,
    '--f-heading-weight': theme.typography.headingWeight,
    '--f-tracking': theme.typography.letterSpacing,

    '--r-sm': theme.radius.sm,
    '--r-md': theme.radius.md,
    '--r-lg': theme.radius.lg,
    '--r-full': theme.radius.full,

    '--sh-sm': theme.shadows.sm,
    '--sh-md': theme.shadows.md,
    '--sh-lg': theme.shadows.lg,
    '--sh-glow': theme.shadows.glow,

    '--t-duration': scale(theme.motion.duration),
    '--t-ease': theme.motion.ease,

    '--e-blur': `${theme.effects.blur}px`,
    '--e-card-border': theme.effects.cardBorder,
    '--e-surface': theme.effects.glass ? theme.colors.surface : theme.colors.surface,
  }
}

/** Applique le thème au document. Idempotent : on peut l'appeler en boucle. */
export function applyTheme(theme: ActiveTheme, target: HTMLElement = document.documentElement): void {
  const vars = themeToVars(theme)
  for (const [key, value] of Object.entries(vars)) {
    target.style.setProperty(key, value)
  }

  target.dataset.theme = theme.id
  target.dataset.scheme = theme.scheme
  target.dataset.backdrop = theme.effects.backdrop
  target.dataset.glass = String(theme.effects.glass)

  loadFonts(theme.typography.googleFonts)
  applyCustomCss(theme.customCss ?? '')

  // Le navigateur teinte la barre d'adresse mobile avec cette valeur.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme.colors.bg)
}

/**
 * Charge les Google Fonts du thème.
 *
 * Un seul <link> réutilisé et remplacé : sans ça, chaque changement de thème
 * en prévisualisation empilerait des feuilles de style jusqu'à saturer la page.
 */
function loadFonts(families: string[]): void {
  if (!families?.length) return

  const href = `https://fonts.googleapis.com/css2?${families
    .map((f) => `family=${f}`)
    .join('&')}&display=swap`

  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
  if (link?.href === href) return

  if (!link) {
    link = document.createElement('link')
    link.id = FONT_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href = href
}

function applyCustomCss(css: string): void {
  let style = document.getElementById(CUSTOM_CSS_ID) as HTMLStyleElement | null

  if (!css.trim()) {
    style?.remove()
    return
  }

  if (!style) {
    style = document.createElement('style')
    style.id = CUSTOM_CSS_ID
    document.head.appendChild(style)
  }
  style.textContent = css
}

/**
 * Thème de secours, codé en dur.
 *
 * Il ne dépend d'aucun fichier, d'aucun réseau, d'aucune base. Si tout le
 * reste échoue dans 20 ans, le portfolio reste lisible. C'est l'assurance
 * de dernier recours du système.
 */
export const FALLBACK_THEME: ThemeDefinition = {
  id: 'fallback',
  name: 'Secours',
  description: 'Thème minimal garanti sans dépendance.',
  scheme: 'dark',
  colors: {
    primary: '#d4af37',
    secondary: '#8c7853',
    tertiary: '#f5e6a8',
    bg: '#08080a',
    surface: '#111114',
    surfaceAlt: '#1a1a1f',
    text: '#f0efe9',
    textMuted: '#8f8d86',
    border: '#26262c',
    accentGradient: 'linear-gradient(135deg, #d4af37, #f5e6a8)',
  },
  typography: {
    heading: 'system-ui, sans-serif',
    body: 'system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
    googleFonts: [],
    headingWeight: '700',
    letterSpacing: '0em',
  },
  radius: { sm: '6px', md: '12px', lg: '20px', full: '999px' },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,.4)',
    md: '0 8px 24px rgba(0,0,0,.5)',
    lg: '0 24px 60px rgba(0,0,0,.6)',
    glow: 'none',
  },
  motion: { duration: '300ms', ease: 'cubic-bezier(.4,0,.2,1)', reveal: 'fade-up' },
  effects: { backdrop: 'none', glass: false, blur: 0, cardBorder: '1px solid #26262c' },
}

/** Quel thème pour ce mois-ci, selon le calendrier configuré ? */
export function themeForMonth(
  schedule: Record<string, string>,
  month = new Date().getMonth() + 1,
): string | null {
  return schedule[String(month)] ?? null
}

export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
