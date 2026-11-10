<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useCVStore } from '@/stores/cvStore'
import { useAdminStore } from '../store/adminStore'
import { useCVThemes } from '@shared/composables/useCV'
import { api } from '@shared/utils/api'
import { ADMIN_PATH } from '@/router'
import DynamicIcon from '@/shared/components/DynamicIcon.vue'
import CVEditor from '../components/CVEditor.vue'
import CVToolbar from '../components/CVToolbar.vue'
import EphemeralBanner from '../components/EphemeralBanner.vue'
import type { CVData, CVThemeDefinition } from '@shared/types/cv.types'
import type { PortfolioData } from '@shared/types/portfolio.types'
import { cvDataSchema } from '@shared/types/cv.schemas'
import '../../assets/styles/cv-workspace.css'

const store = useCVStore()
const adminStore = useAdminStore()
const route = useRoute()
const router = useRouter()

const { themes: themesMap, load: loadThemes } = useCVThemes()

const isGeneratingPDF = computed(() => store.generatingPDF)

const initializing = ref(true)
const editorRevision = ref(0)
const portfolioData = ref<PortfolioData | null>(null)
const currentCVId = ref<string | null>(route.params.id as string | null)
const newCVTitle = ref('')
const newCVTemplate = ref<string | null>(null)
const showNewModal = ref(false)
const cvSelectorOpen = ref(false)
const cvFilter = ref('')
const pendingSave = ref(false)
let persistTimer: ReturnType<typeof setTimeout> | undefined

const cvs = computed(() => store.cvs)
const currentCV = computed(() => store.current)
const cvThemes = computed(() => Array.from(themesMap.value.values()))
const currentTheme = computed<CVThemeDefinition | undefined>(() => {
  if (!currentCV.value) return undefined
  return themesMap.value.get(currentCV.value.meta.themeId) ?? themesMap.value.get('clean-white')
})
const currentThemeId = computed(() => currentTheme.value?.id ?? 'clean-white')

const filteredCVs = computed(() => {
  if (!cvFilter.value.trim()) return cvs.value
  const q = cvFilter.value.toLowerCase()
  return cvs.value.filter(cv => cv.meta.title.toLowerCase().includes(q))
})

async function loadCV(id: string) {
  try {
    if (store.current && store.current.meta.id !== id) {
      await flushPendingSave()
    }
    await store.load(id)
    currentCVId.value = id
    void router.push(`${ADMIN_PATH}/cv/${id}`)
  } catch (error) {
    adminStore.notify('error', error instanceof Error ? error.message : 'Impossible de charger ce CV')
  }
}

function protectUnsavedDraft(event: BeforeUnloadEvent) {
  if (!store.current || (!pendingSave.value && !store.saving && store.savedRevision === store.draftRevision)) return
  event.preventDefault()
  event.returnValue = ''
}

async function persistCV() {
  try {
    await store.save()
    pendingSave.value = store.savedRevision !== store.draftRevision
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Échec de l’enregistrement du CV'
    adminStore.notify('error', message)
    throw error
  }
}

async function flushPendingSave() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = undefined
  if (store.current && (pendingSave.value || store.saving || store.savedRevision !== store.draftRevision)) await persistCV()
}

function saveCV(cv: CVData) {
  store.updateDraft(cv)
  pendingSave.value = true
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = undefined
    void persistCV().catch(() => {})
  }, 600)
}

function acceptSyncedCV() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = undefined
  pendingSave.value = false
  if (!store.current) return
  editorRevision.value += 1
}

async function replaceCV(cv: CVData) {
  try {
    const valid = cvDataSchema.safeParse(cv)
    if (!valid.success || !cv.meta?.id || typeof cv.meta.id !== 'string') throw new Error('Fichier CV invalide : vérifiez ses métadonnées et ses sections.')
    await flushPendingSave()
    await store.replaceCV(cv)
    pendingSave.value = false
    editorRevision.value += 1
    currentCVId.value = cv.meta.id
    void router.push(`${ADMIN_PATH}/cv/${cv.meta.id}`)
    adminStore.notify('ok', 'CV importé depuis JSON')
  } catch (error) {
    adminStore.notify('error', error instanceof Error ? error.message : 'Fichier CV invalide')
  }
}

