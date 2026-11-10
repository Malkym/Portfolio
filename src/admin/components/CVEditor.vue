<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCVValidation } from '@shared/composables/useCV'
import DynamicIcon from '@/shared/components/DynamicIcon.vue'
import CVThemeSelector from './CVThemeSelector.vue'
import CVDocumentPreview from '@shared/components/CVDocumentPreview.vue'
import {
  CVHeaderSection,
  CVSummarySection,
  CVExperienceSection,
  CVEducationSection,
  CVSkillsSection,
  CVProjectsSection,
  CVCertificationsSection,
  CVLanguagesSection,
  CVPublicationsSection,
  CVCustomSection,
} from './sections'
import type { CVData, CVSection, CVSectionType, CVThemeDefinition, PublicCVView } from '@shared/types/cv.types'
import type { PortfolioData } from '@shared/types/portfolio.types'
import {
  emptyHeader,
  emptySummary,
  emptyExperience,
  emptyEducation,
  emptySkills,
  emptyProjects,
  emptyCertifications,
  emptyLanguages,
  emptyPublications,
  emptyCustom,
  uid,
} from './sections/types'

interface CVEditorProps {
  cv: CVData
  theme: CVThemeDefinition
  themes: CVThemeDefinition[]
  portfolioData?: PortfolioData
  readonly?: boolean
}

const props = defineProps<CVEditorProps>()
const emit = defineEmits<{
  'update:cv': [CVData]
}>()

const { validateSection } = useCVValidation()
const themes = computed(() => props.themes)

const currentThemeId = computed(() => props.cv.meta.themeId)

const cvPreview = computed<PublicCVView>(() => ({
  meta: {
    title: props.cv.meta.title,
    themeId: props.cv.meta.themeId,
    themeOverrides: props.cv.meta.themeOverrides,
  },
  sections: props.cv.sections,
}))

function onThemeUpdate(themeId: string) {
  const modified: CVData = {
    meta: { ...props.cv.meta, themeId },
    sections: props.cv.sections,
  }
  emitUpdatedCV(modified)
}

const activeSectionId = ref<string | null>(null)
const pendingSelectId = ref<string | null>(null)
const showAddModal = ref(false)
const showThemePanel = ref(false)
const hoveredThemeId = ref<string | null>(null)
const previewTheme = computed(() => props.themes.find(theme => theme.id === hoveredThemeId.value) ?? props.theme)
const showConfirmDelete = ref<string | null>(null)

const SECTION_COMPONENTS: Record<CVSectionType, any> = {
  header: CVHeaderSection,
  summary: CVSummarySection,
  experience: CVExperienceSection,
  education: CVEducationSection,
  skills: CVSkillsSection,
  projects: CVProjectsSection,
  certifications: CVCertificationsSection,
  languages: CVLanguagesSection,
  publications: CVPublicationsSection,
  custom: CVCustomSection,
}

const EMPTY_SECTION_DATA: Record<CVSectionType, () => Record<string, unknown>> = {
  header: () => emptyHeader() as unknown as Record<string, unknown>,
  summary: () => emptySummary() as unknown as Record<string, unknown>,
  experience: () => emptyExperience() as unknown as Record<string, unknown>,
  education: () => emptyEducation() as unknown as Record<string, unknown>,
  skills: () => emptySkills() as unknown as Record<string, unknown>,
  projects: () => emptyProjects() as unknown as Record<string, unknown>,
  certifications: () => emptyCertifications() as unknown as Record<string, unknown>,
  languages: () => emptyLanguages() as unknown as Record<string, unknown>,
  publications: () => emptyPublications() as unknown as Record<string, unknown>,
  custom: () => emptyCustom() as unknown as Record<string, unknown>,
}

const currentSection = computed(() => props.cv.sections.find((s) => s.id === activeSectionId.value))
const currentSectionComponent = computed(() => {
  if (!currentSection.value) return null
  return SECTION_COMPONENTS[currentSection.value.type]
})

const sectionTypes = computed<CVSectionType[]>(() => Object.keys(SECTION_COMPONENTS) as CVSectionType[])

const sectionLabels: Record<CVSectionType, string> = {
  header: 'En-tête',
  summary: 'Résumé',
  experience: 'Expérience',
  education: 'Éducation',
  skills: 'Compétences',
  projects: 'Projets',
  certifications: 'Certifications',
  languages: 'Langues',
  publications: 'Publications',
  custom: 'Personnalisée',
}

function emitUpdatedCV(modified: CVData) {
  emit('update:cv', modified)
}

function onSectionUpdate(section: CVSection) {
  const result = validateSection(section)
  if (!result.ok) return
  const modified: CVData = {
    meta: { ...props.cv.meta },
    sections: props.cv.sections.map((s) => (s.id === section.id ? section : s)),
  }
  emitUpdatedCV(modified)
}

