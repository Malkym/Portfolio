<script setup lang="ts">
import { ref, computed } from 'vue'
import { GripVertical } from '@lucide/vue'
import FieldInput from './FieldInput.vue'
import { useAdminStore } from '../store/adminStore'
import type { CustomField } from '@shared/types/portfolio.types'

/**
 * CRUD générique pour une collection.
 *
 * Le parent fournit le schéma des champs ; ce composant gère la liste,
 * le formulaire, le réordonnancement et la suppression. Les neuf collections
 * natives ET les sections dynamiques passent toutes par ici — il n'existe
 * qu'une seule implémentation de CRUD dans le projet.
 */

const props = defineProps<{
  /** Nom de collection native, ou id de section dynamique. */
  collection: string
  title: string
  fields: CustomField[]
  items: Record<string, unknown>[]
  /** Les sections dynamiques rangent leurs valeurs dans `item.data`. */
  dynamic?: boolean
  sectionId?: string
}>()

const store = useAdminStore()

const editing = ref<Record<string, unknown> | null>(null)
const isNew = ref(false)
const confirmDelete = ref<string | null>(null)
const dragIndex = ref<number | null>(null)

const sorted = computed(() =>
  [...props.items].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
)

function payloadOf(item: Record<string, unknown>): Record<string, unknown> {
  return props.dynamic ? ((item.data as Record<string, unknown>) ?? {}) : item
}

/** Libellé d'une ligne : premier champ « titre », sinon premier champ texte. */
function labelOf(item: Record<string, unknown>): string {
  const data = payloadOf(item)
  const titleField =
    props.fields.find((f) => f.role === 'title') ?? props.fields.find((f) => f.type === 'text')
  return String(data[titleField?.name ?? ''] ?? '(sans titre)')
}

function startCreate() {
  const blank: Record<string, unknown> = {}
  for (const field of props.fields) {
    blank[field.name] =
      field.type === 'boolean' ? false : field.type === 'tags' ? [] : field.type === 'number' ? 0 : ''
  }
  editing.value = blank
  isNew.value = true
}

function startEdit(item: Record<string, unknown>) {
  // Copie profonde : tant qu'on n'a pas enregistré, la liste ne bouge pas.
  editing.value = JSON.parse(JSON.stringify({ ...payloadOf(item), id: item.id }))
  isNew.value = false
}

async function submit() {
  if (!editing.value) return

  const { id, ...payload } = editing.value

  try {
    if (props.dynamic && props.sectionId) {
      if (isNew.value) await store.createSectionItem(props.sectionId, payload)
      else await store.updateSectionItem(props.sectionId, String(id), payload)
    } else {
      if (isNew.value) await store.createItem(props.collection, payload)
      else await store.updateItem(props.collection, String(id), payload)
    }
    editing.value = null
  } catch (e) {
    store.notify('error', (e as Error).message)
  }
}

async function remove(id: string, hard: boolean) {
  try {
    if (props.dynamic && props.sectionId) await store.deleteSectionItem(props.sectionId, id)
    else await store.removeItem(props.collection, id, hard)
    confirmDelete.value = null
  } catch (e) {
    store.notify('error', (e as Error).message)
  }
}

async function toggleEnabled(item: Record<string, unknown>) {
  const next = !item.enabled
  if (props.dynamic && props.sectionId) {
    await store.updateSectionItem(props.sectionId, String(item.id), {})
  } else {
    await store.updateItem(props.collection, String(item.id), { enabled: next })
  }
}

/* ---------------- Réordonnancement ---------------- */

function onDragStart(index: number) {
  dragIndex.value = index
}

