<script setup lang="ts">
import { computed } from 'vue'
import { Star } from '@lucide/vue'
import DynamicIcon from '../../shared/components/DynamicIcon.vue'
import SectionHeader from './SectionHeader.vue'
import { sanitizeHtml } from '@shared/utils/sanitize'
import type { PortfolioData } from '@shared/types/portfolio.types'

const props = defineProps<{
  about: PortfolioData['about']
  stats: PortfolioData['stats']
  index?: number
}>()

const safeContent = computed(() => sanitizeHtml(props.about.content))
</script>

<template>
  <section id="about" class="section-pf">
    <div class="container-pf">
      <SectionHeader :title="about.title" :subtitle="about.subtitle" :index="index" />

      <div class="grid items-start gap-12" :class="about.image ? 'md:grid-cols-2' : ''">
        <div v-if="about.image" v-reveal class="relative">
          <div
            aria-hidden="true"
            class="absolute -inset-3 rounded-theme-lg opacity-20 blur-2xl"
            :style="{ background: 'var(--c-gradient)' }"
          />
          <img
            :src="about.image"
            alt=""
            loading="lazy"
            decoding="async"
            class="relative w-full rounded-theme-lg object-cover"
            :style="{ boxShadow: 'var(--sh-lg)' }"
          />
        </div>

        <div v-reveal="100">
          <!-- Contenu assaini avant injection : voir sanitize.ts. -->
          <div
            class="prose-pf space-y-4 text-lg leading-relaxed"
            :style="{ color: 'var(--c-text-muted)' }"
            v-html="safeContent"
          />

          <ul v-if="about.values?.length" class="mt-8 grid gap-3 sm:grid-cols-2">
            <li
              v-for="value in about.values"
              :key="value"
              class="flex items-center gap-3 text-sm"
            >
              <span
                aria-hidden="true"
                class="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                :style="{ background: 'var(--c-surface-alt)', color: 'var(--c-primary)' }"
              >
                <Star :size="12" />
              </span>
              {{ value }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Les chiffres clés vivent avec le « à propos » : ils le prouvent. -->
      <dl
        v-if="stats.enabled && stats.items.length"
        v-reveal="180"
        class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div
          v-for="stat in stats.items"
          :key="stat.id"
          class="card-pf p-7 text-center"
        >
          <div v-if="stat.icon" aria-hidden="true" class="mb-2">
            <DynamicIcon :name="stat.icon" :size="32" />
          </div>
          <dd class="text-gradient text-[clamp(2rem,5vw,2.8rem)] font-bold leading-none">
            {{ stat.value }}<span v-if="stat.suffix">{{ stat.suffix }}</span>
          </dd>
          <dt class="mt-2 text-sm" :style="{ color: 'var(--c-text-muted)' }">
            {{ stat.label }}
          </dt>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.prose-pf :deep(a) {
  color: var(--c-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.prose-pf :deep(strong) {
  color: var(--c-text);
}

.prose-pf :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}

.prose-pf :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--r-md);
}
</style>
