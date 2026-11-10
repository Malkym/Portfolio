import { describe, it, expect } from 'vitest'
import { themeToVars, themeForMonth } from '@shared/utils/themeManager'
import { sanitizeHtml, stripHtml } from '@shared/utils/sanitize'

// Thème de test complet pour les tests synchrones
const TEST_THEME = {
  id: 'test',
  name: 'Test',
  description: 'Test theme',
  scheme: 'dark' as const,
  colors: {
    primary: '#ff0000',
    secondary: '#00ff00',
    tertiary: '#0000ff',
    bg: '#000000',
    surface: '#111111',
    surfaceAlt: '#222222',
    text: '#ffffff',
    textMuted: '#888888',
    border: '#333333',
    accentGradient: 'linear-gradient(135deg, #ff0000, #00ff00)',
  },
  typography: {
    heading: 'system-ui',
    body: 'system-ui',
    mono: 'monospace',
    googleFonts: [],
    headingWeight: '700',
    letterSpacing: '0em',
  },
  radius: { sm: '4px', md: '8px', lg: '16px', full: '999px' },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,.1)',
    md: '0 4px 8px rgba(0,0,0,.2)',
    lg: '0 8px 16px rgba(0,0,0,.3)',
    glow: 'none',
  },
  motion: { duration: '300ms', ease: 'cubic-bezier(.4,0,.2,1)', reveal: 'fade-up' },
  effects: { backdrop: 'none' as const, glass: false, blur: 0, cardBorder: '1px solid #333' },
}

describe('themeManager', () => {
  it('traduit une définition de thème en variables CSS', () => {
    const vars = themeToVars(TEST_THEME)
    expect(vars['--c-primary']).toBe(TEST_THEME.colors.primary)
    expect(vars['--r-md']).toBe(TEST_THEME.radius.md)
  })

  it('accélère les animations quand la vitesse augmente', () => {
    // 300 ms à vitesse ×2 doit donner 150 ms, pas 600.
    const vars = themeToVars({ ...TEST_THEME, animationSpeed: 2 })
    expect(vars['--t-duration']).toBe('150ms')
  })

  it('annule toute durée quand les animations sont désactivées', () => {
    const vars = themeToVars({ ...TEST_THEME, animationsEnabled: false })
    expect(vars['--t-duration']).toBe('0ms')
  })

  it('résout le thème planifié pour un mois donné', () => {
    const schedule = { '1': 'neon-pulse', '7': 'nature-organic' }
    expect(themeForMonth(schedule, 7)).toBe('nature-organic')
    expect(themeForMonth(schedule, 5)).toBeNull()
  })
})

describe('sanitizeHtml', () => {
  it('conserve le formatage légitime', () => {
    const html = '<p>Bonjour <strong>le monde</strong></p>'
    expect(sanitizeHtml(html)).toContain('<strong>')
  })

  it('supprime les balises script', () => {
    const dirty = '<p>ok</p><script>alert(1)</script>'
    expect(sanitizeHtml(dirty)).not.toContain('script')
  })

  it('supprime les gestionnaires d\'événements inline', () => {
    const dirty = '<img src="x" onerror="alert(1)">'
    expect(sanitizeHtml(dirty)).not.toContain('onerror')
  })

  it('rejette les URL javascript:', () => {
    const dirty = '<a href="javascript:alert(1)">clic</a>'
    expect(sanitizeHtml(dirty)).not.toContain('javascript:')
  })

  it('extrait le texte brut et tronque proprement', () => {
    expect(stripHtml('<p>Bonjour <b>tout</b> le monde</p>')).toBe('Bonjour tout le monde')
    expect(stripHtml('<p>Bonjour tout le monde</p>', 10)).toBe('Bonjour t…')
  })
})