async function createCV() {
  if (!newCVTitle.value.trim()) return
  try {
    await flushPendingSave()
    const now = new Date().toISOString()
    const slug =
      newCVTitle.value
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'cv'
    const cv = await store.create({
      meta: {
        id: '',
        slug,
        title: newCVTitle.value.trim(),
        isPublic: false,
        themeId: currentThemeId.value,
        createdAt: now,
        updatedAt: now,
      },
    })
    currentCVId.value = cv.meta.id
    newCVTitle.value = ''
    showNewModal.value = false
    void router.push(`${ADMIN_PATH}/cv/${cv.meta.id}`)
    adminStore.notify('ok', 'CV créé')
  } catch {
    // store.create already notifies error
  }
}

async function createFromTemplate() {
  if (!newCVTitle.value.trim()) return
  if (!newCVTemplate.value) return
  try {
    await flushPendingSave()
    const cv = await store.createFromTemplate(newCVTemplate.value, newCVTitle.value.trim())
    currentCVId.value = cv.meta.id
    newCVTitle.value = ''
    newCVTemplate.value = null
    showNewModal.value = false
    void router.push(`${ADMIN_PATH}/cv/${cv.meta.id}`)
    adminStore.notify('ok', 'CV créé depuis le modèle')
  } catch {
    // store.createFromTemplate already notifies error
  }
}

async function deleteCV(id: string) {
  if (!confirm('Supprimer ce CV ? Cette action est irréversible.')) return
  try {
    if (store.current?.meta.id === id && persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = undefined
    }
    await store.delete(id)
    const remaining = store.cvs[0]
    currentCVId.value = remaining ? remaining.meta.id : null
    if (remaining) {
      void loadCV(remaining.meta.id)
    } else {
      void router.push(`${ADMIN_PATH}/cv`)
    }
    adminStore.notify('ok', 'CV supprimé')
  } catch {
    // store.delete already notifies error
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (id && id !== currentCVId.value) {
      void loadCV(id as string)
    }
  },
)

