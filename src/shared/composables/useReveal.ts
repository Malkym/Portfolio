import type { Directive } from 'vue'

/**
 * Directive `v-reveal` : révèle un élément quand il entre dans le viewport.
 *
 * Un IntersectionObserver unique et partagé, plutôt qu'un par élément.
 * Sur une page à 200 cartes, la différence est mesurable — et c'est
 * exactement le genre de détail qui décide si un portfolio « fluide »
 * l'est encore sur un téléphone d'entrée de gamme.
 */

let observer: IntersectionObserver | null = null

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null

  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-visible')
          // Une révélation est définitive : on arrête d'observer pour ne pas
          // garder des centaines de cibles vivantes inutilement.
          observer?.unobserve(entry.target)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
  }

  return observer
}

export const revealDirective: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    const reduced =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches

    // Sans observer (SSR, très vieux navigateur) ou en mouvement réduit,
    // on affiche immédiatement : le contenu prime toujours sur l'effet.
    const io = getObserver()
    if (reduced || !io) {
      el.classList.add('reveal', 'is-visible')
      return
    }

    el.classList.add('reveal')
    if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)
    io.observe(el)
  },

  unmounted(el) {
    observer?.unobserve(el)
  },
}
