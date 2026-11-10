<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCVValidation } from '@shared/composables/useCV'
import DynamicIcon from '@/shared/components/DynamicIcon.vue'
import ImageUpload from './ImageUpload.vue'
import RichTextEditor from './RichTextEditor.vue'
import type { CVSection } from '@shared/types/cv.types'
import { CVSectionEditorProps, ProjectsData, ProjectItem, emptyProjectItem, loadProjects } from './types'

const props = defineProps<CVSectionEditorProps>()
const emit = defineEmits<{ 'update:section': [CVSection] }>()
const { validateSection } = useCVValidation()

const KINDS = [
  { value: 'personnel', label: 'Personnel' },
  { value: 'client', label: 'Client' },
  { value: 'open-source', label: 'Open source' },
]

const draft = ref<ProjectsData>(loadProjects(props.section.data as Record<string, unknown> | undefined))
const enabled = ref(props.section.enabled)
const errors = ref<string[]>([])

const sortedItems = computed(() => [...draft.value.items].sort((a, b) => a.order - b.order))

function addItem() {
  const item = emptyProjectItem()
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

function addTechnology(item: ProjectItem) {
  item.technologies.push('')
}

function removeTechnology(item: ProjectItem, index: number) {
  item.technologies.splice(index, 1)
}

function addTag(item: ProjectItem) {
  item.tags.push('')
}

function removeTag(item: ProjectItem, index: number) {
  item.tags.splice(index, 1)
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
      <span class="text-sm font-medium text-[#e6e9ef]">Activer la section Projets</span>
    </div>

    <div v-for="(item, i) in sortedItems" :key="item.id" class="mb-4 p-4 border border-[#232833] rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <input type="checkbox" v-model="item.enabled" class="h-4 w-4 accent-[#4b7bff]" />
        <span class="text-xs font-medium text-[#98a2b5]">Projet {{ i + 1 }}</span>
        <div class="flex gap-1">
          <button type="button" class="adm-btn-ghost text-xs px-1.5" :disabled="i === 0" @click="moveItem(i, -1)">↑</button>
          <button type="button" class="adm-btn-ghost text-xs px-1.5" :disabled="i === sortedItems.length - 1" @click="moveItem(i, 1)">↓</button>
          <button type="button" class="adm-btn-ghost text-xs px-1.5 !border-[#5c2b2b] !text-[#ff8080]" @click="removeItem(i)">🗑</button>
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-2 mb-2">
        <div class="adm-card p-3 sm:col-span-2">
          <label class="mb-1 block text-xs text-[#98a2b5]">Titre</label>
          <input v-model="item.title" type="text" class="adm-input text-sm" aria-label="Titre du projet" />
        </div>
        <div class="adm-card p-3">
          <label class="mb-1 block text-xs text-[#98a2b5]">Type</label>
          <select v-model="item.kind" class="adm-input text-sm" aria-label="Type du projet">
            <option v-for="k in KINDS" :key="k.value" :value="k.value">{{ k.label }}</option>
          </select>
        </div>
        <div class="adm-card p-3 sm:col-span-2">
          <label class="mb-1 block text-xs text-[#98a2b5]">Image</label>
          <ImageUpload v-model="item.image" accept="image/*" />
        </div>
        <div class="adm-card p-3 sm:col-span-2">
          <label class="mb-1 block text-xs text-[#98a2b5]">Vidéo</label>
          <ImageUpload v-model="item.video" accept="video/*" />
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-2 mb-2">
        <div class="adm-card p-3">
          <label class="mb-1 block text-xs text-[#98a2b5]">Date de début</label>
          <input v-model="item.startDate" type="text" class="adm-input text-sm" placeholder="2023" />
        </div>
        <div class="adm-card p-3">
          <label class="mb-1 block text-xs text-[#98a2b5]">Date de fin</label>
          <input v-model="item.endDate" type="text" class="adm-input text-sm" placeholder="2024" />
        </div>
        <div class="adm-card p-3 sm:col-span-2">
          <label class="mb-1 block text-xs text-[#98a2b5]">URL démo</label>
          <input v-model="item.demoUrl" type="url" class="adm-input text-sm" placeholder="https://…" />
        </div>
        <div class="adm-card p-3 sm:col-span-2">
          <label class="mb-1 block text-xs text-[#98a2b5]">URL dépôt</label>
          <input v-model="item.repoUrl" type="url" class="adm-input text-sm" placeholder="https://…" />
        </div>
      </div>

      <div class="adm-card p-3 mb-2">
        <label class="mb-1 block text-xs text-[#98a2b5]">Description courte</label>
        <RichTextEditor v-model="item.description" />
      </div>

      <div class="adm-card p-3 mb-2">
        <label class="mb-1 block text-xs text-[#98a2b5]">Description longue</label>
        <RichTextEditor v-model="item.longDescription" />
      </div>

      <div class="mb-2">
        <div class="flex items-center justify-between mb-1">
          <label class="text-xs text-[#98a2b5]">Technologies</label>
          <button type="button" class="adm-btn-ghost text-xs px-2" @click="addTechnology(item)">+</button>
        </div>
        <div class="flex gap-1 flex-wrap">
          <input
            v-for="(_, ti) in item.technologies"
            :key="ti"
            v-model="item.technologies[ti]"
            type="text"
            class="adm-input text-sm flex-1"
            placeholder="React, TS…"
          />
          <button
            v-for="(_, ti) in item.technologies"
            :key="`t-del-${ti}`"
            type="button"
            class="adm-btn-ghost text-xs !border-[#5c2b2b] !text-[#ff8080] px-2"
            @click="removeTechnology(item, ti)"
          >
            🗑
          </button>
        </div>
      </div>

      <div class="mb-2">
        <div class="flex items-center justify-between mb-1">
          <label class="text-xs text-[#98a2b5]">Étiquettes</label>
          <button type="button" class="adm-btn-ghost text-xs px-2" @click="addTag(item)">+</button>
        </div>
        <div class="flex gap-1 flex-wrap">
          <input
            v-for="(_, ti) in item.tags"
            :key="ti"
            v-model="item.tags[ti]"
            type="text"
            class="adm-input text-sm flex-1"
            placeholder="ui, web…"
          />
          <button
            v-for="(_, ti) in item.tags"
            :key="`tag-del-${ti}`"
            type="button"
            class="adm-btn-ghost text-xs !border-[#5c2b2b] !text-[#ff8080] px-2"
            @click="removeTag(item, ti)"
          >
            🗑
          </button>
        </div>
      </div>

      <label class="flex items-center gap-2 mt-2 cursor-pointer">
        <input type="checkbox" v-model="item.featured" class="h-4 w-4 accent-[#4b7bff]" />
        <span class="text-xs text-[#98a2b5]">Mis en avant</span>
      </label>
    </div>

    <div v-if="!props.readonly" class="mt-4">
      <button type="button" class="adm-btn-primary text-xs px-3" @click="addItem">
        <DynamicIcon name="plus" :size="14" /> Ajouter un projet
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