function moveSection(delta: number) {
  const ids = props.cv.sections.map(s => s.id)
  const index = ids.indexOf(activeSectionId.value ?? '')
  const target = index + delta
  if (index < 0 || target < 0 || target >= ids.length) return
  ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
  onReorder(ids)
}

function selectSection(id: string | null) {
  activeSectionId.value = id
  showConfirmDelete.value = null
}

function onToggleSection(id: string) {
  if (props.readonly) return
  const section = props.cv.sections.find((s) => s.id === id)
  if (!section) return
  const modified: CVData = {
    meta: { ...props.cv.meta },
    sections: props.cv.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
  }
  emitUpdatedCV(modified)
}

function onRemoveSection(id: string) {
  if (props.readonly) return
  showConfirmDelete.value = id
}

function confirmRemove() {
  if (!showConfirmDelete.value || props.readonly) return
  const removedId = showConfirmDelete.value
  const modified: CVData = {
    meta: { ...props.cv.meta },
    sections: props.cv.sections.filter((s) => s.id !== removedId).map((s, order) => ({ ...s, order })),
  }
  emitUpdatedCV(modified)
  if (activeSectionId.value === removedId) {
    activeSectionId.value = modified.sections[0]?.id ?? null
  }
  showConfirmDelete.value = null
}

function cancelRemove() {
  showConfirmDelete.value = null
}

