<script setup lang="ts">
/**
 * Sections courtes regroupées : articles, parcours, galerie.
 * Chacune fait moins de 40 lignes ; les isoler dans trois fichiers
 * n'apporterait que de la navigation en plus.
 */
import DynamicIcon from '../../shared/components/DynamicIcon.vue'
import SectionHeader from './SectionHeader.vue'
import type { Article, TimelineEvent, GalleryItem } from '@shared/types/portfolio.types'

defineProps<{
  kind: 'articles' | 'timeline' | 'gallery'
  title: string
  subtitle?: string
  items: (Article | TimelineEvent | GalleryItem)[]
  index?: number
}>()

const formatDate = (value: string) =>
  value ? new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
</script>

<template>
  <section :id="kind" class="section-pf">
    <div class="container-pf">
      <SectionHeader :title="title" :subtitle="subtitle" :index="index" />

      <!-- ---------------- Articles ---------------- -->
      <div v-if="kind === 'articles'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <a
          v-for="(item, i) in (items as Article[])"
          :key="item.id"
          v-reveal="i * 70"
          :href="item.url || '#'"
          :target="item.url ? '_blank' : undefined"
          rel="noopener noreferrer"
          class="card-pf group flex flex-col overflow-hidden"
        >
          <img
            v-if="item.cover"
            :src="item.cover"
            :alt="`Illustration de l'article ${item.title}`"
            loading="lazy"
            class="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div class="flex flex-1 flex-col p-6">
            <time v-if="item.date" :datetime="item.date" class="mb-2 font-mono text-xs" :style="{ color: 'var(--c-primary)' }">
              {{ formatDate(item.date) }}
            </time>
            <h3 class="mb-2 text-lg leading-snug">{{ item.title }}</h3>
            <p class="mb-4 flex-1 text-sm leading-relaxed" :style="{ color: 'var(--c-text-muted)' }">
              {{ item.excerpt }}
            </p>
            <ul v-if="item.tags?.length" class="flex flex-wrap gap-1.5">
              <li v-for="tag in item.tags" :key="tag" class="chip-pf text-[0.7rem]">{{ tag }}</li>
            </ul>
          </div>
        </a>
      </div>

      <!-- ---------------- Parcours ---------------- -->
      <ol v-else-if="kind === 'timeline'" class="relative mx-auto max-w-2xl">
        <div
          aria-hidden="true"
          class="absolute bottom-3 left-[7px] top-2 w-px"
          :style="{ background: 'var(--c-border)' }"
        />
        <li
          v-for="(item, i) in (items as TimelineEvent[])"
          :key="item.id"
          v-reveal="i * 80"
          class="relative mb-9 pl-9"
        >
          <span
            aria-hidden="true"
            class="absolute left-0 top-1 grid h-[15px] w-[15px] place-items-center"
            :style="{ background: 'var(--c-primary)', color: 'var(--c-bg)' }"
          >
            <DynamicIcon v-if="item.icon" :name="item.icon" :size="10" />
          </span>
          <p class="font-mono text-xs" :style="{ color: 'var(--c-primary)' }">{{ item.date }}</p>
          <h3 class="mt-1 text-lg">{{ item.title }}</h3>
          <p class="mt-1.5 text-sm leading-relaxed" :style="{ color: 'var(--c-text-muted)' }">
            {{ item.description }}
          </p>
        </li>
      </ol>

      <!-- ---------------- Galerie ---------------- -->
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <figure
          v-for="(item, i) in (items as GalleryItem[])"
          :key="item.id"
          v-reveal="i * 60"
          class="card-pf group overflow-hidden"
        >
          <video
            v-if="item.type === 'video'"
            :src="item.media"
            controls
            preload="metadata"
            class="aspect-[4/3] w-full object-cover"
          />
          <img
            v-else
            :src="item.media"
            :alt="item.title || item.caption || ''"
            loading="lazy"
            decoding="async"
            class="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <figcaption v-if="item.title || item.caption" class="p-4">
            <p v-if="item.title" class="text-sm font-semibold">{{ item.title }}</p>
            <p v-if="item.caption" class="text-xs" :style="{ color: 'var(--c-text-muted)' }">
              {{ item.caption }}
            </p>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>
