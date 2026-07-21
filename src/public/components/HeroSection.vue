<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import type { PortfolioData } from '@shared/types/portfolio.types'

const props = defineProps<{ data: PortfolioData }>()

/* ---------------- Effet machine à écrire ---------------- */

const typed = ref('')
const wordIndex = ref(0)
const deleting = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

const words = computed(() =>
  props.data.hero.typedWords?.length ? props.data.hero.typedWords : [props.data.personal.title],
)

function tick() {
  const word = words.value[wordIndex.value % words.value.length] ?? ''

  if (deleting.value) {
    typed.value = word.slice(0, typed.value.length - 1)
    if (!typed.value) {
      deleting.value = false
      wordIndex.value++
    }
  } else {
    typed.value = word.slice(0, typed.value.length + 1)
    // Pause en fin de mot : sans elle, le texte est illisible.
    if (typed.value === word) {
      timer = setTimeout(() => {
        deleting.value = true
        tick()
      }, 1800)
      return
    }
  }

  timer = setTimeout(tick, deleting.value ? 40 : 85)
}

onMounted(() => {
  // On respecte le réglage système : ce texte bouge en permanence, c'est
  // exactement le type d'animation qui gêne les personnes sensibles au mouvement.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || words.value.length === 0) {
    typed.value = words.value[0] ?? ''
    return
  }
  tick()
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

const initials = computed(() =>
  props.data.personal.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)
</script>

<template>
  <section id="hero" class="relative flex min-h-[92svh] items-center overflow-hidden">
    <!-- Fond décoratif, purement visuel : masqué aux lecteurs d'écran. -->
    <div
      v-if="data.hero.background === 'gradient'"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 opacity-30"
      :style="{ background: 'var(--c-gradient)', filter: 'blur(120px)' }"
    />

    <video
      v-else-if="data.hero.background === 'video' && data.hero.backgroundMedia"
      :src="data.hero.backgroundMedia"
      autoplay
      muted
      loop
      playsinline
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
    />

    <img
      v-else-if="data.hero.background === 'image' && data.hero.backgroundMedia"
      :src="data.hero.backgroundMedia"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
    />

    <div class="container-pf relative z-10 grid items-center gap-14 py-24 md:grid-cols-[1.35fr,1fr]">
      <div>
        <p v-reveal class="chip-pf mb-6">
          <span class="mr-2 inline-block h-2 w-2 rounded-full" :style="{ background: 'var(--c-primary)' }" />
          Disponible pour de nouveaux projets
        </p>

        <h1 v-reveal="80" class="mb-5 text-[clamp(2.4rem,6.5vw,4.75rem)] leading-[1.05]">
          <span class="block opacity-70 text-[0.42em] font-normal tracking-widest uppercase mb-3">
            Bonjour, je suis
          </span>
          <span class="text-gradient">{{ data.personal.name }}</span>
        </h1>

        <!--
          aria-live="off" + le texte complet dans un span visuellement masqué :
          l'animation reste décorative, mais le rôle réel est annoncé une
          seule fois, proprement, au lieu d'être épelé lettre par lettre.
        -->
        <p v-reveal="160" class="mb-6 min-h-[2.4em] text-[clamp(1.15rem,2.6vw,1.9rem)] font-medium">
          <span class="sr-only">{{ data.personal.title }}</span>
          <span aria-hidden="true">
            {{ typed }}<span class="caret" :style="{ color: 'var(--c-primary)' }">|</span>
          </span>
        </p>

        <p v-reveal="240" class="mb-9 max-w-xl text-lg leading-relaxed" :style="{ color: 'var(--c-text-muted)' }">
          {{ data.hero.subtitle }}
        </p>

        <div v-reveal="320" class="flex flex-wrap gap-4">
          <a v-if="data.hero.ctaText" :href="data.hero.ctaLink" class="btn-pf btn-primary">
            {{ data.hero.ctaText }}
          </a>
          <a
            v-if="data.hero.ctaSecondaryText"
            :href="data.hero.ctaSecondaryLink"
            class="btn-pf btn-ghost"
          >
            {{ data.hero.ctaSecondaryText }}
          </a>
          <a
            v-if="data.personal.resumeUrl"
            :href="data.personal.resumeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-pf btn-ghost"
          >
            Télécharger mon CV
          </a>
        </div>
      </div>

      <div v-reveal="200" class="justify-self-center">
        <div class="animate-float relative">
          <div
            aria-hidden="true"
            class="absolute -inset-5 rounded-full opacity-45 blur-3xl"
            :style="{ background: 'var(--c-gradient)' }"
          />
          <img
            v-if="data.personal.photo"
            :src="data.personal.photo"
            :alt="`Portrait de ${data.personal.name}`"
            width="320"
            height="320"
            loading="eager"
            fetchpriority="high"
            class="relative h-[clamp(190px,34vw,320px)] w-[clamp(190px,34vw,320px)] rounded-full object-cover"
            :style="{ border: '3px solid var(--c-primary)', boxShadow: 'var(--sh-lg)' }"
          />
          <!-- Sans photo, on affiche les initiales plutôt qu'un trou. -->
          <div
            v-else
            aria-hidden="true"
            class="relative grid h-[clamp(190px,34vw,320px)] w-[clamp(190px,34vw,320px)] place-items-center rounded-full text-[clamp(3.5rem,9vw,6rem)] font-bold"
            :style="{
              background: 'var(--c-surface)',
              border: '3px solid var(--c-primary)',
              color: 'var(--c-primary)',
              boxShadow: 'var(--sh-lg)',
            }"
          >
            {{ initials }}
          </div>
        </div>
      </div>
    </div>

    <a
      href="#main"
      aria-label="Faire défiler vers le contenu"
      class="no-print absolute bottom-8 left-1/2 -translate-x-1/2 opacity-60 transition-opacity hover:opacity-100"
    >
      <svg width="26" height="42" viewBox="0 0 26 42" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="24" height="40" rx="12" stroke="currentColor" stroke-width="2" />
        <circle cx="13" cy="12" r="3.5" fill="currentColor" class="animate-float" />
      </svg>
    </a>
  </section>
</template>
