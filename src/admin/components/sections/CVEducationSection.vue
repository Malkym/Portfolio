<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCVValidation } from '@shared/composables/useCV'
import DynamicIcon from '@/shared/components/DynamicIcon.vue'
import ImageUpload from './ImageUpload.vue'
import RichTextEditor from './RichTextEditor.vue'
import type { CVSection } from '@shared/types/cv.types'
import { CVSectionEditorProps, EducationData, emptyEducationItem, loadEducation, uid } from './types'

const props = defineProps<CVSectionEditorProps>()
const emit = defineEmits<{ 'update:section': [CVSection] }>()
const { validateSection } = useCVValidation()

const draft = ref<EducationData>(loadEducation(props.section.data as Record<string, unknown> | undefined))
const enabled = ref(props.section.enabled)
const errors = ref<string[]>([])

const sortedItems = computed(() => [...draft.value.items].sort((a, b) => a.order - b.order))

function addItem() {
  const item = emptyEducationItem()
  item.order = draft.value.items.length
  draft.value.items.push(item)
}

function removeItem(index: number) {
  draft.value.items.splice(index, 1)
  reorder()
}

function moveItem(index: number, delta: number) {
  const items = draft.value.items
  const target = index + delta
  if (target < 0 || target >= items.length) return
  ;[items[index], items[target]] = [items[target], items[index]]
  reorder()
}

function reorder() {
  draft.value.items.forEach((item, i) => { item.order = i })
}

function syncFromPortfolio() {
  if (!props.portfolioData) return
  draft.value.items = props.portfolioData.education.items
    .filter((src) => src.enabled !== false && src.archived !== true)
    .map((src, order) => ({
      id: uid(),
      order,
      enabled: true,
      school: src.school,
      degree: src.degree,
      field: src.field,
      startYear: src.startYear,
      endYear: src.endYear,
      description: src.description,
      logo: src.logo,
    }))
}

function commit() {
  const out: CVSection = {
    id: props.section.id,
    type: props.section.type,
    enabled: enabled.value,
    order: props.section.order,
    data: { items: sortedItems.value } as Record<string, unknown>,
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
  <div class="adm-card p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <input type="checkbox" v-model="enabled" class="h-4 w-4 accent-[#4b7bff]" />
        <span class="text-sm font-medium text-[#e6e9ef]">Activer la section Éducation</span>
      </div>
      <button
        v-if="!props.readonly"
        type="button"
        class="adm-btn-ghost text-xs px-2 border-[#2a3040] text-[#c2c8d4]"
        @click="syncFromPortfolio"
        :disabled="!props.portfolioData"
      >
        <DynamicIcon name="refresh-ccw" :size="14" /> Remplacer depuis le portfolio
      </button>
    </div>

    <div v-for="(item, i) in sortedItems" :key="item.id" class="mb-4 p-4 border border-[#232833] rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <input type="checkbox" v-model="item.enabled" class="h-4 w-4 accent-[#4b7bff]" />
        <span class="text-xs font-medium text-[#98a2b5]">Diplôme {{ i + 1 }}</span>
        <div class="flex gap-1">
          <button type="button" class="adm-btn-ghost text-xs px-1.5" :disabled="i === 0" @click="moveItem(i, -1)">↑</button>
          <button type="button" class="adm-btn-ghost text-xs px-1.5" :disabled="i === sortedItems.length - 1" @click="moveItem(i, 1)">↓</button>
          <button type="button" class="adm-btn-ghost text-xs px-1.5 !border-[#5c2b2b] !text-[#ff8080]" @click="removeItem(i)">🗑</button>
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-2 mb-2">
        <div class="adm-card p-3">
          <label class="mb-1 block text-xs text-[#98a2b5]">École</label>
          <input v-model="item.school" type="text" class="adm-input text-sm" aria-label="École" />
        </div>
        <div class="adm-card p-3">
          <label class="mb-1 block text-xs text-[#98a2b5]">Diplôme</label>
          <input v-model="item.degree" type="text" class="adm-input text-sm" aria-label="Diplôme" />
        </div>
        <div class="adm-card p-3">
          <label class="mb-1 block text-xs text-[#98a2b5]">Filière</label>
          <input v-model="item.field" type="text" class="adm-input text-sm" aria-label="Filière" />
        </div>
        <div class="adm-card p-3 sm:col-span-2">
          <label class="mb-1 block text-xs text-[#98a2b5]">Logo</label>
          <ImageUpload v-model="item.logo" accept="image/*" />
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-2 mb-2">
        <div class="adm-card p-3">
          <label class="mb-1 block text-xs text-[#98a2b5]">Année de début</label>
          <input v-model="item.startYear" type="text" class="adm-input text-sm" placeholder="2018" aria-label="Année de début" />
        </div>
        <div class="adm-card p-3">
          <label class="mb-1 block text-xs text-[#98a2b5]">Année de fin</label>
          <input v-model="item.endYear" type="text" class="adm-input text-sm" placeholder="2021" aria-label="Année de fin" />
        </div>
      </div>

      <div class="adm-card p-3 mb-2">
        <label class="mb-1 block text-xs text-[#98a2b5]">Description</label>
        <RichTextEditor v-model="item.description" />
      </div>
    </div>

    <div v-if="!props.readonly" class="mt-4">
      <button type="button" class="adm-btn-primary text-xs px-3" @click="addItem">
        <DynamicIcon name="plus" :size="14" /> Ajouter un diplôme
      </button>
    </div>

    <div v-if="errors.length" class="mt-3 text-xs text-[#ff6b6b]">
      <ul class="list-disc list-inside space-y-1">
        <li v-for="e in errors" :key="e">{{ e }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
</style>
