import { describe, it, expect } from 'vitest'
import { themeToVars, themeForMonth, FALLBACK_THEME } from '@shared/utils/themeManager'
import { sanitizeHtml, stripHtml } from '@shared/utils/sanitize'

/**
 * Tests des fonctions pures critiques.
 *
 * On cible ce qui casserait silencieusement : la sécurité du HTML riche,
 * la résolution du thème, et la mise à l'échelle des animations.
 */

describe('themeManager', () => {
  it('traduit une définition de thème en variables CSS', () => {
    const vars = themeToVars(FALLBACK_THEME)
    expect(vars['--c-primary']).toBe(FALLBACK_THEME.colors.primary)
    expect(vars['--r-md']).toBe(FALLBACK_THEME.radius.md)
  })

  it('accélère les animations quand la vitesse augmente', () => {
    // 300 ms à vitesse ×2 doit donner 150 ms, pas 600.
    const vars = themeToVars({ ...FALLBACK_THEME, animationSpeed: 2 })
    expect(vars['--t-duration']).toBe('150ms')
  })

  it('annule toute durée quand les animations sont désactivées', () => {
    const vars = themeToVars({ ...FALLBACK_THEME, animationsEnabled: false })
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
