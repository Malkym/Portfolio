<script setup lang="ts">
import { computed } from 'vue'
import { Star, ExternalLink } from '@lucide/vue'
import SectionHeader from './SectionHeader.vue'
import { sanitizeHtml } from '@shared/utils/sanitize'
import type { CustomSection, CustomField, DynamicItem } from '@shared/types/portfolio.types'

const props = defineProps<{ section: CustomSection; index?: number }>()

/**
 * Rendu générique d'une section créée en admin.
 *
 * On ne connaît ni les champs ni leur nombre à l'avance. Le composant se
 * repose donc sur le `role` optionnel de chaque champ (titre / sous-titre /
 * média / lien / corps) et, à défaut, sur un ordre de repli raisonnable :
 * premier champ texte = titre, première image = média, le reste en méta.
 * C'est ce qui permet de créer « Certifications » ou « Publications » en
 * trois clics et d'obtenir immédiatement un affichage correct.
 */

function fieldByRole(role: CustomField['role']): CustomField | undefined {
  return props.section.fields.find((f) => f.role === role)
}

const titleField = computed(
  () => fieldByRole('title') ?? props.section.fields.find((f) => f.type === 'text'),
)
const subtitleField = computed(() => fieldByRole('subtitle'))
const mediaField = computed(
  () => fieldByRole('media') ?? props.section.fields.find((f) => f.type === 'image'),
)
const bodyField = computed(
  () =>
    fieldByRole('body') ??
    props.section.fields.find((f) => f.type === 'textarea' || f.type === 'rich-text'),
)
const linkField = computed(
  () => fieldByRole('link') ?? props.section.fields.find((f) => f.type === 'url'),
)

/** Champs restants, affichés en liste de métadonnées. */
const metaFields = computed(() => {
  const used = new Set(
    [titleField.value, subtitleField.value, mediaField.value, bodyField.value, linkField.value]
      .filter(Boolean)
      .map((f) => f!.name),
  )
  return props.section.fields.filter((f) => !used.has(f.name))
})

