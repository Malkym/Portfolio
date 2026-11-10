<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCVValidation } from '@shared/composables/useCV'
import RichTextEditor from './RichTextEditor.vue'
import type { CVSection } from '@shared/types/cv.types'
import { CVSectionEditorProps, CustomData, loadCustom } from './types'

const props = defineProps<CVSectionEditorProps>()
const emit = defineEmits<{ 'update:section': [CVSection] }>()
const { validateSection } = useCVValidation()

const draft = ref<CustomData>(loadCustom({ ...props.section.data, content: props.section.content ?? props.section.data.content }))
const enabled = ref(props.section.enabled)
const errors = ref<string[]>([])

function commit() {
  const out: CVSection = {
    id: props.section.id,
    type: props.section.type,
    enabled: enabled.value,
    order: props.section.order,
    data: { ...draft.value } as Record<string, unknown>,
    content: draft.value.content,
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
      <span class="text-sm font-medium text-[#e6e9ef]">Activer la section Personnalisée</span>
    </div>

    <div class="adm-card p-4 mb-4">
      <label class="mb-1.5 block text-sm font-medium text-[#98a2b5]">Titre (optionnel)</label>
      <input v-model="draft.title" type="text" class="adm-input" placeholder="Titre de la section…" aria-label="Titre de la section personnalisée" />
    </div>

    <div class="adm-card p-4">
      <label class="mb-1.5 block text-sm font-medium text-[#98a2b5]">Contenu (texte enrichi)</label>
      <RichTextEditor v-model="draft.content" placeholder="Contenu libre de la section…" />
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
