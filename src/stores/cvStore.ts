import { defineStore } from 'pinia'
import { api, ApiError, getAuthToken } from '@shared/utils/api'
import type { CVData, CVSection, CVTemplate, PublicCVView } from '@shared/types/cv.types'
import type { ThemeDefinition } from '@shared/types/portfolio.types'

interface CVState {
  cvs: CVData[]
  current: CVData | null
  templates: CVTemplate[]
  loading: boolean
  error: string | null
  generatingPDF: boolean
  draftRevision: number
  savedRevision: number
  saving: boolean
}

const saveQueues = new WeakMap<object, Promise<CVData>>()

export const useCVStore = defineStore('cv', {
  state: (): CVState => ({
    cvs: [],
    current: null,
    templates: [],
    loading: false,
    error: null,
    generatingPDF: false,
    draftRevision: 0,
    savedRevision: 0,
    saving: false,
  }),

  getters: {
    publishedCVs: (state) => state.cvs.filter((cv) => cv.meta.isPublic),
    currentCV: (state) => state.current,
  },

  actions: {
    async loadAll(): Promise<void> {
      this.loading = true
      this.error = null
      try {
        this.cvs = await api.get<CVData[]>('/admin/cv')
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async load(id: string): Promise<void> {
      this.loading = true
      this.error = null
      this.current = null
      try {
        this.current = await api.get<CVData>(`/admin/cv/${id}`)
        this.savedRevision = ++this.draftRevision
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async create(data: Partial<CVData>): Promise<CVData> {
      this.loading = true
      this.error = null
      try {
        const cv = await api.post<CVData>('/admin/cv', data)
        this.cvs.unshift(cv)
        this.current = cv
        this.savedRevision = ++this.draftRevision
        return cv
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async save(): Promise<CVData> {
      if (!this.current) throw new Error('Aucun CV courant à enregistrer')
      this.saving = true
      this.error = null
      const revision = this.draftRevision
      const draft = JSON.parse(JSON.stringify(this.current)) as CVData
      const previous = saveQueues.get(this)
      const task = (previous ? previous.catch(() => undefined) : Promise.resolve()).then(() => api.patch<CVData>(`/admin/cv/${draft.meta.id}`, draft))
      saveQueues.set(this, task)
      try {
        const updated = await task
        const idx = this.cvs.findIndex((c) => c.meta.id === updated.meta.id)
        if (idx >= 0 && this.draftRevision === revision) this.cvs[idx] = updated
        if (this.draftRevision === revision && this.current?.meta.id === updated.meta.id) {
          this.current = updated
          this.savedRevision = revision
        }
        return updated
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        if (saveQueues.get(this) === task) {
          saveQueues.delete(this)
          this.saving = false
        }
      }
    },

    updateDraft(cv: CVData): void {
      this.draftRevision += 1
      this.current = cv
      const idx = this.cvs.findIndex((item) => item.meta.id === cv.meta.id)
      if (idx >= 0) this.cvs[idx] = cv
    },

    async patch(id: string, data: Partial<CVData>): Promise<CVData> {
      this.loading = true
      this.error = null
      try {
        const updated = await api.patch<CVData>(`/admin/cv/${id}`, data)
        const idx = this.cvs.findIndex((c) => c.meta.id === id)
        if (idx >= 0) this.cvs[idx] = updated
        if (this.current?.meta.id === id) this.current = updated
        return updated
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async delete(id: string): Promise<void> {
      this.loading = true
      this.error = null
      try {
        await api.delete(`/admin/cv/${id}`)
        this.cvs = this.cvs.filter((c) => c.meta.id !== id)
        if (this.current?.meta.id === id) this.current = null
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async replaceCV(cv: CVData): Promise<CVData> {
      this.loading = true
      this.error = null
      try {
        const updated = await api.put<CVData>(`/admin/cv/${cv.meta.id}`, cv)
        const idx = this.cvs.findIndex((c) => c.meta.id === cv.meta.id)
        if (idx >= 0) this.cvs[idx] = updated
        else this.cvs.unshift(updated)
        this.current = updated
        this.savedRevision = ++this.draftRevision
        return updated
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async togglePublish(id: string): Promise<CVData> {
      this.loading = true
      this.error = null
      try {
        const res = await api.post<{ ok: boolean; isPublic: boolean }>(`/admin/cv/${id}/publish`)
        const cv = this.cvs.find((c) => c.meta.id === id)
        if (cv) {
          cv.meta.isPublic = res.isPublic
          cv.meta.updatedAt = new Date().toISOString()
        }
        if (this.current?.meta.id === id) {
          this.current.meta.isPublic = res.isPublic
          this.current.meta.updatedAt = new Date().toISOString()
        }
        return this.current ?? cv!
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async syncFromPortfolio(id: string): Promise<CVData> {
      this.loading = true
      this.error = null
      try {
        const res = await api.post<{ ok: boolean; sections: number; cv: CVData }>(
          `/admin/cv/${id}/sync`,
        )
        const cv = res.cv
        const idx = this.cvs.findIndex((c) => c.meta.id === id)
        if (idx >= 0) this.cvs[idx] = cv
        if (this.current?.meta.id === id) this.current = cv
        this.savedRevision = ++this.draftRevision
        return cv
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async generatePDF(id: string): Promise<Blob> {
      this.generatingPDF = true
      this.error = null
      try {
        const token = getAuthToken()
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(`/api/admin/cv/${id}/pdf`, {
          method: 'POST',
          headers,
          credentials: 'include',
        })

        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          const message =
            (payload as { error?: string } | null)?.error ?? `Erreur ${res.status}`
          throw new ApiError(message, res.status, payload)
        }

        return await res.blob()
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.generatingPDF = false
      }
    },

    async loadTemplates(): Promise<void> {
      this.loading = true
      this.error = null
      try {
        const themes = await api.get<Array<{ id: string; name: string; description: string }>>('/cv/themes')
        this.templates = themes.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          sections: [],
        }))
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async createFromTemplate(templateId: string, title: string): Promise<CVData> {
      this.loading = true
      this.error = null
      try {
        const cv = await api.post<CVData>(`/admin/cv/from-template/${templateId}`, { title })
        this.cvs.unshift(cv)
        this.current = cv
        this.savedRevision = ++this.draftRevision
        return cv
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async reorderSections(cvId: string, sectionIds: string[]): Promise<CVData> {
      const cv = this.current && this.current.meta.id === cvId
        ? this.current
        : this.cvs.find((c) => c.meta.id === cvId)
      if (!cv) throw new Error(`CV introuvable : ${cvId}`)

      const idSet = new Set(sectionIds)
      const ordered = sectionIds.map((sid) => {
        const s = cv.sections.find((x) => x.id === sid)
        if (!s) throw new Error(`Section introuvable : ${sid}`)
        return s
      })
      const rest = cv.sections.filter((s) => !idSet.has(s.id))
      ordered.forEach((s, i) => (s.order = i))
      rest.forEach((s, i) => (s.order = ordered.length + i))

      const updated = await this.patch(cvId, { sections: [...ordered, ...rest] })
      return updated
    },

    async addSection(
      cvId: string,
      section: Omit<CVSection, 'id' | 'order'>,
    ): Promise<CVData> {
      const cv = this.current && this.current.meta.id === cvId
        ? this.current
        : this.cvs.find((c) => c.meta.id === cvId)
      if (!cv) throw new Error(`CV introuvable : ${cvId}`)

      const newSection: CVSection = {
        ...section,
        id: crypto.randomUUID(),
        order: cv.sections.length,
      }
      const updated = await this.patch(cvId, { sections: [...cv.sections, newSection] })
      return updated
    },

    async loadPublic(slug: string): Promise<PublicCVView> {
      this.loading = true
      this.error = null
      try {
        return await api.get<PublicCVView>(`/cv/public/${slug}`)
      } catch (e) {
        this.error = e instanceof ApiError ? e.message : (e as Error).message
        throw e
      } finally {
        this.loading = false
      }
    },

    async loadTheme(id: string): Promise<ThemeDefinition | undefined> {
      this.error = null
      try {
        return await api.get<ThemeDefinition>(`/designs/${id}`)
      } catch {
        return undefined
      }
    },

    async removeSection(cvId: string, sectionId: string): Promise<CVData> {
      const cv = this.current && this.current.meta.id === cvId
        ? this.current
        : this.cvs.find((c) => c.meta.id === cvId)
      if (!cv) throw new Error(`CV introuvable : ${cvId}`)

      const updated = await this.patch(cvId, {
        sections: cv.sections.filter((s) => s.id !== sectionId),
      })
      return updated
    },

    async updateSection(cvId: string, section: CVSection): Promise<CVData> {
      const cv = this.current && this.current.meta.id === cvId
        ? this.current
        : this.cvs.find((c) => c.meta.id === cvId)
      if (!cv) throw new Error(`CV introuvable : ${cvId}`)

      const sections = cv.sections.map((s) => (s.id === section.id ? section : s))
      const updated = await this.patch(cvId, { sections })
      return updated
    },
  },
})
