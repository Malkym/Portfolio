<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCVValidation } from '@shared/composables/useCV'
import DynamicIcon from '@/shared/components/DynamicIcon.vue'
import type { CVSection } from '@shared/types/cv.types'
import { CVSectionEditorProps, LanguagesData, emptyLanguageItem, loadLanguages } from './types'

const props = defineProps<CVSectionEditorProps>()
const emit = defineEmits<{ 'update:section': [CVSection] }>()
const { validateSection } = useCVValidation()

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'] as const

const draft = ref<LanguagesData>(loadLanguages(props.section.data as Record<string, unknown> | undefined))
const enabled = ref(props.section.enabled)
const errors = ref<string[]>([])

const sortedItems = computed(() => [...draft.value.items].sort((a, b) => a.order - b.order))

function addItem() {
  const item = emptyLanguageItem()
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
    <div class="flex items-center gap-2 mb-4">
      <input type="checkbox" v-model="enabled" class="h-4 w-4 accent-[#4b7bff]" />
      <span class="text-sm font-medium text-[#e6e9ef]">Activer la section Langues</span>
    </div>

    <div v-for="(item, i) in sortedItems" :key="item.id" class="mb-4 p-4 border border-[#232833] rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <input type="checkbox" v-model="item.enabled" class="h-4 w-4 accent-[#4b7bff]" />
        <span class="text-xs font-medium text-[#98a2b5]">Langue {{ i + 1 }}</span>
        <div class="flex gap-1">
          <button type="button" class="adm-btn-ghost text-xs px-1.5" :disabled="i === 0" @click="moveItem(i, -1)">↑</button>
          <button type="button" class="adm-btn-ghost text-xs px-1.5" :disabled="i === sortedItems.length - 1" @click="moveItem(i, 1)">↓</button>
          <button type="button" class="adm-btn-ghost text-xs px-1.5 !border-[#5c2b2b] !text-[#ff8080]" @click="removeItem(i)">🗑</button>
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-3 mb-2">
        <div class="adm-card p-3 sm:col-span-2">
          <label class="mb-1 block text-xs text-[#98a2b5]">Langue</label>
          <input v-model="item.name" type="text" class="adm-input text-sm" placeholder="Français, Anglais…" aria-label="Langue" />
        </div>
        <div class="adm-card p-3">
          <label class="mb-1 block text-xs text-[#98a2b5]">Niveau</label>
          <select v-model="item.level" class="adm-input text-sm" aria-label="Niveau de langue">
            <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
        <div class="adm-card p-3">
          <label class="flex items-center gap-2 mb-1 block text-xs text-[#98a2b5]" style="cursor:pointer">
            <input type="checkbox" v-model="item.certified" class="h-4 w-4 accent-[#4b7bff]" />
            Certifié
          </label>
        </div>
      </div>
    </div>

    <div v-if="!props.readonly" class="mt-4">
      <button type="button" class="adm-btn-primary text-xs px-3" @click="addItem">
        <DynamicIcon name="plus" :size="14" /> Ajouter une langue
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
