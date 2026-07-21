import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, setAuthToken, getAuthToken } from '@shared/utils/api'
import type { PortfolioData, CustomSection } from '@shared/types/portfolio.types'

export interface AdminStats {
  rating: { average: number; count: number }
  ratingBreakdown: { score: number; n: number }[]
  likes: number
  likesByTarget: { target: string; n: number }[]
  views: { total: number; unique: number; today: number; last30: { date: string; count: number }[] }
  comments: { total: number; pending: number; approved: number; rejected: number }
}

export interface CommentRow {
  id: string
  author: string
  email: string | null
  body: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  ip: string | null
  user_agent: string | null
}

export interface MessageRow {
  id: string
  name: string
  email: string
  subject: string
  body: string
  read: number
  created_at: string
}

export const useAdminStore = defineStore('admin', () => {
  const authenticated = ref(!!getAuthToken())
  const data = ref<PortfolioData | null>(null)
  const stats = ref<AdminStats | null>(null)
  const comments = ref<CommentRow[]>([])
  const messages = ref<MessageRow[]>([])
  const activity = ref<{ action: string; detail: string; created_at: string }[]>([])
  const designs = ref<{ id: string; name: string; description: string; scheme: string; swatch: string[] }[]>([])

  const saving = ref(false)
  const loading = ref(false)
  const toast = ref<{ type: 'ok' | 'error'; text: string } | null>(null)

  /** Brouillon local : ce qui n'est pas encore enregistré. */
  const dirty = ref(false)

  const pendingComments = computed(() => comments.value.filter((c) => c.status === 'pending'))
  const unreadMessages = computed(() => messages.value.filter((m) => !m.read))

  function notify(type: 'ok' | 'error', text: string) {
    toast.value = { type, text }
    setTimeout(() => (toast.value = null), 3600)
  }

  /* ---------------- Authentification ---------------- */

  async function login(password: string, answer?: string): Promise<boolean> {
    try {
      const res = await api.post<{ token: string }>('/auth/login', { password, answer })
      setAuthToken(res.token)
      authenticated.value = true
      return true
    } catch (e) {
      notify('error', (e as Error).message)
      return false
    }
  }

  /**
   * Change le mot de passe. Le serveur invalide toutes les sessions et renvoie
   * un jeton neuf : on le stocke aussitôt, sinon on serait déconnecté par
   * l'opération qu'on vient soi-même de déclencher.
   */
  async function changePassword(current: string, next: string): Promise<boolean> {
    try {
      const res = await api.post<{ token: string; message: string }>('/auth/password', {
        currentPassword: current,
        newPassword: next,
      })
      setAuthToken(res.token)
      notify('ok', res.message)
      return true
    } catch (e) {
      notify('error', (e as Error).message)
      return false
    }
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } finally {
      setAuthToken(null)
      authenticated.value = false
      data.value = null
    }
  }

  /** Vérifie que la session est toujours valide côté serveur. */
  async function checkSession(): Promise<boolean> {
    try {
      await api.get('/auth/me')
      authenticated.value = true
      return true
    } catch {
      setAuthToken(null)
      authenticated.value = false
      return false
    }
  }

  /* ---------------- Chargement ---------------- */

  async function loadAll(): Promise<void> {
    loading.value = true
    try {
      // Requêtes indépendantes lancées ensemble : le tableau de bord
      // s'affiche en un seul aller-retour au lieu de six en cascade.
      const [portfolio, engagement, commentList, messageList, log, themes] = await Promise.all([
        api.get<PortfolioData>('/admin/data'),
        api.get<AdminStats>('/admin/engagement'),
        api.get<CommentRow[]>('/admin/comments'),
        api.get<MessageRow[]>('/admin/messages'),
        api.get<typeof activity.value>('/admin/activity'),
        api.get<typeof designs.value>('/designs'),
      ])

      data.value = portfolio
      stats.value = engagement
      comments.value = commentList
      messages.value = messageList
      activity.value = log
      designs.value = themes
      dirty.value = false
    } catch (e) {
      notify('error', (e as Error).message)
    } finally {
      loading.value = false
    }
  }

  /* ---------------- Enregistrement ---------------- */

  async function save(patch?: Partial<PortfolioData>): Promise<void> {
    if (!data.value) return

    saving.value = true
    try {
      const updated = await api.patch<PortfolioData>('/admin/data', patch ?? data.value)
      data.value = updated
      dirty.value = false
      notify('ok', 'Modifications enregistrées')
    } catch (e) {
      notify('error', (e as Error).message)
    } finally {
      saving.value = false
    }
  }

  /* ---------------- CRUD collections ---------------- */

  async function createItem(collection: string, payload: Record<string, unknown>) {
    const item = await api.post(`/admin/collection/${collection}`, payload)
    await loadAll()
    notify('ok', 'Élément ajouté')
    return item
  }

  async function updateItem(collection: string, id: string, payload: Record<string, unknown>) {
    const item = await api.put(`/admin/collection/${collection}/${id}`, payload)
    await loadAll()
    notify('ok', 'Élément mis à jour')
    return item
  }

  async function removeItem(collection: string, id: string, hard = false) {
    await api.delete(`/admin/collection/${collection}/${id}${hard ? '?hard=true' : ''}`)
    await loadAll()
    notify('ok', hard ? 'Élément supprimé' : 'Élément archivé')
  }

  async function reorder(collection: string, ids: string[]) {
    await api.post(`/admin/collection/${collection}/reorder`, { ids })
    notify('ok', 'Ordre mis à jour')
  }

  /* ---------------- Sections dynamiques ---------------- */

  async function createSection(section: Omit<CustomSection, 'id' | 'order' | 'items'>) {
    const created = await api.post<CustomSection>('/admin/sections', section)
    await loadAll()
    notify('ok', `Section « ${section.name} » créée`)
    return created
  }

  async function updateSection(id: string, patch: Partial<CustomSection>) {
    await api.put(`/admin/sections/${id}`, patch)
    await loadAll()
  }

  async function deleteSection(id: string) {
    await api.delete(`/admin/sections/${id}`)
    await loadAll()
    notify('ok', 'Section supprimée')
  }

  async function createSectionItem(sectionId: string, payload: Record<string, unknown>) {
    await api.post(`/admin/sections/${sectionId}/items`, payload)
    await loadAll()
    notify('ok', 'Élément ajouté')
  }

  async function updateSectionItem(sectionId: string, itemId: string, payload: Record<string, unknown>) {
    await api.put(`/admin/sections/${sectionId}/items/${itemId}`, { data: payload })
    await loadAll()
  }

  async function deleteSectionItem(sectionId: string, itemId: string) {
    await api.delete(`/admin/sections/${sectionId}/items/${itemId}`)
    await loadAll()
  }

  /* ---------------- Modération ---------------- */

  async function moderateComment(id: string, status: CommentRow['status']) {
    await api.patch(`/admin/comments/${id}`, { status })
    const comment = comments.value.find((c) => c.id === id)
    if (comment) comment.status = status
    notify('ok', 'Commentaire mis à jour')
  }

  async function deleteComment(id: string) {
    await api.delete(`/admin/comments/${id}`)
    comments.value = comments.value.filter((c) => c.id !== id)
    notify('ok', 'Commentaire supprimé')
  }

  async function markMessageRead(id: string, read = true) {
    await api.patch(`/admin/messages/${id}`, { read })
    const message = messages.value.find((m) => m.id === id)
    if (message) message.read = read ? 1 : 0
  }

  async function deleteMessage(id: string) {
    await api.delete(`/admin/messages/${id}`)
    messages.value = messages.value.filter((m) => m.id !== id)
    notify('ok', 'Message supprimé')
  }

  /* ---------------- Thèmes ---------------- */

  async function activateDesign(id: string) {
    await api.post('/admin/designs/activate', { id })
    if (data.value) {
      data.value.design.active = id
      data.value.design.autoRotate = false
    }
    notify('ok', 'Thème activé')
  }

  async function saveSchedule(schedule: Record<string, string>, autoRotate: boolean) {
    await api.put('/admin/designs/schedule', { schedule, autoRotate })
    if (data.value) {
      data.value.design.schedule = schedule
      data.value.design.autoRotate = autoRotate
    }
    notify('ok', 'Calendrier enregistré')
  }

  async function customizeDesign(patch: Record<string, unknown>) {
    const design = await api.patch<PortfolioData['design']>('/admin/designs/customize', patch)
    if (data.value) data.value.design = design
    notify('ok', 'Personnalisation appliquée')
  }

  /* ---------------- Sauvegarde ---------------- */

  async function exportData(): Promise<void> {
    const payload = await api.get<unknown>('/admin/export')
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `portfolio-${new Date().toISOString().slice(0, 10)}.json`
    link.click()

    // Sans revoke, le blob reste en mémoire jusqu'au rechargement de la page.
    URL.revokeObjectURL(url)
    notify('ok', 'Sauvegarde téléchargée')
  }

  async function importData(payload: unknown): Promise<void> {
    await api.post('/admin/import', payload)
    await loadAll()
    notify('ok', 'Sauvegarde restaurée')
  }

  return {
    authenticated, data, stats, comments, messages, activity, designs,
    saving, loading, toast, dirty,
    pendingComments, unreadMessages,
    notify, login, logout, changePassword, checkSession, loadAll, save,
    createItem, updateItem, removeItem, reorder,
    createSection, updateSection, deleteSection,
    createSectionItem, updateSectionItem, deleteSectionItem,
    moderateComment, deleteComment, markMessageRead, deleteMessage,
    activateDesign, saveSchedule, customizeDesign,
    exportData, importData,
  }
})