function openAddModal() {
  if (props.readonly) return
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

function onAddSection(type: CVSectionType) {
  if (props.readonly) return
  const newSection: CVSection = {
    id: uid(),
    type,
    enabled: true,
    order: props.cv.sections.length,
    data: EMPTY_SECTION_DATA[type](),
  }
  const modified: CVData = {
    meta: { ...props.cv.meta },
    sections: [...props.cv.sections, newSection],
  }
  pendingSelectId.value = newSection.id
  emitUpdatedCV(modified)
  closeAddModal()
}

function onReorder(sectionIds: string[]) {
  if (props.readonly) return
  const orderById = new Map(sectionIds.map((id, index) => [id, index]))
  const modified: CVData = {
    meta: { ...props.cv.meta },
    sections: props.cv.sections
      .map((section) => ({
        ...section,
        order: orderById.get(section.id) ?? section.order,
      }))
      .sort((a, b) => a.order - b.order),
  }
  emitUpdatedCV(modified)
}

/* ---------------- Drag & drop natif ---------------- */

let draggedIndex: number | null = null

function onDragStart(index: number) {
  draggedIndex = index
}

function onDrop(targetIndex: number) {
  if (draggedIndex === null || draggedIndex === targetIndex) return
  const list = [...props.cv.sections]
  const [moved] = list.splice(draggedIndex, 1)
  if (moved) list.splice(targetIndex, 0, moved)
  draggedIndex = null
  const sectionIds = list.map((s) => s.id)
  onReorder(sectionIds)
}

/* ---------------- Initialisation ---------------- */

watch(
  () => props.cv.sections,
  (sections) => {
    if (sections.length === 0) {
      activeSectionId.value = null
      return
    }
    if (pendingSelectId.value) {
        const pending = sections.find((s) => s.id === pendingSelectId.value)
        if (pending) {
          activeSectionId.value = pending.id
          pendingSelectId.value = null
          return
        }
    }
    const currentlyActive = sections.find((s) => s.id === activeSectionId.value)
    if (!currentlyActive) {
      activeSectionId.value = sections[0].id
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="cv-editor-layout">

    <!-- ---------------- Sidebar : liste des sections ---------------- -->
    <aside class="cv-sections-sidebar" aria-label="Sections du CV">
      <div class="p-5 border-b border-[#1c212c]">
        <h2 class="text-sm font-semibold">Sections du CV</h2>
        <p class="text-xs text-[#7d8798] mt-1">
          {{ props.cv.sections.length }} section{{ props.cv.sections.length > 1 ? 's' : '' }}
        </p>
        <p class="mt-2 text-[0.68rem] text-[#5c6577]">Glissez les rubriques pour changer leur ordre.</p>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-2">
        <ul v-if="props.cv.sections.length" class="space-y-2">
          <li
            v-for="(section, index) in props.cv.sections"
            :key="section.id"
            :draggable="!props.readonly"
            class="flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer"
            :class="
              activeSectionId === section.id
                ? 'border-[#4b7bff] bg-[#182238]'
                : 'border-[#232833] hover:border-[#39404f] hover:bg-[#141924]'
            "
            @dragstart="onDragStart(index)"
            @dragover.prevent
            @drop="onDrop(index)"
            @click="selectSection(section.id)"
          >
            <span
              class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-semibold"
              :class="activeSectionId === section.id ? 'bg-[#4b7bff] text-white' : 'bg-[#1c212c] text-[#98a2b5]'"
            >{{ String(index + 1).padStart(2, '0') }}</span>
            <button type="button" class="min-w-0 flex-1 truncate text-left text-sm" :aria-label="`Éditer ${sectionLabels[section.type]}`" :aria-current="activeSectionId === section.id ? 'true' : undefined" @click.stop="selectSection(section.id)">{{ sectionLabels[section.type] }}</button>
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :class="section.enabled ? 'bg-[#5fd18b]' : 'bg-[#5c6577]'"
              :title="section.enabled ? 'Visible dans le CV' : 'Masquée dans le CV'"
            />
          </li>
        </ul>

        <p v-else class="text-xs text-[#5c6577] text-center py-10">
          Aucune section. Cliquez sur « Ajouter une section ».
        </p>
      </div>

    </aside>

    <!-- ---------------- Centre : éditeur de la section active ---------------- -->
    <div class="cv-section-editor">
      <div class="p-5 border-b border-[#1c212c]">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#5c6577]">
              {{ currentSection ? `Section ${String(currentSection.order + 1).padStart(2, '0')}` : 'Éditeur' }}
            </p>
            <h2 class="mt-1 text-lg font-semibold">
              {{ currentSection ? sectionLabels[currentSection.type] : 'Sélectionnez une section' }}
            </h2>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button v-if="currentSection" type="button" class="adm-btn-ghost text-xs" aria-label="Monter la section" :disabled="props.cv.sections[0]?.id === currentSection.id" @click="moveSection(-1)">↑</button>
            <button v-if="currentSection" type="button" class="adm-btn-ghost text-xs" aria-label="Descendre la section" :disabled="props.cv.sections.at(-1)?.id === currentSection.id" @click="moveSection(1)">↓</button>
            <button
              v-if="currentSection"
              type="button"
              class="adm-btn-ghost text-xs"
              @click="onToggleSection(currentSection.id)"
            >
              {{ currentSection.enabled ? 'Masquer la section' : 'Afficher la section' }}
            </button>
            <button
              v-if="currentSection"
              type="button"
              class="adm-btn-ghost text-xs !border-[#5c2b2b] !text-[#ff8080]"
              aria-label="Supprimer la section"
              @click="onRemoveSection(currentSection.id)"
            >
              <DynamicIcon name="trash" :size="14" /> Supprimer
            </button>
            <button
              type="button"
              class="adm-btn-ghost text-xs"
              :disabled="props.readonly"
              @click="openAddModal"
            >
              <DynamicIcon name="plus" :size="14" /> Ajouter une section
            </button>
          </div>
        </div>
      </div>

      <div class="cv-section-fields">
        <component
          v-if="currentSection && currentSectionComponent"
          :is="currentSectionComponent"
          :key="currentSection.id"
          :section="currentSection"
          :theme="props.theme"
          :portfolio-data="props.portfolioData"
          :readonly="props.readonly"
          @update:section="onSectionUpdate"
        />
        <div v-else-if="!props.cv.sections.length" class="flex flex-col items-center justify-center h-full text-[#5c6577] text-sm">
          Ajoutez une section pour commencer.
        </div>
      </div>
    </div>

    <aside class="cv-live-preview" aria-label="Aperçu du document">
      <div class="cv-preview-heading"><div><h2>Aperçu du CV</h2><p>{{ previewTheme.name }} · Format A4</p></div><button type="button" class="adm-btn-ghost text-xs" @click="showThemePanel = true"><DynamicIcon name="palette" :size="15"/> Choisir un thème</button></div>
      <div class="cv-paper-canvas"><CVDocumentPreview :cv="cvPreview" :theme="previewTheme" /></div>
      <p class="cv-preview-note">Votre document se met à jour pendant la saisie. Les coordonnées privées sont conservées dans votre PDF, pas dans le CV public.</p>
    </aside>

    <aside
      v-if="showThemePanel"
      class="cv-theme-modal"
      role="dialog" aria-modal="true" aria-label="Thèmes du CV" @keydown.esc="showThemePanel = false"
    >
      <div class="flex items-center justify-between border-b border-[#1c212c] px-4 py-3">
        <span class="text-sm font-semibold">Choisir un thème</span>
        <button type="button" class="adm-btn-ghost px-2 py-1 text-xs" @click="showThemePanel = false">
          Fermer
        </button>
      </div>
      <CVThemeSelector
        class="min-h-0 flex-1"
        :themes="themes"
        :current-theme-id="currentThemeId"
        :cv-preview="cvPreview"
        :readonly="props.readonly"
        @update:theme-id="onThemeUpdate"
        @preview-theme="hoveredThemeId = $event"
      />
    </aside>

    <!-- ---------------- Confirmation de suppression ---------------- -->
    <div
      v-if="showConfirmDelete"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"
      role="dialog"
      aria-modal="true"
      @click.self="cancelRemove"
    >
      <div class="w-full max-w-md rounded-2xl border border-[#232833] bg-[#0e121b] p-7">
        <h3 class="mb-2 text-lg font-semibold">Supprimer cette section ?</h3>
        <p class="mb-6 text-sm text-[#7d8798]">
          Cette action retire la section du CV. Elle est irréversible sans annulation.
        </p>
        <div class="flex flex-wrap justify-end gap-3">
          <button type="button" class="adm-btn-ghost" @click="cancelRemove">Annuler</button>
          <button type="button" class="rounded-lg bg-[#b03434] px-4 py-2.5 text-sm font-semibold text-white" @click="confirmRemove">
            Supprimer
          </button>
        </div>
      </div>
    </div>

    <!-- ---------------- Modal d'ajout de section ---------------- -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"
      role="dialog"
      aria-modal="true"
      @click.self="closeAddModal"
    >
      <div class="w-full max-w-md rounded-2xl border border-[#232833] bg-[#0e121b] p-7">
        <h3 class="mb-6 text-lg font-semibold">Ajouter une section</h3>

        <div class="grid gap-3 sm:grid-cols-2">
          <button
            v-for="type in sectionTypes"
            :key="type"
            type="button"
            class="adm-btn-ghost text-sm text-left p-4 border-[#2a3040] hover:border-[#4b7bff] hover:bg-[#141924]"
            @click="onAddSection(type)"
          >
            <div class="flex items-center gap-3">
              <DynamicIcon :name="type" :size="20" class="shrink-0 text-[#4b7bff]" />
              <span class="flex-1">{{ sectionLabels[type] }}</span>
            </div>
          </button>
        </div>

        <div class="mt-6 flex justify-end">
          <button type="button" class="adm-btn-ghost" @click="closeAddModal">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cv-editor-layout{position:relative;display:grid;grid-template-columns:190px minmax(300px,1fr) minmax(360px,1.05fr);border:1px solid #232d3e;border-radius:14px;min-height:680px;background:#101621;color:#e6e9ef;align-items:start}.cv-sections-sidebar{align-self:stretch;background:#10151e;border-right:1px solid #232d3e;border-radius:14px 0 0 14px;min-width:0}.cv-sections-sidebar :deep(li){gap:10px;padding:10px}.cv-sections-sidebar :deep(.p-4){padding:12px}.cv-section-editor{min-width:0;display:flex;flex-direction:column}.cv-section-fields{padding:22px;min-width:0}.cv-live-preview{min-width:0;background:#19212e;border-left:1px solid #2a3446;align-self:stretch;border-radius:0 14px 14px 0}.cv-preview-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px;border-bottom:1px solid #2a3446}.cv-preview-heading h2{font-size:14px;font-weight:600}.cv-preview-heading p{font-size:11px;color:#a4b0c4;margin-top:4px}.cv-paper-canvas{padding:24px;max-height:850px;overflow:auto;background:#202938}.cv-preview-note{font-size:11px;line-height:1.7;color:#a4b0c4;padding:16px 22px}.cv-theme-modal{position:absolute;right:0;top:0;bottom:0;width:min(620px,100%);z-index:40;background:#101621;border:1px solid #3a4a64;border-radius:14px;box-shadow:-18px 0 70px #0006;display:flex;flex-direction:column;min-height:500px;max-height:100%;overflow:hidden}
@media(max-width:1200px){.cv-editor-layout{grid-template-columns:170px minmax(0,1fr)}.cv-live-preview{grid-column:1/-1;border-left:0;border-top:1px solid #2a3446;border-radius:0 0 14px 14px}.cv-paper-canvas{max-height:650px}.cv-paper-canvas :deep(.cv-preview-host){max-width:680px;margin:auto}}
@media(max-width:640px){.cv-editor-layout{display:flex;flex-direction:column}.cv-sections-sidebar{width:100%;border:0;border-bottom:1px solid #232d3e;border-radius:14px 14px 0 0}.cv-sections-sidebar>div:first-child{padding:16px}.cv-sections-sidebar>div:last-child{max-height:150px;overflow:auto}.cv-sections-sidebar ul{display:flex;gap:8px;flex-wrap:nowrap}.cv-sections-sidebar li{flex:0 0 auto;min-width:145px}.cv-section-editor,.cv-live-preview{width:100%}.cv-section-fields{padding:16px}.cv-paper-canvas{padding:14px}.cv-theme-modal{position:fixed;inset:12px;width:auto;max-height:calc(100dvh - 24px)}.cv-preview-heading{flex-wrap:wrap}}
</style>
