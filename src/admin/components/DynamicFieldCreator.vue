<script setup lang="ts">
import { ref, computed } from 'vue'
import DynamicIcon from '../../shared/components/DynamicIcon.vue'
import { useAdminStore } from '../store/adminStore'
import DataManager from './DataManager.vue'
import type { CustomField, FieldType } from '@shared/types/portfolio.types'

/**
 * Création de nouveaux types de données.
 *
 * C'est la réponse au besoin « et si dans 8 ans je veux une section
 * Certifications ? ». On décrit des champs, le système en déduit le
 * formulaire CRUD et l'affichage public. Aucun développeur requis.
 */

const store = useAdminStore()

const creating = ref(false)
const openSection = ref<string | null>(null)

const draft = ref<{
  name: string
  slug: string
  icon: string
  layout: 'cards' | 'list' | 'timeline' | 'grid' | 'table'
  fields: CustomField[]
}>({
  name: '',
  slug: '',
  icon: 'star',
  layout: 'cards',
  fields: [{ name: 'titre', label: 'Titre', type: 'text', required: true, role: 'title' }],
})

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texte court' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'rich-text', label: 'Texte enrichi (HTML)' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'image', label: 'Image / média' },
  { value: 'url', label: 'Lien' },
  { value: 'boolean', label: 'Oui / Non' },
  { value: 'select', label: 'Liste de choix' },
  { value: 'tags', label: 'Étiquettes' },
  { value: 'color', label: 'Couleur' },
  { value: 'rating', label: 'Note (1-5)' },
]

const ROLES = [
  { value: '', label: '— Aucun —' },
  { value: 'title', label: 'Titre de la carte' },
  { value: 'subtitle', label: 'Sous-titre' },
  { value: 'body', label: 'Corps du texte' },
  { value: 'media', label: 'Image principale' },
  { value: 'link', label: 'Lien principal' },
  { value: 'meta', label: 'Information annexe' },
]

/** Slug dérivé du nom : accents retirés, espaces en tirets. */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function onNameInput() {
  draft.value.slug = slugify(draft.value.name)
}

function addField() {
  draft.value.fields.push({ name: '', label: '', type: 'text', required: false })
}

function removeField(index: number) {
  draft.value.fields.splice(index, 1)
}

function onFieldLabelInput(index: number) {
  const field = draft.value.fields[index]
  if (!field) return
  // Le nom technique suit le libellé tant que l'utilisateur ne l'a pas figé.
  field.name = slugify(field.label).replace(/-/g, '_')
}

const canCreate = computed(
  () =>
    draft.value.name.trim().length > 1 &&
    draft.value.slug.length > 1 &&
    draft.value.fields.length > 0 &&
    draft.value.fields.every((f) => f.label.trim() && f.name.trim()),
)

async function create() {
  if (!canCreate.value) return

  try {
    await store.createSection({
      name: draft.value.name,
      slug: draft.value.slug,
      icon: draft.value.icon,
      enabled: true,
      layout: draft.value.layout,
      fields: draft.value.fields,
    })

    creating.value = false
    draft.value = {
      name: '',
      slug: '',
      icon: 'star',
      layout: 'cards',
      fields: [{ name: 'titre', label: 'Titre', type: 'text', required: true, role: 'title' }],
    }
  } catch (e) {
    store.notify('error', (e as Error).message)
  }
}

async function removeSection(id: string, name: string) {
  if (!confirm(`Supprimer définitivement la section « ${name} » et tout son contenu ?`)) return
  await store.deleteSection(id)
}

