<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCVStore } from '@/stores/cvStore'
import { useAdminStore } from '../store/adminStore'
import { cvDataSchema } from '@shared/types/cv.schemas'
import DynamicIcon from '@/shared/components/DynamicIcon.vue'
import type { CVData, CVThemeDefinition } from '@shared/types/cv.types'

interface CVToolbarProps {
  cv: CVData
  theme: CVThemeDefinition
  canPublish: boolean
  flushDraft: () => Promise<void>
  loading?: boolean
  generatingPDF?: boolean
  readonly?: boolean
}

const props = defineProps<CVToolbarProps>()
const emit = defineEmits<{
  syncCompleted: [CVData]
  'replace-cv': [cv: CVData]
}>()

const store = useCVStore()
const adminStore = useAdminStore()

const importFile = ref<HTMLInputElement | null>(null)

const isSaving = computed(() => store.loading || store.saving || !!props.loading)
const isGeneratingPDF = computed(() => store.generatingPDF || !!props.generatingPDF)

async function handleSave() {
  try {
    await props.flushDraft()
    adminStore.notify('ok', 'CV enregistré')
  } catch {
    // store.save already notifies error
  }
}

async function handleSync() {
  const confirmed = window.confirm(
    'Importer les données du portfolio dans ce CV ? Les sections actuelles seront remplacées. Une sauvegarde historique sera conservée.',
  )
  if (!confirmed) return

  try {
    await props.flushDraft()
    const cv = await store.syncFromPortfolio(props.cv.meta.id)
    emit('syncCompleted', cv)
    adminStore.notify('ok', `${cv.sections.length} sections importées depuis le portfolio`)
  } catch (error) {
    adminStore.notify('error', error instanceof Error ? error.message : 'Échec de l’import depuis le portfolio')
  }
}

async function handleDownloadPDF() {
  try {
    await props.flushDraft()
    const blob = await store.generatePDF(props.cv.meta.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cv-${props.cv.meta.slug}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    adminStore.notify('ok', 'PDF généré')
  } catch (error) {
    adminStore.notify('error', error instanceof Error ? error.message : 'Échec de la génération du PDF')
  }
}

async function handleTogglePublish() {
  try {
    await props.flushDraft()
    await store.togglePublish(props.cv.meta.id)
    adminStore.notify('ok', store.current?.meta.isPublic ? 'CV publié' : 'CV dépublié')
  } catch (error) {
    adminStore.notify('error', error instanceof Error ? error.message : 'Échec de la publication du CV')
  }
}

function handleExportJSON() {
  const slug = props.cv.meta.slug
  const payload = JSON.stringify(props.cv, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cv-${slug}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  adminStore.notify('ok', `Export JSON téléchargé (cv-${slug}.json)`)
}

function handleImportJSON() {
  importFile.value?.click()
}

async function onImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const cv = JSON.parse(text) as CVData
    if (!cvDataSchema.safeParse(cv).success || typeof cv.meta?.id !== 'string' || !cv.meta.id) throw new Error('Fichier CV invalide : métadonnées ou sections incorrectes.')
    emit('replace-cv', cv)
  } catch (e) {
    adminStore.notify('error', (e as Error).message || 'Fichier JSON invalide')
  } finally {
    ;(event.target as HTMLInputElement).value = ''
  }
}

const publishLabel = computed(() => (props.cv.meta.isPublic ? 'Dépublier' : 'Publier'))
</script>

