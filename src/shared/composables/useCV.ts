import { ref } from 'vue'
import { api, ApiError } from '@shared/utils/api'
import { z } from 'zod'
import type { CVData, CVSection, CVThemeDefinition } from '@shared/types/cv.types'
import type { ThemeDefinition } from '@shared/types/portfolio.types'
import { cvSectionSchema } from '../types/cv.schemas'

/* ================================================================== */
/*  fieldSchema — réutilisé depuis server/routes/data.ts               */
/* ================================================================== */

/**
 * Schéma de validation d'un champ dynamique, identique à celui du serveur
 * (`server/routes/data.ts`). Permet de valider côté client les champs
 * d'une section CV avant envoi.
 */
export const fieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    'text',
    'textarea',
    'rich-text',
    'number',
    'date',
    'image',
    'url',
    'boolean',
    'select',
    'tags',
    'color',
    'rating',
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  help: z.string().optional(),
  role: z
    .enum(['title', 'subtitle', 'body', 'media', 'link', 'meta'])
    .optional(),
})

/* ================================================================== */
/*  useCVThemes                                                        */
/* ================================================================== */

export function useCVThemes() {
  const themes = ref<Map<string, CVThemeDefinition>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const list = await api.get<CVThemeDefinition[]>('/cv/themes')
      const map = new Map(list.map((theme) => [theme.id, theme]))
      themes.value = map
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  function get(id: string): CVThemeDefinition | undefined {
    return themes.value.get(id)
  }

  return { themes, loading, error, load, get }
}

/* ================================================================== */
/*  useCVExport                                                        */
/* ================================================================== */

export function useCVExport() {
  const downloading = ref(false)
  const error = ref<string | null>(null)

  async function saveResponseAsFile(res: Response, filename: string): Promise<void> {
    if (!res.ok) {
      const payload = await res.json().catch(() => null)
      const message =
        (payload as { error?: string } | null)?.error ?? `Erreur ${res.status}`
      throw new ApiError(message, res.status, payload)
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function downloadPDF(params: {
    cv: CVData
    theme?: ThemeDefinition
  }): Promise<void> {
    const { cv } = params
    downloading.value = true
    error.value = null

    try {
      const slug = cv.meta.slug
      const id = cv.meta.id

      // Tentative admin d'abord (nécessite authentification), puis public.
      let res: Response
      res = await fetch(`/api/admin/cv/${id}/pdf`, {
        method: 'POST',
        credentials: 'include',
      })
      // Sans session admin (visiteur public), on bascule sur la route publique.
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        res = await fetch(`/api/cv/public/${slug}/pdf`, {
          method: 'POST',
          credentials: 'include',
        })
      }

      await saveResponseAsFile(res, `cv-${slug}.pdf`)
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : (e as Error).message
      throw e
    } finally {
      downloading.value = false
    }
  }

  async function downloadPublicPDF(slug: string): Promise<void> {
    downloading.value = true
    error.value = null

    try {
      const res = await fetch(`/api/cv/public/${encodeURIComponent(slug)}/pdf`, {
        method: 'POST',
        credentials: 'include',
      })
      await saveResponseAsFile(res, `cv-${slug}.pdf`)
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : (e as Error).message
      throw e
    } finally {
      downloading.value = false
    }
  }

  return { downloading, error, downloadPDF, downloadPublicPDF }
}

/* ================================================================== */
/*  useCVSync                                                          */
/* ================================================================== */

export function useCVSync() {
  const syncing = ref(false)
  const error = ref<string | null>(null)

  async function sync(cvId: string): Promise<CVData> {
    syncing.value = true
    error.value = null
    try {
      const res = await api.post<{ ok: boolean; sections: number; cv: CVData }>(
        `/admin/cv/${cvId}/sync`,
      )
      return res.cv
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : (e as Error).message
      throw e
    } finally {
      syncing.value = false
    }
  }

  /** Mapping explicite des champs portfolio vers les sections CV. */
  function fieldMapping(): Record<string, { portfolio: string; cv: string[] }> {
    return {
      personal: {
        portfolio: 'personal',
        cv: ['name', 'title', 'bio', 'photo', 'email', 'phone', 'location'],
      },
      experience: {
        portfolio: 'experience.items',
        cv: [
          'company',
          'role',
          'location',
          'startDate',
          'endDate',
          'current',
          'description',
          'achievements',
          'technologies',
          'logo',
        ],
      },
      education: {
        portfolio: 'education.items',
        cv: [
          'school',
          'degree',
          'field',
          'startYear',
          'endYear',
          'description',
          'logo',
        ],
      },
      skills: {
        portfolio: 'skills.categories',
        cv: ['name', 'icon', 'skills'],
      },
      projects: {
        portfolio: 'projects.items',
        cv: [
          'title',
          'description',
          'image',
          'technologies',
          'demoUrl',
          'repoUrl',
          'featured',
        ],
      },
    }
  }

  return { syncing, error, sync, fieldMapping }
}

/* ================================================================== */
/*  useCVValidation                                                    */
/* ================================================================== */

export function useCVValidation() {
  function validateSection(data: unknown): { ok: true; data: CVSection } | { ok: false; errors: string[] } {
    const result = cvSectionSchema.safeParse(data)
    if (result.success) return { ok: true, data: result.data as CVSection }
    return {
      ok: false,
      errors: result.error.issues.map((i) => i.message),
    }
  }

  function validateField(field: unknown): { ok: true; data: z.infer<typeof fieldSchema> } | { ok: false; errors: string[] } {
    const result = fieldSchema.safeParse(field)
    if (result.success) return { ok: true, data: result.data }
    return {
      ok: false,
      errors: result.error.issues.map((i) => i.message),
    }
  }

  return { validateSection, validateField, fieldSchema, cvSectionSchema }
}
