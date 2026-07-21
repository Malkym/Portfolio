<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  name: string
  logo?: string
  links: { id: string; label: string }[]
}>()

const MAX_VISIBLE = 6

const scrolled = ref(false)
const open = ref(false)
const moreOpen = ref(false)
const current = ref('')

let observer: IntersectionObserver | null = null

const contactLink = computed(() => props.links.find((l) => l.id === 'contact'))

const mainLinks = computed(() => {
  const withoutContact = props.links.filter((l) => l.id !== 'contact')
  return withoutContact.slice(0, MAX_VISIBLE)
})

const extraLinks = computed(() => {
  const withoutContact = props.links.filter((l) => l.id !== 'contact')
  return withoutContact.slice(MAX_VISIBLE)
})

const hasMore = computed(() => extraLinks.value.length > 0)

function onScroll() {
  scrolled.value = window.scrollY > 40
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) current.value = entry.target.id
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  )

  for (const link of props.links) {
    const el = document.getElementById(link.id)
    if (el) observer.observe(el)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  observer?.disconnect()
})

function go(id: string) {
  open.value = false
  moreOpen.value = false
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <header
    class="no-print fixed inset-x-0 top-0 z-50 transition-all duration-300"
    :style="
      scrolled
        ? {
            background: 'color-mix(in srgb, var(--c-bg) 82%, transparent)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: '1px solid var(--c-border)',
          }
        : { background: 'transparent', borderBottom: '1px solid transparent' }
    "
  >
    <nav class="container-pf flex h-[68px] items-center justify-between" aria-label="Navigation principale">
      <a href="#hero" class="flex items-center gap-2.5 font-head text-lg font-bold" @click.prevent="go('hero')">
        <img v-if="logo" :src="logo" :alt="name" class="h-8 w-auto max-h-8 object-contain" />
        <span v-else class="text-gradient">{{ name }}</span>
      </a>

      <ul class="hidden items-center gap-1 md:flex">
        <li v-for="link in mainLinks" :key="link.id">
          <a
            :href="`#${link.id}`"
            class="relative rounded-theme-sm px-3.5 py-2 text-sm font-medium transition-colors"
            :style="{ color: current === link.id ? 'var(--c-primary)' : 'var(--c-text-muted)' }"
            :aria-current="current === link.id ? 'true' : undefined"
            @click.prevent="go(link.id)"
          >
            {{ link.label }}
            <span
              v-if="current === link.id"
              aria-hidden="true"
              class="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full"
              :style="{ background: 'var(--c-primary)' }"
            />
          </a>
        </li>

        <li v-if="hasMore" class="relative" @mouseenter="moreOpen = true" @mouseleave="moreOpen = false">
          <button
            type="button"
            class="flex items-center gap-1 rounded-theme-sm px-3.5 py-2 text-sm font-medium transition-colors"
            :style="{ color: 'var(--c-text-muted)' }"
            :aria-expanded="moreOpen"
          >
            Plus
            <svg :class="moreOpen ? 'rotate-180' : ''" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="transition-transform"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <Transition name="fade">
            <ul
              v-if="moreOpen"
              class="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border py-1 shadow-xl"
              :style="{ background: 'var(--c-bg)', borderColor: 'var(--c-border)' }"
            >
              <li v-for="link in extraLinks" :key="link.id">
                <a
                  :href="`#${link.id}`"
                  class="block px-4 py-2.5 text-sm transition-colors"
                  :style="{
                    color: current === link.id ? 'var(--c-primary)' : 'var(--c-text)',
                    background: current === link.id ? 'var(--c-surface-alt)' : 'transparent',
                  }"
                  @click.prevent="go(link.id)"
                >
                  {{ link.label }}
                </a>
              </li>
            </ul>
          </Transition>
        </li>

        <li v-if="contactLink">
          <a
            :href="`#${contactLink.id}`"
            class="btn-pf btn-primary !rounded-theme-sm !px-4 !py-2 text-sm font-medium"
            :aria-current="current === contactLink.id ? 'true' : undefined"
            @click.prevent="go(contactLink.id)"
          >
            {{ contactLink.label }}
          </a>
        </li>
      </ul>

      <button
        type="button"
        class="grid h-10 w-10 place-items-center md:hidden"
        :aria-expanded="open"
        aria-controls="mobile-nav"
        :aria-label="open ? 'Fermer le menu' : 'Ouvrir le menu'"
        @click="open = !open"
      >
        <span class="relative block h-4 w-6">
          <span
            v-for="(offset, i) in [0, 7, 14]"
            :key="i"
            aria-hidden="true"
            class="absolute left-0 h-0.5 w-full rounded transition-all duration-300"
            :style="{
              background: 'var(--c-text)',
              top: `${offset}px`,
              transform: open
                ? i === 0
                  ? 'translateY(7px) rotate(45deg)'
                  : i === 2
                    ? 'translateY(-7px) rotate(-45deg)'
                    : 'scaleX(0)'
                : 'none',
              opacity: open && i === 1 ? 0 : 1,
            }"
          />
        </span>
      </button>
    </nav>

    <Transition name="slide">
      <ul
        v-if="open"
        id="mobile-nav"
        class="container-pf overflow-hidden pb-5 md:hidden"
        :style="{ background: 'var(--c-bg)', borderBottom: '1px solid var(--c-border)' }"
      >
        <li v-for="link in links" :key="link.id">
          <a
            :href="`#${link.id}`"
            class="block border-b px-1 py-3.5 text-sm"
            :style="{
              borderColor: 'var(--c-border)',
              color: current === link.id ? 'var(--c-primary)' : 'var(--c-text)',
            }"
            @click.prevent="go(link.id)"
          >
            {{ link.label }}
          </a>
        </li>
      </ul>
    </Transition>
  </header>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: max-height 300ms var(--t-ease), opacity 220ms var(--t-ease);
  max-height: 60vh;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