function value(item: DynamicItem, field?: CustomField): string {
  if (!field) return ''
  const raw = item.data[field.name]
  if (raw === undefined || raw === null || raw === '') return ''

  if (field.type === 'boolean') return raw ? 'Oui' : 'Non'
  if (field.type === 'date') {
    const date = new Date(String(raw))
    return Number.isNaN(date.getTime())
      ? String(raw)
      : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (field.type === 'tags' || Array.isArray(raw)) {
    return (Array.isArray(raw) ? raw : String(raw).split(',')).join(', ')
  }
  if (field.type === 'rating') {
    const n = Number(raw) || 0
    return `${n}/5`
  }
  return String(raw)
}

function richValue(item: DynamicItem, field?: CustomField): string {
  if (!field) return ''
  return field.type === 'rich-text'
    ? sanitizeHtml(String(item.data[field.name] ?? ''))
    : ''
}

const layoutClass = computed(() => {
  switch (props.section.layout) {
    case 'grid':
      return 'grid gap-5 sm:grid-cols-2 lg:grid-cols-4'
    case 'list':
      return 'flex flex-col gap-4'
    case 'timeline':
      return 'flex flex-col gap-4'
    default:
      return 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
  }
})
</script>

<template>
  <section :id="section.slug" class="section-pf">
    <div class="container-pf">
      <SectionHeader :title="section.name" :index="index" />

      <!-- Vue tableau : plus lisible pour des données très structurées. -->
      <div v-if="section.layout === 'table'" v-reveal class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr :style="{ borderBottom: '2px solid var(--c-border)' }">
              <th
                v-for="field in section.fields"
                :key="field.name"
                class="px-4 py-3 font-semibold"
                scope="col"
              >
                {{ field.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in section.items"
              :key="item.id"
              :style="{ borderBottom: '1px solid var(--c-border)' }"
            >
              <td
                v-for="field in section.fields"
                :key="field.name"
                class="px-4 py-3"
                :style="{ color: 'var(--c-text-muted)' }"
              >
                <img
                  v-if="field.type === 'image' && item.data[field.name]"
                  :src="String(item.data[field.name])"
                  :alt="field.label"
                  loading="lazy"
                  class="h-10 w-10 rounded-theme-sm object-cover"
                />
                <a
                  v-else-if="field.type === 'url' && item.data[field.name]"
                  :href="String(item.data[field.name])"
                  target="_blank"
                  rel="noopener noreferrer"
                  :style="{ color: 'var(--c-primary)' }"
                >
                  Ouvrir <ExternalLink :size="14" class="-mt-0.5 inline" />
                </a>
                <span v-else-if="field.type === 'rating'">
                  <Star
                    v-for="n in 5"
                    :key="n"
                    aria-hidden="true"
                    :size="14"
                    class="inline"
                    :fill="n <= (item.data[field.name] as number || 0) ? 'var(--c-primary)' : 'transparent'"
                    :color="n <= (item.data[field.name] as number || 0) ? 'var(--c-primary)' : 'var(--c-border)'"
                  />
                </span>
                <span v-else>{{ value(item, field) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Vue cartes / grille / liste / chronologie -->
      <div v-else :class="layoutClass">
        <article
          v-for="(item, i) in section.items"
          :key="item.id"
          v-reveal="i * 60"
          class="card-pf overflow-hidden"
          :class="section.layout === 'list' ? 'flex items-center gap-5 p-5' : 'flex flex-col'"
        >
          <img
            v-if="mediaField && item.data[mediaField.name]"
            :src="String(item.data[mediaField.name])"
            :alt="value(item, titleField) || section.name"
            loading="lazy"
            decoding="async"
            :class="
              section.layout === 'list'
                ? 'h-16 w-16 shrink-0 rounded-theme-sm object-cover'
                : 'aspect-[16/10] w-full object-cover'
            "
          />

          <div :class="section.layout === 'list' ? 'min-w-0 flex-1' : 'flex flex-1 flex-col p-6'">
            <h3 v-if="titleField" class="text-lg leading-snug">
              {{ value(item, titleField) }}
            </h3>

            <p
              v-if="subtitleField && value(item, subtitleField)"
              class="mt-1 text-sm"
              :style="{ color: 'var(--c-primary)' }"
            >
              {{ value(item, subtitleField) }}
            </p>

            <div
              v-if="bodyField && bodyField.type === 'rich-text'"
              class="mt-3 text-sm leading-relaxed"
              :style="{ color: 'var(--c-text-muted)' }"
              v-html="richValue(item, bodyField)"
            />
            <p
              v-else-if="bodyField && value(item, bodyField)"
              class="mt-3 flex-1 text-sm leading-relaxed"
              :style="{ color: 'var(--c-text-muted)' }"
            >
              {{ value(item, bodyField) }}
            </p>

            <dl v-if="metaFields.length" class="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
              <div v-for="field in metaFields" :key="field.name" class="flex gap-1.5">
                <template v-if="value(item, field)">
                  <dt :style="{ color: 'var(--c-text-muted)' }">{{ field.label }} :</dt>
                  <dd v-if="field.type === 'rating'" class="font-medium">
                    <Star
                      v-for="n in 5"
                      :key="n"
                      aria-hidden="true"
                      :size="12"
                      class="inline"
                      :fill="n <= (item.data[field.name] as number || 0) ? 'var(--c-primary)' : 'transparent'"
                      :color="n <= (item.data[field.name] as number || 0) ? 'var(--c-primary)' : 'var(--c-border)'"
                    />
                  </dd>
                  <dd v-else class="font-medium">{{ value(item, field) }}</dd>
                </template>
              </div>
            </dl>

            <a
              v-if="linkField && item.data[linkField.name]"
              :href="String(item.data[linkField.name])"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-4 inline-block text-sm font-semibold"
              :style="{ color: 'var(--c-primary)' }"
            >
              {{ linkField.label }} <ExternalLink :size="14" class="-mt-0.5 inline" />
            </a>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
