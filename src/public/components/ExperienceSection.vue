<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import SectionHeader from './SectionHeader.vue'
import type { Experience } from '@shared/types/portfolio.types'

defineProps<{
  title: string
  subtitle?: string
  items: Experience[]
  index?: number
}>()

const MONTHS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

/** "2021-03" → "mars 2021". Tolère un format incomplet ou vide. */
function formatDate(value: string): string {
  if (!value) return ''
  const [year, month] = value.split('-')
  if (!month) return year ?? value
  const label = MONTHS[Number(month) - 1]
  return label ? `${label} ${year}` : value
}

function period(item: Experience): string {
  const start = formatDate(item.startDate)
  const end = item.current ? "aujourd'hui" : formatDate(item.endDate)
  return end ? `${start} → ${end}` : start
}
</script>

<template>
  <section id="experience" class="section-pf">
    <div class="container-pf">
      <SectionHeader :title="title" :subtitle="subtitle" :index="index" />

      <ol class="relative mx-auto max-w-3xl">
        <!-- Ligne verticale du fil chronologique. -->
        <div
          aria-hidden="true"
          class="absolute bottom-4 left-[7px] top-2 w-px md:left-[9px]"
          :style="{ background: 'var(--c-border)' }"
        />

        <li
          v-for="(item, i) in items"
          :key="item.id"
          v-reveal="i * 90"
          class="relative mb-11 pl-9 md:pl-12"
        >
          <span
            aria-hidden="true"
            class="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full ring-4 md:h-[19px] md:w-[19px]"
            :style="{
              background: item.current ? 'var(--c-primary)' : 'var(--c-surface)',
              border: '2px solid var(--c-primary)',
              '--tw-ring-color': 'var(--c-bg)',
            }"
          />

          <div class="card-pf p-6">
            <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <img
                  v-if="item.logo"
                  :src="item.logo"
                  :alt="`Logo ${item.company}`"
                  loading="lazy"
                  class="h-11 w-11 rounded-theme-sm object-contain"
                />
                <div>
                  <h3 class="text-lg leading-tight">{{ item.role }}</h3>
                  <p class="text-sm" :style="{ color: 'var(--c-primary)' }">
                    {{ item.company }}
                    <span v-if="item.location" :style="{ color: 'var(--c-text-muted)' }">
                      · {{ item.location }}
                    </span>
                  </p>
                </div>
              </div>

              <span class="chip-pf shrink-0 font-mono text-[0.7rem]">
                {{ period(item) }}
              </span>
            </div>

            <p
              v-if="item.description"
              class="mb-4 text-sm leading-relaxed"
              :style="{ color: 'var(--c-text-muted)' }"
            >
              {{ item.description }}
            </p>

            <ul v-if="item.achievements?.length" class="mb-4 space-y-1.5 text-sm">
              <li
                v-for="achievement in item.achievements"
                :key="achievement"
                class="flex gap-2.5"
                :style="{ color: 'var(--c-text-muted)' }"
              >
                <ChevronRight aria-hidden="true" :size="14" :style="{ color: 'var(--c-primary)' }" />
                <span>{{ achievement }}</span>
              </li>
            </ul>

            <ul v-if="item.technologies?.length" class="flex flex-wrap gap-1.5">
              <li v-for="tech in item.technologies" :key="tech" class="chip-pf text-[0.7rem]">
                {{ tech }}
              </li>
            </ul>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
