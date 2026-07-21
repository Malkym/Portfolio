<script setup lang="ts">
import { computed, ref } from 'vue'
import { Star } from '@lucide/vue'
import { api } from '@shared/utils/api'
import type { CustomField } from '@shared/types/portfolio.types'

const props = defineProps<{ field: CustomField; modelValue: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [unknown] }>()

const uploading = ref(false)
const uploadError = ref('')
const showMedia = ref(false)
const mediaFiles = ref<{ url: string; name: string; size: number }[]>([])
const mediaLoading = ref(false)

const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const id = computed(() => `f-${props.field.name}`)

const tagsText = computed({
  get: () => (Array.isArray(props.modelValue) ? props.modelValue.join(', ') : String(props.modelValue ?? '')),
  set: (v: string) =>
    emit(
      'update:modelValue',
      v.split(',').map((t) => t.trim()).filter(Boolean),
    ),
})

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  uploadError.value = ''

  try {
    const body = new FormData()
    body.append('files', file)
    const [uploaded] = await api.post<{ url: string }[]>('/admin/upload', body)
    if (uploaded) value.value = uploaded.url
  } catch (e) {
    uploadError.value = (e as Error).message
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function openMedia() {
  showMedia.value = true
  mediaLoading.value = true
  try {
    mediaFiles.value = await api.get('/admin/media')
  } catch {
    mediaFiles.value = []
  } finally {
    mediaLoading.value = false
  }
}

function pickMedia(url: string) {
  value.value = url
  showMedia.value = false
}
</script>

<template>
  <div class="mb-4">
    <label :for="id" class="mb-1.5 block text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required" class="text-[#ff6b6b]">*</span>
    </label>

    <!-- Texte long -->
    <textarea
      v-if="field.type === 'textarea'"
      :id="id"
      v-model="value as string"
      rows="4"
      :placeholder="field.placeholder"
      class="adm-input resize-y"
    />

    <!-- HTML riche : saisi tel quel, assaini a l'affichage public. -->
    <div v-else-if="field.type === 'rich-text'">
      <textarea
        :id="id"
        v-model="value as string"
        rows="7"
        :placeholder="field.placeholder || '<p>Votre texte…</p>'"
        class="adm-input resize-y font-mono text-xs"
      />
      <p class="mt-1 text-xs text-[#5c6577]">
        HTML accepte. Les balises dangereuses sont filtrees a l'affichage.
      </p>
    </div>

    <!-- Booleen -->
    <label v-else-if="field.type === 'boolean'" class="flex cursor-pointer items-center gap-2.5">
      <input :id="id" v-model="value as boolean" type="checkbox" class="h-4 w-4 accent-[#4b7bff]" />
      <span class="text-sm text-[#98a2b5]">{{ field.placeholder || 'Active' }}</span>
    </label>

    <!-- Liste deroulante -->
    <select
      v-else-if="field.type === 'select'"
      :id="id"
      v-model="value as string"
      class="adm-input"
    >
      <option value="">— Choisir —</option>
      <option v-for="option in field.options ?? []" :key="option" :value="option">
        {{ option }}
      </option>
    </select>

    <!-- Image / media, avec upload + mediatheque -->
    <div v-else-if="field.type === 'image'">
      <div class="flex gap-2">
        <input
          :id="id"
          v-model="value as string"
          type="url"
          placeholder="https://… ou /uploads/…"
          class="adm-input flex-1"
        />
        <label
          class="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-[#2a3040] px-3 py-2.5 text-sm transition-colors hover:border-[#4b7bff]"
        >
          {{ uploading ? '…' : 'Upload' }}
          <input type="file" accept="image/*,video/*" class="hidden" @change="uploadFile" />
        </label>
        <button
          type="button"
          class="whitespace-nowrap rounded-lg border border-[#2a3040] px-3 py-2.5 text-sm transition-colors hover:border-[#4b7bff]"
          @click="openMedia"
        >
          Media
        </button>
      </div>

      <img
        v-if="value"
        :src="value as string"
        alt="Apercu"
        class="mt-2 h-24 rounded-lg border border-[#232833] object-cover"
      />
      <p v-if="uploadError" class="mt-1 text-xs text-[#ff6b6b]">{{ uploadError }}</p>
    </div>

    <!-- Etiquettes -->
    <input
      v-else-if="field.type === 'tags'"
      :id="id"
      v-model="tagsText"
      type="text"
      :placeholder="field.placeholder || 'vue, typescript, node'"
      class="adm-input"
    />

    <!-- Note 1-5 -->
    <div v-else-if="field.type === 'rating'" class="flex gap-1.5">
      <button
        v-for="n in 5"
        :key="n"
        type="button"
        :aria-label="`${n} sur 5`"
        :aria-pressed="Number(value) === n"
        class="transition-transform hover:scale-110"
        @click="value = n"
      >
        <Star
          :size="24"
          :fill="Number(value) >= n ? '#ffc83d' : 'transparent'"
          :color="Number(value) >= n ? '#ffc83d' : '#39404f'"
        />
      </button>
    </div>

    <!-- Couleur -->
    <div v-else-if="field.type === 'color'" class="flex gap-2">
      <input :id="id" v-model="value as string" type="color" class="h-10 w-14 rounded border border-[#2a3040] bg-transparent" />
      <input v-model="value as string" type="text" class="adm-input flex-1 font-mono text-xs" />
    </div>

    <!-- Nombre / date / url / texte -->
    <input
      v-else
      :id="id"
      v-model="value as string"
      :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'"
      :placeholder="field.placeholder"
      class="adm-input"
    />

    <p v-if="field.help" class="mt-1 text-xs text-[#5c6577]">{{ field.help }}</p>

    <!-- ---------------- Mediatheque ---------------- -->
    <div
      v-if="showMedia"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"
      role="dialog"
      aria-modal="true"
      @click.self="showMedia = false"
    >
      <div class="max-h-[80svh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#232833] bg-[#0e121b] p-7">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="text-lg font-semibold">Mediatheque</h3>
          <button type="button" class="rounded-lg border border-[#2a3040] px-3 py-1.5 text-xs transition-colors hover:border-[#4b7bff]" @click="showMedia = false">Fermer</button>
        </div>

        <div v-if="mediaLoading" class="py-12 text-center text-sm text-[#5c6577]">
          Chargement…
        </div>

        <div v-else-if="mediaFiles.length" class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <button
            v-for="file in mediaFiles"
            :key="file.name"
            type="button"
            class="group relative aspect-square overflow-hidden rounded-lg border border-[#232833] bg-[#111520] hover:border-[#4b7bff]"
            @click="pickMedia(file.url)"
          >
            <img
              :src="file.url"
              :alt="file.name"
              loading="lazy"
              class="h-full w-full object-cover"
            />
            <span class="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-[0.6rem] text-white opacity-0 group-hover:opacity-100">
              {{ file.name }}
            </span>
          </button>
        </div>

        <p v-else class="py-12 text-center text-sm text-[#5c6577]">
          Aucun fichier. Utilisez le bouton « Upload » pour en envoyer.
        </p>
      </div>
    </div>
  </div>
</template>