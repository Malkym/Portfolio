<script setup lang="ts">
import { Star } from '@lucide/vue'
import SectionHeader from './SectionHeader.vue'
import type { Testimonial } from '@shared/types/portfolio.types'

defineProps<{ title: string; subtitle?: string; items: Testimonial[]; index?: number }>()

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
</script>

<template>
  <section id="testimonials" class="section-pf">
    <div class="container-pf">
      <SectionHeader :title="title" :subtitle="subtitle" :index="index" />

      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <figure
          v-for="(item, i) in items"
          :key="item.id"
          v-reveal="i * 80"
          class="card-pf flex flex-col p-7"
        >
          <span
            aria-hidden="true"
            class="mb-3 font-head text-5xl leading-none"
            :style="{ color: 'var(--c-primary)', opacity: 0.35 }"
          >
            "
          </span>

          <blockquote class="mb-6 flex-1 text-sm leading-relaxed" :style="{ color: 'var(--c-text-muted)' }">
            {{ item.quote }}
          </blockquote>

          <!-- La note est décorative ici : le texte de secours la restitue. -->
          <div
            v-if="item.rating"
            class="mb-4 flex gap-0.5"
            :aria-label="`Note : ${item.rating} sur 5`"
          >
            <Star
              v-for="n in 5"
              :key="n"
              aria-hidden="true"
              :size="16"
              :fill="n <= item.rating ? 'var(--c-primary)' : 'transparent'"
              :color="n <= item.rating ? 'var(--c-primary)' : 'var(--c-border)'"
            />
          </div>

          <figcaption class="flex items-center gap-3">
            <img
              v-if="item.photo"
              :src="item.photo"
              :alt="`Photo de ${item.name}`"
              loading="lazy"
              class="h-11 w-11 rounded-full object-cover"
            />
            <span
              v-else
              aria-hidden="true"
              class="grid h-11 w-11 place-items-center rounded-full text-sm font-bold"
              :style="{ background: 'var(--c-surface-alt)', color: 'var(--c-primary)' }"
            >
              {{ initials(item.name) }}
            </span>

            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold">{{ item.name }}</span>
              <span class="block truncate text-xs" :style="{ color: 'var(--c-text-muted)' }">
                {{ item.role }}<span v-if="item.company"> · {{ item.company }}</span>
              </span>
            </span>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>