async function toggleSection(id: string, enabled: boolean) {
  await store.updateSection(id, { enabled })
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">Sections personnalisées</h2>
        <p class="text-sm text-[#7d8798]">
          Créez vos propres types de données — ils apparaissent aussitôt sur le portfolio.
        </p>
      </div>
      <button type="button" class="adm-btn-primary" @click="creating = true">+ Nouvelle section</button>
    </div>

    <!-- ---------------- Sections existantes ---------------- -->
    <div v-if="store.data?.customSections.length" class="space-y-3">
      <div
        v-for="section in store.data.customSections"
        :key="section.id"
        class="overflow-hidden rounded-xl border border-[#232833] bg-[#111520]"
      >
        <div class="flex flex-wrap items-center gap-3 p-4">
          <DynamicIcon :name="section.icon" :size="20" />

          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium">{{ section.name }}</span>
            <span class="block text-xs text-[#5c6577]">
              /{{ section.slug }} · {{ section.fields.length }} champ(s) ·
              {{ section.items.length }} élément(s) · affichage « {{ section.layout }} »
            </span>
          </span>

          <button
            type="button"
            class="adm-btn-ghost text-xs"
            @click="toggleSection(section.id, !section.enabled)"
          >
            {{ section.enabled ? 'Masquer' : 'Afficher' }}
          </button>

          <button
            type="button"
            class="adm-btn-ghost text-xs"
            @click="openSection = openSection === section.id ? null : section.id"
          >
            {{ openSection === section.id ? 'Replier' : 'Gérer le contenu' }}
          </button>

          <button
            type="button"
            class="adm-btn-ghost text-xs !border-[#5c2b2b] !text-[#ff8080]"
            @click="removeSection(section.id, section.name)"
          >
            Supprimer
          </button>
        </div>

        <!-- Le CRUD réutilise le composant générique des collections natives. -->
        <div v-if="openSection === section.id" class="border-t border-[#232833] p-5">
          <DataManager
            :collection="section.slug"
            :section-id="section.id"
            :title="`Contenu de « ${section.name} »`"
            :fields="section.fields"
            :items="section.items as unknown as Record<string, unknown>[]"
            dynamic
          />
        </div>
      </div>
    </div>

    <p
      v-else
      class="rounded-xl border border-dashed border-[#2a3040] py-14 text-center text-sm text-[#5c6577]"
    >
      Aucune section personnalisée. Créez « Certifications », « Publications », « Prix »…
    </p>

    <!-- ---------------- Assistant de création ---------------- -->
    <div
      v-if="creating"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"
      role="dialog"
      aria-modal="true"
      @click.self="creating = false"
    >
      <form
        class="max-h-[90svh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#232833] bg-[#0e121b] p-7"
        novalidate
        @submit.prevent="create"
      >
        <h3 class="mb-6 text-lg font-semibold">Nouvelle section</h3>

        <div class="mb-6 grid gap-4 sm:grid-cols-4">
          <div class="sm:col-span-2">
            <label for="s-name" class="mb-1.5 block text-sm font-medium">Nom *</label>
            <input
              id="s-name"
              v-model="draft.name"
              class="adm-input"
              placeholder="Certifications"
              required
              @input="onNameInput"
            />
          </div>

          <div>
            <label for="s-icon" class="mb-1.5 block text-sm font-medium">Icône (nom Lucide)</label>
            <input id="s-icon" v-model="draft.icon" class="adm-input" placeholder="star, award, heart…" />
          </div>

          <div>
            <label for="s-layout" class="mb-1.5 block text-sm font-medium">Affichage</label>
            <select id="s-layout" v-model="draft.layout" class="adm-input">
              <option value="cards">Cartes</option>
              <option value="grid">Grille compacte</option>
              <option value="list">Liste</option>
              <option value="timeline">Chronologie</option>
              <option value="table">Tableau</option>
            </select>
          </div>

          <div class="sm:col-span-4">
            <label for="s-slug" class="mb-1.5 block text-sm font-medium">
              Identifiant d'URL
            </label>
            <input id="s-slug" v-model="draft.slug" class="adm-input font-mono text-xs" pattern="[a-z0-9-]+" />
          </div>
        </div>

        <!-- ---------------- Champs ---------------- -->
        <div class="mb-4 flex items-center justify-between">
          <h4 class="text-sm font-semibold">Champs</h4>
          <button type="button" class="adm-btn-ghost text-xs" @click="addField">+ Ajouter un champ</button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(field, index) in draft.fields"
            :key="index"
            class="rounded-lg border border-[#232833] bg-[#111520] p-4"
          >
            <div class="grid gap-3 sm:grid-cols-12">
              <div class="sm:col-span-4">
                <label :for="`fl-${index}`" class="mb-1 block text-xs text-[#7d8798]">Libellé *</label>
                <input
                  :id="`fl-${index}`"
                  v-model="field.label"
                  class="adm-input text-sm"
                  placeholder="Organisme"
                  @input="onFieldLabelInput(index)"
                />
              </div>

              <div class="sm:col-span-3">
                <label :for="`ft-${index}`" class="mb-1 block text-xs text-[#7d8798]">Type</label>
                <select :id="`ft-${index}`" v-model="field.type" class="adm-input text-sm">
                  <option v-for="type in FIELD_TYPES" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </div>

              <div class="sm:col-span-3">
                <label :for="`fr-${index}`" class="mb-1 block text-xs text-[#7d8798]">Rôle affiché</label>
                <select :id="`fr-${index}`" v-model="field.role" class="adm-input text-sm">
                  <option v-for="role in ROLES" :key="role.value" :value="role.value || undefined">
                    {{ role.label }}
                  </option>
                </select>
              </div>

              <div class="flex items-end gap-3 sm:col-span-2">
                <label class="flex items-center gap-1.5 pb-2.5 text-xs">
                  <input v-model="field.required" type="checkbox" class="h-3.5 w-3.5 accent-[#4b7bff]" />
                  Requis
                </label>
                <button
                  type="button"
                  class="pb-2.5 text-lg text-[#ff8080]"
                  :disabled="draft.fields.length === 1"
                  aria-label="Supprimer ce champ"
                  @click="removeField(index)"
                >
                  ×
                </button>
              </div>

              <!-- Options : uniquement pertinentes pour une liste de choix. -->
              <div v-if="field.type === 'select'" class="sm:col-span-12">
                <label :for="`fo-${index}`" class="mb-1 block text-xs text-[#7d8798]">
                  Choix possibles (séparés par des virgules)
                </label>
                <input
                  :id="`fo-${index}`"
                  class="adm-input text-sm"
                  :value="(field.options ?? []).join(', ')"
                  placeholder="Débutant, Intermédiaire, Avancé"
                  @input="
                    field.options = ($event.target as HTMLInputElement).value
                      .split(',')
                      .map((o) => o.trim())
                      .filter(Boolean)
                  "
                />
              </div>
            </div>
          </div>
        </div>

        <div class="mt-7 flex justify-end gap-3">
          <button type="button" class="adm-btn-ghost" @click="creating = false">Annuler</button>
          <button type="submit" class="adm-btn-primary" :disabled="!canCreate">
            Créer la section
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
