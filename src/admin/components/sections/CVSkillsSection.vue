<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCVValidation } from '@shared/composables/useCV'
import DynamicIcon from '@/shared/components/DynamicIcon.vue'
import type { CVSection } from '@shared/types/cv.types'
import {
  CVSectionEditorProps,
  SkillsData,
  SkillCategory,
  emptySkill,
  emptySkillCategory,
  loadSkills,
} from './types'

const props = defineProps<CVSectionEditorProps>()
const emit = defineEmits<{ 'update:section': [CVSection] }>()
const { validateSection } = useCVValidation()

const LEVELS: { value: 'Junior' | 'Mid' | 'Senior' | 'Expert'; label: string }[] = [
  { value: 'Junior', label: 'Junior' },
  { value: 'Mid', label: 'Intermédiaire' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Expert', label: 'Expert' },
]

const draft = ref<SkillsData>(loadSkills(props.section.data as Record<string, unknown> | undefined))
const enabled = ref(props.section.enabled)
const errors = ref<string[]>([])

const sortedItems = computed(() => [...draft.value.items].sort((a, b) => a.order - b.order))

function addCategory() {
  const cat = emptySkillCategory()
  cat.order = draft.value.items.length
  draft.value.items.push(cat)
}

function removeCategory(index: number) {
  draft.value.items.splice(index, 1)
  reorderCategories()
}

function moveCategory(index: number, delta: number) {
  const items = draft.value.items
  const target = index + delta
  if (target < 0 || target >= items.length) return
  ;[items[index], items[target]] = [items[target], items[index]]
  reorderCategories()
}

function reorderCategories() {
  draft.value.items.forEach((cat, i) => { cat.order = i })
}

function addSkill(cat: SkillCategory) {
  cat.skills.push(emptySkill())
}

function removeSkill(cat: SkillCategory, index: number) {
  cat.skills.splice(index, 1)
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
      <span class="text-sm font-medium text-[#e6e9ef]">Activer la section Compétences</span>
    </div>

    <div v-for="(cat, i) in sortedItems" :key="cat.id" class="mb-4 p-4 border border-[#232833] rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <input type="checkbox" v-model="cat.enabled" class="h-4 w-4 accent-[#4b7bff]" />
        <span class="text-xs font-medium text-[#98a2b5]">Catégorie {{ i + 1 }}</span>
        <div class="flex gap-1">
          <button type="button" class="adm-btn-ghost text-xs px-1.5" :disabled="i === 0" @click="moveCategory(i, -1)">↑</button>
          <button type="button" class="adm-btn-ghost text-xs px-1.5" :disabled="i === sortedItems.length - 1" @click="moveCategory(i, 1)">↓</button>
          <button type="button" class="adm-btn-ghost text-xs px-1.5 !border-[#5c2b2b] !text-[#ff8080]" @click="removeCategory(i)">🗑</button>
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-3 mb-3">
        <div class="adm-card p-3 sm:col-span-2">
          <label class="mb-1 block text-xs text-[#98a2b5]">Nom de la catégorie</label>
          <input v-model="cat.name" type="text" class="adm-input text-sm" aria-label="Nom de la catégorie" />
        </div>
        <div class="adm-card p-3">
          <label class="mb-1 block text-xs text-[#98a2b5]">Icone</label>
          <input v-model="cat.icon" type="text" class="adm-input text-sm" placeholder="zap" aria-label="Icône de la catégorie" />
        </div>
      </div>

      <div class="space-y-1">
        <div
          v-for="(skill, si) in cat.skills"
          :key="skill.id"
          class="flex items-center gap-2 p-2 bg-[#0e121b] rounded border border-[#232833]"
        >
          <input
            v-model="skill.name"
            type="text"
            class="adm-input text-sm flex-1"
            placeholder="Nom de la compétence"
          />
          <select v-model="skill.level" class="adm-input text-sm w-32">
            <option v-for="l in LEVELS" :key="l.value" :value="l.value">{{ l.label }}</option>
          </select>
          <input
            v-model.number="skill.score"
            type="number"
            min="0"
            max="100"
            class="adm-input text-sm w-20"
            placeholder="0-100"
          />
          <input
            v-model="skill.icon"
            type="text"
            class="adm-input text-sm w-20"
            placeholder="Icone"
          />
          <button
            type="button"
            class="adm-btn-ghost text-xs !border-[#5c2b2b] !text-[#ff8080] px-1.5"
            @click="removeSkill(cat, si)"
          >
            🗑
          </button>
        </div>
      </div>

      <button
        v-if="!props.readonly"
        type="button"
        class="adm-btn-ghost text-xs px-2 mt-2"
        @click="addSkill(cat)"
      >
        <DynamicIcon name="plus" :size="14" /> Ajouter une compétence
      </button>
    </div>

    <div v-if="!props.readonly" class="mt-4">
      <button type="button" class="adm-btn-primary text-xs px-3" @click="addCategory">
        <DynamicIcon name="plus" :size="14" /> Ajouter une catégorie
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