<template>
  <div
    class="cv-toolbar border-t border-[#1c212c] bg-[#0e121b] flex flex-wrap items-center justify-between gap-3 p-4"
  >
    <!-- Gauche : actions principales -->
    <div class="flex flex-wrap items-center gap-3">

      <!-- Sauvegarder -->
      <button
        type="button"
        class="adm-btn-primary text-sm"
        :disabled="props.readonly || isSaving"
        @click="handleSave"
        :aria-label="isSaving ? 'Enregistrement en cours' : 'Sauvegarder le CV'"
      >
        <DynamicIcon v-if="isSaving" name="loader" :size="16" class="animate-spin" />
        <DynamicIcon v-else name="save" :size="16" class="mr-2" />
        {{ isSaving ? 'Enregistrement…' : 'Sauvegarder' }}
      </button>

      <!-- Sync Portfolio -->
      <button
        v-if="!props.readonly"
        type="button"
        class="adm-btn-ghost text-sm"
        :disabled="isSaving"
        @click="handleSync"
        title="Remplace les sections de ce CV par vos données Portfolio : profil, expériences, formation, compétences et projets."
        :aria-label="isSaving ? 'Importation en cours' : 'Remplacer les sections avec les données du portfolio'"
      >
        <DynamicIcon v-if="isSaving" name="loader" :size="16" class="animate-spin" />
        <DynamicIcon v-else name="refresh-ccw" :size="16" class="mr-2" />
        Importer depuis Portfolio
      </button>

      <!-- Télécharger PDF -->
      <button
        type="button"
        class="adm-btn-ghost text-sm"
        :disabled="isGeneratingPDF"
        @click="handleDownloadPDF"
        :aria-label="isGeneratingPDF ? 'Génération du PDF en cours' : 'Télécharger le CV en PDF'"
      >
        <DynamicIcon v-if="isGeneratingPDF" name="loader" :size="16" class="animate-spin" />
        <DynamicIcon v-else name="file-down" :size="16" class="mr-2" />
        {{ isGeneratingPDF ? 'Génération…' : 'Télécharger PDF' }}
      </button>

      <!-- Publier / Dépublier -->
      <button
        v-if="!props.readonly && props.canPublish"
        type="button"
        :class="
          'adm-btn-ghost text-sm'
          + (props.cv.meta.isPublic ? ' text-[#5fd18b]' : ' text-[#c2c8d4]')
        "
        :disabled="isSaving"
        @click="handleTogglePublish"
        :aria-label="props.cv.meta.isPublic ? 'Dépublier le CV' : 'Publier le CV'"
      >
        <DynamicIcon name="lock" :size="16" class="mr-2" />
        {{ publishLabel }}
      </button>

      <!-- Exporter JSON -->
      <button
        v-if="!props.readonly"
        type="button"
        class="adm-btn-ghost text-sm"
        @click="handleExportJSON"
        aria-label="Exporter le CV en JSON"
      >
        <DynamicIcon name="external-link" :size="16" class="mr-2" />
        Exporter JSON
      </button>

      <!-- Importer JSON -->
      <button
        v-if="!props.readonly"
        type="button"
        class="adm-btn-ghost text-sm"
        @click="handleImportJSON"
        aria-label="Importer un CV depuis un fichier JSON"
      >
        <DynamicIcon name="import" :size="16" class="mr-2" />
        Importer JSON
      </button>
      <input
        ref="importFile"
        type="file"
        accept=".json"
        class="hidden"
        @change="onImportFile"
      />
    </div>

    <!-- Droite : statut -->
    <div class="flex items-center gap-3 text-xs">
      <RouterLink v-if="props.cv.meta.isPublic" :to="`/cv/${props.cv.meta.slug}`" class="adm-btn-ghost">Voir le CV public</RouterLink>
      <span class="text-[#7d8798]">Thème : {{ theme.name }}</span>
      <span
        class="px-2 py-0.5 rounded border text-[0.65rem] font-semibold"
        :class="
          props.cv.meta.isPublic
            ? 'border-[#193321] text-[#5fd18b] bg-[#193321]/30'
            : 'border-[#3a1e1e] text-[#ff8080] bg-[#3a1e1e]/30'
        "
      >
        {{ props.cv.meta.isPublic ? 'Public' : 'Brouillon' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.cv-toolbar{border:1px solid #232d3e;border-radius:12px;margin-top:16px}.cv-toolbar>div:first-child{gap:8px}@media(min-width:1024px){.cv-toolbar{position:sticky;bottom:12px;z-index:30;box-shadow:0 8px 28px #0005}}
</style>
