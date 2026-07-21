import { ref, computed } from 'vue'
import { api, ApiError } from '@shared/utils/api'

interface EngagementState {
  rating: { average: number; count: number }
  likes: number | null
  me: { liked: boolean; rated: number | null }
  config: { likesEnabled: boolean; commentsEnabled: boolean; ratingsEnabled: boolean }
}

/**
 * Engagement visiteur : vue, like, note, commentaire.
 *
 * Le state local est délibérément le miroir de ce que le serveur accepte —
 * notamment `me.rated`, qui verrouille l'interface dès qu'une note existe.
 * Le verrou réel reste côté serveur (contrainte UNIQUE) ; celui-ci n'est là
 * que pour éviter au visiteur un aller-retour et un message d'erreur.
 */
export function useEngagement() {
  const state = ref<EngagementState>({
    rating: { average: 0, count: 0 },
    likes: null,
    me: { liked: false, rated: null },
    config: { likesEnabled: true, commentsEnabled: true, ratingsEnabled: true },
  })

  const loading = ref(false)
  const message = ref<{ type: 'ok' | 'error'; text: string } | null>(null)

  const hasRated = computed(() => state.value.me.rated !== null)
  const stars = computed(() => state.value.rating.average)

  function notify(type: 'ok' | 'error', text: string) {
    message.value = { type, text }
    setTimeout(() => (message.value = null), 4000)
  }

  async function refresh(): Promise<void> {
    try {
      state.value = await api.get<EngagementState>('/engagement')
    } catch {
      // L'engagement est un bonus : s'il échoue, le portfolio reste utilisable.
    }
  }

  /** Comptabilise la visite. Le serveur déduplique par visiteur et par jour. */
  async function trackView(path = '/'): Promise<void> {
    try {
      await api.post('/view', { path })
    } catch {
      /* silencieux par conception */
    }
  }

  async function toggleLike(target = 'portfolio'): Promise<void> {
    if (loading.value) return
    loading.value = true

    const previous = state.value.me.liked
    // Bascule optimiste : le cœur réagit immédiatement au clic.
    state.value.me.liked = !previous
    if (state.value.likes !== null) state.value.likes += previous ? -1 : 1

    try {
      const res = await api.post<{ liked: boolean }>('/like', { target })
      state.value.me.liked = res.liked
    } catch (e) {
      state.value.me.liked = previous
      if (state.value.likes !== null) state.value.likes += previous ? 1 : -1
      notify('error', (e as Error).message)
    } finally {
      loading.value = false
    }
  }

  async function rate(score: number): Promise<void> {
    if (hasRated.value || loading.value) return
    loading.value = true

    try {
      const res = await api.post<EngagementState>('/rate', { score })
      state.value.rating = res.rating
      state.value.me.rated = score
      notify('ok', 'Merci pour votre note !')
    } catch (e) {
      // 409 = déjà noté. On resynchronise pour refléter la vérité du serveur.
      if (e instanceof ApiError && e.status === 409) {
        const payload = e.payload as EngagementState
        if (payload?.rating) state.value.rating = payload.rating
        if (payload?.me) state.value.me.rated = payload.me.rated
      }
      notify('error', (e as Error).message)
    } finally {
      loading.value = false
    }
  }

  async function postComment(payload: {
    author: string
    email?: string
    body: string
  }): Promise<boolean> {
    loading.value = true
    try {
      const res = await api.post<{ message: string }>('/comments', payload)
      notify('ok', res.message)
      return true
    } catch (e) {
      notify('error', (e as Error).message)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    state,
    loading,
    message,
    hasRated,
    stars,
    refresh,
    trackView,
    toggleLike,
    rate,
    postComment,
  }
}
