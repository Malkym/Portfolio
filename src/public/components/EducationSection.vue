<script setup lang="ts">
import { GraduationCap } from '@lucide/vue'
import SectionHeader from './SectionHeader.vue'
import type { Education } from '@shared/types/portfolio.types'

defineProps<{ title: string; subtitle?: string; items: Education[]; index?: number }>()
</script>

<template>
  <section id="education" class="section-pf" :style="{ background: 'var(--c-surface-alt)' }">
    <div class="container-pf">
      <SectionHeader :title="title" :subtitle="subtitle" :index="index" />

      <div class="grid gap-6 md:grid-cols-2">
        <article
          v-for="(item, i) in items"
          :key="item.id"
          v-reveal="i * 80"
          class="card-pf flex gap-5 p-6"
        >
          <img
            v-if="item.logo"
            :src="item.logo"
            :alt="`Logo ${item.school}`"
            loading="lazy"
            class="h-14 w-14 shrink-0 rounded-theme-sm object-contain"
          />
          <div
            v-else
            aria-hidden="true"
            class="grid h-14 w-14 shrink-0 place-items-center rounded-theme-sm"
            :style="{ background: 'var(--c-surface-alt)', color: 'var(--c-primary)' }"
          >
            <GraduationCap :size="28" />
          </div>

          <div class="min-w-0">
            <h3 class="text-lg leading-tight">{{ item.degree }}</h3>
            <p class="text-sm" :style="{ color: 'var(--c-primary)' }">{{ item.school }}</p>
            <p class="mt-0.5 font-mono text-xs" :style="{ color: 'var(--c-text-muted)' }">
              {{ item.startYear }}<span v-if="item.endYear"> — {{ item.endYear }}</span>
              <span v-if="item.field"> · {{ item.field }}</span>
            </p>
            <p
              v-if="item.description"
              class="mt-3 text-sm leading-relaxed"
              :style="{ color: 'var(--c-text-muted)' }"
            >
              {{ item.description }}
            </p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
