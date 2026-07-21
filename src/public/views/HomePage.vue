<script setup lang="ts">
import { computed, onMounted, nextTick, watch } from 'vue'
import { AlertTriangle } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { usePortfolioStore } from '../store/portfolioStore'
import { useEngagement } from '@shared/composables/useEngagement'

import NavBar from '../components/NavBar.vue'
import SiteFooter from '../components/SiteFooter.vue'
import HeroSection from '../components/HeroSection.vue'
import AboutSection from '../components/AboutSection.vue'
import SkillsSection from '../components/SkillsSection.vue'
import ProjectsSection from '../components/ProjectsSection.vue'
import ExperienceSection from '../components/ExperienceSection.vue'
import EducationSection from '../components/EducationSection.vue'
import TestimonialsSection from '../components/TestimonialsSection.vue'
import MiscSections from '../components/MiscSections.vue'
import CustomSectionRenderer from '../components/CustomSectionRenderer.vue'
import ContactSection from '../components/ContactSection.vue'
import EngagementSection from '../components/EngagementSection.vue'

const store = usePortfolioStore()
const { data, loading, error } = storeToRefs(store)
const { trackView } = useEngagement()

watch(data, (value) => {
  if (!value?.branding.favicon) return
  let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = value.branding.favicon
})

/** Liens de navigation construits à partir des seules sections réellement remplies. */
const navLinks = computed(() => {
  if (!data.value) return []

  const labels: Record<string, string> = {
    about: 'À propos',
    skills: 'Compétences',
    projects: 'Projets',
    experience: 'Expérience',
    education: 'Formation',
    testimonials: 'Témoignages',
    articles: 'Articles',
    timeline: 'Parcours',
    gallery: 'Galerie',
  }

  const links = store.activeSections
    .filter((s) => s.kind === 'native' && labels[s.key])
    .map((s) => ({ id: s.key, label: labels[s.key]! }))

  const custom = store.activeSections
    .filter((s) => s.kind === 'custom')
    .map((s) => ({ id: s.key, label: (s as { section: { name: string } }).section.name }))

  return [...links, ...custom, { id: 'contact', label: 'Contact' }]
})

/** Numérotation continue des sections, y compris les sections dynamiques. */
function sectionIndex(id: string): number {
  return store.activeSections.findIndex((s) => s.id === id) + 1
}

onMounted(async () => {
  await store.load()

  // La vue n'est comptée qu'après un chargement réussi, pour ne pas gonfler
  // les statistiques avec des pages en erreur.
  if (!error.value) void trackView('/')

  // Les sections n'existent qu'après le chargement des données : au moment où
  // le routeur traite le hash, la cible est encore absente du DOM et le saut
  // échoue silencieusement. On le rejoue donc ici, une fois le rendu terminé —
  // sinon tout lien partagé vers une ancre atterrirait en haut de page.
  const hash = window.location.hash
  if (!hash) return

  await nextTick()
  document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
</script>

<template>
  <!--
    Racine unique obligatoire : App.vue enveloppe la vue dans <Transition>,
    qui ne sait animer qu'un seul élément. Sans ce conteneur, Vue émet
    « renders non-element root node » et la transition est ignorée.
  -->
  <div>
    <!-- ---------------- Chargement ---------------- -->
    <div v-if="loading" class="grid min-h-svh place-items-center" role="status" aria-live="polite">
    <div class="text-center">
      <div
        aria-hidden="true"
        class="animate-spin-slow mx-auto mb-5 h-12 w-12 rounded-full border-2 border-transparent"
        :style="{ borderTopColor: 'var(--c-primary)', borderRightColor: 'var(--c-primary)' }"
      />
      <p class="text-sm" :style="{ color: 'var(--c-text-muted)' }">Chargement du portfolio…</p>
    </div>
  </div>

  <!-- ---------------- Erreur ---------------- -->
  <div v-else-if="error || !data" class="grid min-h-svh place-items-center px-6">
    <div class="max-w-md text-center">
      <AlertTriangle aria-hidden="true" class="mb-4" :size="48" :style="{ color: 'var(--c-primary)' }" />
      <h1 class="mb-3 text-2xl">Portfolio momentanément indisponible</h1>
      <p class="mb-6 text-sm" :style="{ color: 'var(--c-text-muted)' }">
        {{ error || 'Aucune donnée à afficher.' }}
      </p>
      <button type="button" class="btn-pf btn-primary" @click="store.load()">Réessayer</button>
    </div>
  </div>

  <!-- ---------------- Portfolio ---------------- -->
  <template v-else>
    <NavBar :name="data.personal.name" :logo="data.branding.logo" :links="navLinks" />

    <HeroSection :data="data" />

    <main id="main">
      <template v-for="entry in store.activeSections" :key="entry.id">
        <AboutSection
          v-if="entry.kind === 'native' && entry.key === 'about'"
          :about="data.about"
          :stats="data.stats"
          :index="sectionIndex(entry.id)"
        />

        <SkillsSection
          v-else-if="entry.kind === 'native' && entry.key === 'skills'"
          :title="data.skills.title"
          :subtitle="data.skills.subtitle"
          :categories="data.skills.categories"
          :index="sectionIndex(entry.id)"
        />

        <ProjectsSection
          v-else-if="entry.kind === 'native' && entry.key === 'projects'"
          :title="data.projects.title"
          :subtitle="data.projects.subtitle"
          :items="data.projects.items"
          :index="sectionIndex(entry.id)"
        />

        <ExperienceSection
          v-else-if="entry.kind === 'native' && entry.key === 'experience'"
          :title="data.experience.title"
          :subtitle="data.experience.subtitle"
          :items="data.experience.items"
          :index="sectionIndex(entry.id)"
        />

        <EducationSection
          v-else-if="entry.kind === 'native' && entry.key === 'education'"
          :title="data.education.title"
          :subtitle="data.education.subtitle"
          :items="data.education.items"
          :index="sectionIndex(entry.id)"
        />

        <TestimonialsSection
          v-else-if="entry.kind === 'native' && entry.key === 'testimonials'"
          :title="data.testimonials.title"
          :subtitle="data.testimonials.subtitle"
          :items="data.testimonials.items"
          :index="sectionIndex(entry.id)"
        />

        <MiscSections
          v-else-if="
            entry.kind === 'native' &&
            (entry.key === 'articles' || entry.key === 'timeline' || entry.key === 'gallery')
          "
          :kind="entry.key"
          :title="data[entry.key].title"
          :subtitle="data[entry.key].subtitle"
          :items="data[entry.key].items"
          :index="sectionIndex(entry.id)"
        />

        <!-- Sections créées depuis l'admin, rendues génériquement. -->
        <CustomSectionRenderer
          v-else-if="entry.kind === 'custom'"
          :section="entry.section"
          :index="sectionIndex(entry.id)"
        />
      </template>

      <EngagementSection
        v-if="
          data.engagement.likesEnabled ||
          data.engagement.commentsEnabled ||
          data.engagement.ratingsEnabled
        "
        :config="data.engagement"
      />

      <ContactSection v-if="data.contact.enabled" :contact="data.contact" />
    </main>

    <SiteFooter :name="data.personal.name" :footer-text="data.branding.footerText" />
    </template>
  </div>
</template>
