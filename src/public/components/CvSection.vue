<script setup lang="ts">
import { ref } from 'vue'
import DynamicIcon from '../../shared/components/DynamicIcon.vue'
import SectionHeader from './SectionHeader.vue'
import { useCVExport } from '@shared/composables/useCV'
import type { CVPublicBrief } from '@shared/types/cv.types'

/**
 * Vitrine où l'aperçu et le PDF viennent des mêmes données que la page
 * publique : « Voir le CV » mène à la page complète, « Télécharger » la
 * version papier. La section n'existe que si au moins un CV est publié.
 */
const props = defineProps<{ cvs: CVPublicBrief[]; index?: number }>()

const { downloadPublicPDF } = useCVExport()
const busySlug = ref<string | null>(null)
const error = ref('')

async function download(slug: string) {
  error.value = ''
  busySlug.value = slug
  try {
    await downloadPublicPDF(slug)
  } catch {
    error.value = 'Le PDF n’a pas pu être généré. Réessayez dans un instant.'
  } finally {
    busySlug.value = null
  }
}

function briefName(cv: CVPublicBrief): string {
  return cv.name || cv.title
}
</script>

<template>
  <section v-if="props.cvs.length" id="cv" class="section-pf" :style="{ background: 'var(--c-surface-alt)' }">
    <div class="container-pf">
      <SectionHeader
        title="CV en ligne"
        subtitle="Mon parcours détaillé, prêt à consulter ou à télécharger."
        :index="props.index"
      />

      <div :class="props.cvs.length > 1 ? 'grid gap-7 md:grid-cols-2' : 'mx-auto max-w-xl'">
        <article v-for="cv in props.cvs" :key="cv.id" v-reveal class="card-pf flex flex-col gap-4 p-7">
          <div class="min-w-0">
            <p class="font-mono text-xs tracking-[0.25em]" :style="{ color: 'var(--c-primary)' }">
              Curriculum vitæ
            </p>
            <h3 class="mt-2 text-xl">{{ briefName(cv) }}</h3>
            <p v-if="cv.role" class="mt-1 text-sm" :style="{ color: 'var(--c-primary)' }">
              {{ cv.role }}
            </p>
            <p v-if="cv.excerpt" class="mt-3 text-sm leading-relaxed" :style="{ color: 'var(--c-text-muted)' }">
              {{ cv.excerpt }}
            </p>
          </div>

          <div class="mt-auto flex flex-wrap gap-3 pt-3">
            <RouterLink :to="`/cv/${cv.slug}`" class="btn-pf btn-primary">
              <DynamicIcon name="user" :size="16" aria-hidden="true" /> Voir le CV
            </RouterLink>
            <button
              type="button"
              class="btn-pf btn-ghost"
              :disabled="busySlug === cv.slug"
              @click="download(cv.slug)"
            >
              <DynamicIcon :name="busySlug === cv.slug ? 'loader' : 'download'" :size="16" aria-hidden="true" />
              Télécharger le CV en PDF
            </button>
          </div>
        </article>
      </div>

      <p v-if="error" role="alert" class="mt-4 text-sm" style="color: #e5484d">{{ error }}</p>
    </div>
  </section>
</template>
