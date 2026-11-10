<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCVValidation } from '@shared/composables/useCV'
import DynamicIcon from '@/shared/components/DynamicIcon.vue'
import ImageUpload from './ImageUpload.vue'
import type { CVSection } from '@shared/types/cv.types'
import { CVSectionEditorProps, HeaderData, loadHeader, uid } from './types'

const props = defineProps<CVSectionEditorProps>()
const emit = defineEmits<{ 'update:section': [CVSection] }>()
const { validateSection } = useCVValidation()

const PLATFORMS = ['LinkedIn', 'GitHub', 'Portfolio', 'Twitter', 'Instagram', 'Dribbble', 'Behance', 'Site web']

const draft = ref<HeaderData>(loadHeader(props.section.data as Record<string, unknown> | undefined))
const enabled = ref(props.section.enabled)
const errors = ref<string[]>([])

function addLink() {
  draft.value.links.push({ id: uid(), platform: '', url: '', icon: 'link' })
}

function removeLink(index: number) {
  draft.value.links.splice(index, 1)
}

function syncFromPortfolio() {
  if (!props.portfolioData) return
  const p = props.portfolioData.personal
  draft.value.name = p.name
  draft.value.title = p.title
  draft.value.email = p.email
  draft.value.phone = p.phone
  draft.value.location = p.location
  draft.value.photo = p.photo
}

function commit() {
  const out: CVSection = {
    id: props.section.id,
    type: props.section.type,
    enabled: enabled.value,
    order: props.section.order,
    data: { ...draft.value } as Record<string, unknown>,
  }
  const result = validateSection(out)
  errors.value = result.ok ? [] : result.errors
  if (result.ok) emit('update:section', result.data)
}

watch(draft, () => commit(), { deep: true })
watch(enabled, () => commit())
watch(() => props.section.enabled, (v) => { enabled.value = v })
</script>

<template>
  <div class="adm-card p-6" :style="{ '--accent': theme.colors.primary }">
    <div class="flex items-center gap-2 mb-4">
      <input
        type="checkbox"
        v-model="enabled"
        class="h-4 w-4 accent-[#4b7bff]"
      />
      <span class="text-sm font-medium text-[#e6e9ef]">Activer la section En-tête</span>
    </div>
    <div v-if="!props.readonly && props.portfolioData" class="flex justify-end mb-3">
      <button
        type="button"
        class="adm-btn-ghost text-xs px-2 border-[#2a3040] text-[#c2c8d4]"
        @click="syncFromPortfolio"
      >
        <DynamicIcon name="refresh-ccw" :size="14" /> Remplacer depuis le portfolio
      </button>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="adm-card p-4">
        <label class="mb-1.5 block text-sm font-medium text-[#98a2b5]" for="cv-header-name">Nom complet</label>
        <input id="cv-header-name" v-model="draft.name" type="text" class="adm-input" autocomplete="name" />
      </div>
      <div class="adm-card p-4">
        <label class="mb-1.5 block text-sm font-medium text-[#98a2b5]">Titre / Intitulé</label>
        <input v-model="draft.title" type="text" class="adm-input" aria-label="Titre / Intitulé" />
      </div>
      <div class="adm-card p-4">
        <label class="mb-1.5 block text-sm font-medium text-[#98a2b5]">E-mail</label>
        <input v-model="draft.email" type="email" class="adm-input" aria-label="E-mail" autocomplete="email" />
      </div>
      <div class="adm-card p-4">
        <label class="mb-1.5 block text-sm font-medium text-[#98a2b5]">Téléphone</label>
        <input v-model="draft.phone" type="tel" class="adm-input" aria-label="Téléphone" autocomplete="tel" />
      </div>
      <div class="adm-card p-4">
        <label class="mb-1.5 block text-sm font-medium text-[#98a2b5]">Lieu</label>
        <input v-model="draft.location" type="text" class="adm-input" aria-label="Lieu" />
      </div>
      <div class="adm-card p-4 sm:col-span-2">
        <label class="mb-1.5 block text-sm font-medium text-[#98a2b5]">Photo</label>
        <ImageUpload v-model="draft.photo" accept="image/*" label="URL de la photo" />
      </div>
    </div>

    <div class="adm-card p-4 mt-4">
      <div class="flex items-center justify-between mb-3">
        <label class="text-sm font-medium text-[#98a2b5]">Liens (réseaux / sites)</label>
        <button
          v-if="!props.readonly"
          type="button"
          class="adm-btn-ghost text-xs px-2"
          @click="addLink"
        >
          <DynamicIcon name="plus" :size="14" /> Ajouter un lien
        </button>
      </div>
      <div v-for="(link, i) in draft.links" :key="link.id" class="cv-header-link-row">
        <select v-model="link.platform" class="adm-input" aria-label="Plateforme du lien">
          <option value="">Plateforme</option>
          <option v-for="platform in PLATFORMS" :key="platform" :value="platform">{{ platform }}</option>
        </select>
        <input v-model="link.url" type="url" class="adm-input" aria-label="Adresse du lien" placeholder="https://…" />
        <input v-model="link.icon" type="text" class="adm-input" aria-label="Icône du lien" placeholder="Icône" />
        <button
          v-if="!props.readonly"
          type="button"
          class="adm-btn-ghost text-xs !border-[#5c2b2b] !text-[#ff8080] px-2"
          @click="removeLink(i)"
        >
          <DynamicIcon name="trash" :size="14" /> Suppr
        </button>
      </div>
    </div>

    <div v-if="errors.length" class="mt-3 text-xs text-[#ff6b6b]">
      <ul class="list-disc list-inside space-y-1">
        <li v-for="e in errors" :key="e">{{ e }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.cv-header-link-row{display:grid;grid-template-columns:110px minmax(0,1fr) 65px 60px;gap:8px;margin-bottom:8px}@media(max-width:800px){.cv-header-link-row{grid-template-columns:110px minmax(0,1fr)}.cv-header-link-row>button{justify-self:end}}
</style>
