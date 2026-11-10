<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@shared/utils/api'

const props = defineProps<{
  modelValue: string
  accept?: string
  label?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const uploading = ref(false)
const error = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function pickFile() {
  inputRef.value?.click()
}

async function uploadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const body = new FormData()
    body.append('files', file)
    const [uploaded] = await api.post<{ url: string }[]>('/admin/upload', body)
    if (uploaded) emit('update:modelValue', uploaded.url)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'L’image n’a pas pu être envoyée. Réessayez.'
  } finally {
    uploading.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-start gap-2">
    <input
      :value="props.modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      type="url"
      :aria-label="label || 'URL de l’image'"
      :placeholder="label || 'https://… ou /uploads/…'"
      class="adm-input flex-1"
    />
    <div class="flex gap-2">
      <button
        type="button"
        class="adm-btn-ghost text-xs px-3 whitespace-nowrap"
        :disabled="uploading"
        @click="pickFile"
      >
        {{ uploading ? 'Envoi…' : 'Choisir une image' }}
      </button>
      <input
          ref="inputRef"
          type="file"
          class="hidden"
          :accept="accept ?? 'image/*,video/*'"
          @change="uploadFile"
        />
    </div>
  </div>
  <p v-if="error" role="alert" class="mt-2 text-xs text-[#ffb4ad]">{{ error }}</p>
  <img
    v-if="modelValue"
    :src="modelValue"
    alt="Aperçu"
    class="mt-2 h-24 rounded-lg border border-[#232833] object-cover"
  />
</template>
