<script setup lang="ts">
import { ref, computed } from 'vue'
import { Star, ExternalLink } from '@lucide/vue'
import SectionHeader from './SectionHeader.vue'
import type { Project } from '@shared/types/portfolio.types'

const props = defineProps<{
  title: string
  subtitle?: string
  items: Project[]
  index?: number
}>()

const filter = ref<string>('tous')

/** Tags réellement présents dans les projets — jamais une liste codée en dur. */
const tags = computed(() => {
  const set = new Set<string>()
  for (const project of props.items) {
    for (const tag of project.tags ?? []) set.add(tag)
  }
  return ['tous', ...[...set].sort()]
})

const visible = computed(() =>
  filter.value === 'tous'
    ? props.items
    : props.items.filter((p) => p.tags?.includes(filter.value)),
)

function period(project: Project): string {
  if (!project.startDate) return ''
  const year = (d: string) => d.slice(0, 4)
  return project.endDate
    ? `${year(project.startDate)} — ${year(project.endDate)}`
    : `Depuis ${year(project.startDate)}`
}
</script>

<template>
  <section id="projects" class="section-pf">
    <div class="container-pf">
      <SectionHeader :title="title" :subtitle="subtitle" :index="index" />

      <!-- Le filtre n'apparaît que s'il sert vraiment à quelque chose. -->
      <div v-if="tags.length > 2" v-reveal class="mb-12 flex flex-wrap justify-center gap-2">
        <button
          v-for="tag in tags"
          :key="tag"
          class="chip-pf cursor-pointer capitalize transition-colors"
          :style="
            filter === tag
              ? { background: 'var(--c-primary)', color: 'var(--c-bg)', borderColor: 'var(--c-primary)' }
              : {}
          "
          :aria-pressed="filter === tag"
          @click="filter = tag"
        >
          {{ tag }}
        </button>
      </div>

      <div class="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="(project, i) in visible"
          :key="project.id"
          v-reveal="i * 70"
          class="card-pf group flex flex-col overflow-hidden"
        >
          <div v-if="project.image" class="relative aspect-[16/10] overflow-hidden">
            <img
              :src="project.image"
              :alt="`Aperçu du projet ${project.title}`"
              loading="lazy"
              decoding="async"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span
              v-if="project.featured"
              class="absolute right-3 top-3 chip-pf"
              :style="{ background: 'var(--c-primary)', color: 'var(--c-bg)' }"
            >
              <Star :size="14" class="-mt-0.5 inline" /> Mis en avant
            </span>
          </div>

          <div class="flex flex-1 flex-col p-6">
            <div class="mb-3 flex items-start justify-between gap-3">
              <h3 class="text-xl">{{ project.title }}</h3>
              <span
                v-if="period(project)"
                class="shrink-0 font-mono text-xs"
                :style="{ color: 'var(--c-text-muted)' }"
              >
                {{ period(project) }}
              </span>
            </div>

            <p class="mb-5 flex-1 text-sm leading-relaxed" :style="{ color: 'var(--c-text-muted)' }">
              {{ project.description }}
            </p>

            <ul v-if="project.technologies?.length" class="mb-5 flex flex-wrap gap-1.5">
              <li v-for="tech in project.technologies" :key="tech" class="chip-pf text-[0.7rem]">
                {{ tech }}
              </li>
            </ul>

            <div class="flex gap-3 text-sm font-semibold">
              <a
                v-if="project.demoUrl"
                :href="project.demoUrl"
                target="_blank"
                rel="noopener noreferrer"
                :style="{ color: 'var(--c-primary)' }"
                :aria-label="`Voir la démo de ${project.title}`"
              >
                Démo <ExternalLink :size="14" class="-mt-0.5 inline" />
              </a>
              <a
                v-if="project.repoUrl"
                :href="project.repoUrl"
                target="_blank"
                rel="noopener noreferrer"
                :style="{ color: 'var(--c-text-muted)' }"
                :aria-label="`Voir le code de ${project.title}`"
              >
                Code <ExternalLink :size="14" class="-mt-0.5 inline" />
              </a>
            </div>
          </div>
        </article>
      </div>

      <p
        v-if="!visible.length"
        class="py-14 text-center"
        :style="{ color: 'var(--c-text-muted)' }"
      >
        Aucun projet ne correspond à ce filtre.
      </p>
    </div>
  </section>
</template>