async function onDrop(targetIndex: number) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return

  const list = [...sorted.value]
  const [moved] = list.splice(dragIndex.value, 1)
  if (moved) list.splice(targetIndex, 0, moved)

  dragIndex.value = null

  if (!props.dynamic) {
    await store.reorder(props.collection, list.map((i) => String(i.id)))
    await store.loadAll()
  }
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">{{ title }}</h2>
        <p class="text-sm text-[#7d8798]">
          {{ items.length }} élément{{ items.length > 1 ? 's' : '' }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="header-extra" />
        <button type="button" class="adm-btn-primary" @click="startCreate">+ Ajouter</button>
      </div>
    </div>

    <!-- ---------------- Liste ---------------- -->
    <ul v-if="sorted.length" class="space-y-2">
      <li
        v-for="(item, index) in sorted"
        :key="String(item.id)"
        draggable="true"
        class="flex items-center gap-3 rounded-xl border border-[#232833] bg-[#111520] p-3.5 transition-colors hover:border-[#39404f]"
        :class="{ 'opacity-45': item.enabled === false || item.archived }"
        @dragstart="onDragStart(index)"
        @dragover.prevent
        @drop="onDrop(index)"
      >
        <GripVertical aria-hidden="true" class="cursor-grab" :size="16" :style="{ color: '#4a5264' }" />

        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium">{{ labelOf(item) }}</span>
          <span v-if="item.archived" class="text-xs text-[#c98a3d]">Archivé</span>
          <span v-else-if="item.enabled === false" class="text-xs text-[#7d8798]">Masqué</span>
        </span>

        <button
          type="button"
          class="adm-btn-ghost text-xs"
          :aria-pressed="item.enabled !== false"
          @click="toggleEnabled(item)"
        >
          {{ item.enabled === false ? 'Afficher' : 'Masquer' }}
        </button>

        <button type="button" class="adm-btn-ghost text-xs" @click="startEdit(item)">Modifier</button>

        <button
          type="button"
          class="adm-btn-ghost text-xs !border-[#5c2b2b] !text-[#ff8080]"
          @click="confirmDelete = String(item.id)"
        >
          Supprimer
        </button>
      </li>
    </ul>

    <p v-else class="rounded-xl border border-dashed border-[#2a3040] py-14 text-center text-sm text-[#5c6577]">
      Aucun élément pour l'instant. Cliquez sur « Ajouter ».
    </p>

    <!-- ---------------- Formulaire ---------------- -->
    <div
      v-if="editing"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"
      role="dialog"
      aria-modal="true"
      @click.self="editing = null"
    >
      <form
        class="max-h-[88svh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#232833] bg-[#0e121b] p-7"
        novalidate
        @submit.prevent="submit"
      >
        <h3 class="mb-6 text-lg font-semibold">
          {{ isNew ? 'Nouvel élément' : 'Modifier l\'élément' }}
        </h3>

        <FieldInput
          v-for="field in fields"
          :key="field.name"
          :field="field"
          :model-value="editing[field.name]"
          @update:model-value="editing![field.name] = $event"
        />

        <div class="mt-7 flex justify-end gap-3">
          <button type="button" class="adm-btn-ghost" @click="editing = null">Annuler</button>
          <button type="submit" class="adm-btn-primary">Enregistrer</button>
        </div>
      </form>
    </div>

    <!-- ---------------- Confirmation ---------------- -->
    <div
      v-if="confirmDelete"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"
      role="dialog"
      aria-modal="true"
      @click.self="confirmDelete = null"
    >
      <div class="w-full max-w-md rounded-2xl border border-[#232833] bg-[#0e121b] p-7">
        <h3 class="mb-2 text-lg font-semibold">Supprimer cet élément ?</h3>
        <p class="mb-6 text-sm text-[#7d8798]">
          L'archivage le retire du site public mais conserve les données — c'est
          réversible, et recommandé. La suppression définitive est irréversible.
        </p>

        <div class="flex flex-wrap justify-end gap-3">
          <button type="button" class="adm-btn-ghost" @click="confirmDelete = null">Annuler</button>
          <button type="button" class="adm-btn-ghost" @click="remove(confirmDelete, false)">
            Archiver
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#b03434] px-4 py-2.5 text-sm font-semibold text-white"
            @click="remove(confirmDelete, true)"
          >
            Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
