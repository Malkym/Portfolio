import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@shared/utils/api'
import { applyTheme, FALLBACK_THEME, type ActiveTheme } from '@shared/utils/themeManager'
import type { PortfolioData } from '@shared/types/portfolio.types'

/**
 * État du portfolio public.
 * Charge les données et le thème, puis les applique. Ne contient aucune
 * logique d'administration : le bundle public reste léger.
 */
export const usePortfolioStore = defineStore('portfolio', () => {
  const data = ref<PortfolioData | null>(null)
  const theme = ref<ActiveTheme>(FALLBACK_THEME)
  const loading = ref(true)
  const error = ref<string | null>(null)

  /** Sections natives à afficher, dans l'ordre, filtrées sur `enabled`. */
  const activeSections = computed(() => {
    if (!data.value) return []

    const native = [
      'about', 'stats', 'skills', 'projects', 'experience',
      'education', 'testimonials', 'articles', 'timeline', 'gallery',
    ] as const

    const list = native
      .filter((key) => {
        const section = data.value![key]
        if (!section?.enabled) return false

        // Une section activée mais vide ne doit pas laisser un trou dans la page.
        if (key === 'about') return !!data.value!.about.content

        const container = section as { items?: unknown[]; categories?: unknown[] }
        const content = container.items ?? container.categories
        return Array.isArray(content) && content.length > 0
      })
      .map((key) => ({ kind: 'native' as const, key, id: key }))

    const custom = (data.value.customSections ?? [])
      .filter((s) => s.enabled && s.items.length > 0)
      .map((s) => ({ kind: 'custom' as const, key: s.slug, id: s.id, section: s }))

    return [...list, ...custom]
  })

  async function load(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Les deux requêtes sont indépendantes : on les parallélise pour que
      // le premier rendu ne coûte qu'un aller-retour réseau.
      const [portfolio, activeTheme] = await Promise.all([
        api.get<PortfolioData>('/data'),
        api.get<ActiveTheme>('/designs/active'),
      ])

      data.value = portfolio
      theme.value = activeTheme
      applyTheme(activeTheme)
    } catch (e) {
      error.value = (e as Error).message
      // On applique quand même le thème de secours : mieux vaut un site
      // sobre mais lisible qu'une page blanche.
      applyTheme(FALLBACK_THEME)
    } finally {
      loading.value = false
    }
  }

  /** Prévisualisation à chaud (utilisée par l'admin dans une iframe). */
  function previewTheme(next: ActiveTheme): void {
    theme.value = next
    applyTheme(next)
  }

  return { data, theme, loading, error, activeSections, load, previewTheme }
})