onMounted(async () => {
  window.addEventListener('beforeunload', protectUnsavedDraft)
  try {
    await Promise.all([loadThemes(), store.loadAll()])
    try {
      portfolioData.value = await api.get<PortfolioData>('/admin/data')
    } catch (error) {
      adminStore.notify('error', error instanceof Error ? error.message : 'Impossible de charger les données du portfolio')
    }
    const id = route.params.id as string | undefined
    if (id) {
      await loadCV(id)
    } else if (cvs.value.length > 0) {
      await loadCV(cvs.value[0].meta.id)
    }
  } catch (error) {
    adminStore.notify('error', error instanceof Error ? error.message : 'Impossible de charger les CV')
  } finally {
    initializing.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', protectUnsavedDraft)
  if (persistTimer) clearTimeout(persistTimer)
})
onBeforeRouteLeave(async () => {
  try { await flushPendingSave(); return true } catch { return false }
})
</script>

<template>
  <div class="cv-workspace min-h-svh bg-[#0b0d12] text-[#e6e9ef]">
    <!-- ---------------- Header sticky ---------------- -->
    <header class="sticky top-0 z-20 border-b border-[#1c212c] bg-[#0b0d12]/80 backdrop-blur p-4 lg:p-6">
      <div class="mx-auto flex max-w-[1680px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <DynamicIcon name="file-text" :size="20" class="text-[#4b7bff]" />
          <div>
            <h1 class="text-lg font-semibold">L’atelier CV</h1>
            <p class="text-xs text-[#98a2b5]">Votre parcours. Un document qui vous ressemble.</p>
          </div>
        </div>

        <div class="flex min-w-0 flex-wrap items-center gap-3">
          <!-- Sélecteur de CV -->
          <div class="relative min-w-0 flex-1 lg:w-64">
            <button
              type="button"
              class="adm-input px-4 pr-10 flex items-center justify-between cursor-pointer"
              @click="cvSelectorOpen = !cvSelectorOpen"
            >
              <span class="truncate mr-2">{{ currentCV?.meta.title || 'Choisir un CV' }}</span>
              <DynamicIcon :name="cvSelectorOpen ? 'chevron-up' : 'chevron-down'" :size="14" class="text-[#5c6577]" />
            </button>
                  <div
              v-if="cvSelectorOpen"
              class="absolute left-0 right-0 mt-2 rounded-xl border border-[#232833] bg-[#0e121b] shadow-xl z-10 max-h-60 overflow-y-auto"
            >
              <!-- Filtre de recherche -->
              <input
                type="text"
                v-model="cvFilter"
                placeholder="Filtrer les CVs…"
                class="p-3 border-b border-[#1c212c] bg-[#0b0d12] adm-input"
                @click.stop
              />
              <div v-if="filteredCVs.length" class="max-h-[300px] overflow-y-auto">
                <div
                  v-for="cv in filteredCVs"
                    :key="cv.meta.id"
                    :data-cv-id="cv.meta.id"
                  class="border-b border-[#1c212c] last:border-0"
                >
                  <button
                    type="button"
                    class="w-full text-left px-4 py-2.5 text-sm hover:bg-[#141924] flex items-center gap-3"
                    :class="currentCV?.meta.id === cv.meta.id ? 'bg-[#182238] text-[#4b7bff]' : 'text-[#c2c8d4]'"
                    @click="loadCV(cv.meta.id); cvSelectorOpen = false"
                  >
                    <DynamicIcon name="file-text" :size="14" class="shrink-0" />
                    <span class="truncate flex-1">{{ cv.meta.title }}</span>
                    <span v-if="currentCV?.meta.id === cv.meta.id" class="text-xs text-[#4b7bff] font-semibold">Actif</span>
                  </button>
                  <button
                    type="button"
                    class="w-full text-left px-4 py-2.5 text-sm text-[#ff8080] hover:bg-[#141924] flex items-center gap-3"
                    :aria-label="`Supprimer le CV ${cv.meta.title}`"
                    @click.stop="deleteCV(cv.meta.id); cvSelectorOpen = false"
                  >
                    <DynamicIcon name="trash" :size="14" class="shrink-0" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
              <p v-else class="px-4 py-4 text-center text-sm text-[#7d8798]">Aucun CV ne correspond</p>
              <div class="border-t border-[#1c212c]"></div>
              <button
                type="button"
                class="w-full text-left px-4 py-2.5 text-sm text-[#c2c8d4] hover:bg-[#141924] flex items-center gap-3"
                @click="showNewModal = true; cvSelectorOpen = false"
              >
                <DynamicIcon name="plus" :size="14" class="shrink-0 text-[#4b7bff]" />
                <span>Nouveau CV</span>
              </button>
            </div>
          </div>

          <!-- Bouton Nouveau CV (à côté du sélecteur) -->
          <button
            type="button"
            class="adm-btn-primary text-sm"
            @click="showNewModal = true"
          >
            <DynamicIcon name="plus" :size="16" class="mr-2" />
            Nouveau CV
          </button>
        </div>

        <!-- Breadcrumbs -->
        <nav class="text-xs text-[#5c6577] flex items-center gap-1">
          <RouterLink to="/" class="hover:text-[#4b7bff]">Accueil</RouterLink>
          <span>/</span>
           <RouterLink :to="ADMIN_PATH" class="hover:text-[#4b7bff]">Admin</RouterLink>
          <span>/</span>
           <span>Générateur de CV</span>
        </nav>
      </div>
    </header>

    <!-- Modal création CV -->
    <div
      v-if="showNewModal"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Nouveau CV"
      @keydown.esc="showNewModal = false"
      @click.self="showNewModal = false"
    >
      <div class="w-full max-w-md rounded-2xl border border-[#232833] bg-[#0e121b] p-7">
        <h3 class="mb-6 text-lg font-semibold">Nouveau CV</h3>

        <div class="space-y-4">
          <div>
            <label class="adm-label" for="cv-new-title">Titre du CV</label>
            <input
              type="text"
              id="cv-new-title"
              v-model="newCVTitle"
              class="adm-input"
              placeholder="Mon CV 2026"
            />
          </div>

          <div>
            <label class="adm-label" for="cv-new-theme">Thème de départ</label>
            <select id="cv-new-theme" v-model="newCVTemplate" class="adm-input">
              <option value="">Aucun (thème par défaut)</option>
              <option v-for="t in cvThemes" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
            <p class="text-xs text-[#98a2b5] mt-1">30 mises en page à essayer. Vous pourrez changer de thème à tout moment.</p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="adm-btn-ghost" @click="showNewModal = false">Annuler</button>
          <button type="button" class="adm-btn-primary" :disabled="!newCVTitle.trim() || store.loading" @click="newCVTemplate ? createFromTemplate() : createCV()">
            Créer
          </button>
        </div>
      </div>
    </div>

    <!-- ---------------- Contenu principal ---------------- -->
    <main class="mx-auto max-w-[1680px] p-4 lg:p-7 min-h-[60vh]">
      <EphemeralBanner />

      <template v-if="initializing || (store.loading && !currentCV)">
        <p class="py-24 text-center text-sm text-[#5c6577]">Chargement des CV…</p>
      </template>

      <template v-else-if="cvs.length === 0 && !currentCV">
        <div class="py-24 text-center">
          <DynamicIcon name="file-text" :size="48" class="mx-auto mb-4 text-[#39404f]" />
          <h2 class="text-lg font-semibold mb-2">Aucun CV pour le moment</h2>
          <p class="text-[#7d8798] mb-6">Créez votre premier CV pour commencer.</p>
          <button type="button" class="adm-btn-primary" @click="showNewModal = true">
            <DynamicIcon name="plus" :size="16" class="mr-2" />
            Créer votre premier CV
          </button>
        </div>
      </template>

      <template v-else-if="currentCV">
        <div class="cv-workspace-status">
          <div><h2>{{ currentCV.meta.title }}</h2><p>Composez votre CV à gauche, voyez le résultat à droite.</p></div>
          <div class="cv-save-status" :class="{ 'cv-save-error': store.error }" aria-live="polite">
            <span class="cv-status-dot" />{{ store.error ? 'Enregistrement impossible. Réessayez avec Sauvegarder.' : store.saving ? 'Enregistrement en cours…' : pendingSave ? 'Modifications en attente…' : 'Toutes les modifications sont enregistrées' }}
          </div>
        </div>
        <CVEditor
           :key="`${currentCV.meta.id}-${editorRevision}`"
          :cv="currentCV!"
          :theme="currentTheme!"
          :themes="cvThemes"
          :portfolio-data="portfolioData ?? undefined"
          @update:cv="saveCV"
        />
        <CVToolbar
          v-if="currentCV"
          :cv="currentCV!"
          :theme="currentTheme!"
          :can-publish="true"
          :loading="store.loading"
          :generating-pdf="isGeneratingPDF"
          :flush-draft="flushPendingSave"
          @sync-completed="acceptSyncedCV"
          @replace-cv="replaceCV"
        />
      </template>
      <template v-else>
        <p class="py-24 text-center text-sm text-[#5c6577]">
          {{ store.error || 'Aucun CV n’est sélectionné.' }}
        </p>
      </template>
    </main>

    <!-- Notifications (toast) -->
    <Transition name="toast">
      <div
        v-if="adminStore.toast"
        class="fixed bottom-6 right-6 z-[60] rounded-xl px-5 py-3.5 text-sm shadow-2xl"
        :class="adminStore.toast.type === 'ok' ? 'bg-[#193321] text-[#5fd18b]' : 'bg-[#3a1e1e] text-[#ff8080]'"
        role="status"
        aria-live="polite"
      >
        {{ adminStore.toast.text }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.adm-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid #2a3040;
  background: #0d1017;
  padding: 0.6rem 0.85rem;
  font-size: 0.875rem;
  color: #e6e9ef;
  outline: none;
  transition: border-color 160ms ease;
}
.adm-input:focus {
  border-color: #4b7bff;
}
.adm-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #98a2b5;
}
.adm-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  background: #4b7bff;
  padding: 0.6rem 1.1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  transition: opacity 160ms ease;
}
.adm-btn-primary:hover:not(:disabled) {
  opacity: 0.88;
}
.adm-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  border: 1px solid #2a3040;
  padding: 0.6rem 1.1rem;
  font-size: 0.875rem;
  color: #c2c8d4;
  transition: border-color 160ms ease;
}
.adm-btn-ghost:hover {
  border-color: #4b7bff;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
