<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@vueuse/head'
import { useCVThemes, useCVExport } from '@shared/composables/useCV'
import { api } from '@shared/utils/api'
import { renderCVRichText } from '@shared/utils/cvRichText'
import CVDocumentPreview from '@shared/components/CVDocumentPreview.vue'
import type { PublicCVView } from '@shared/types/cv.types'
import DynamicIcon from '@shared/components/DynamicIcon.vue'

const route = useRoute()
const { load: loadThemes, get: getTheme } = useCVThemes()
const { downloadPublicPDF, downloading } = useCVExport()
const cv = ref<PublicCVView | null>(null)
const loading = ref(true)
const error = ref('')
const downloadError = ref('')
const theme = computed(() => getTheme(cv.value?.meta.themeId ?? '') ?? getTheme('clean-white'))
const header = computed(() => cv.value?.sections.find(s => s.type === 'header')?.data ?? {})
const summary = computed(() => {
  const section = cv.value?.sections.find(s => s.type === 'summary')
  return renderCVRichText(section?.content ?? section?.data.content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)
})
let generation = 0
watch(() => route.params.slug, async slug => {
  const current = ++generation
  loading.value = true
  error.value = ''
  downloadError.value = ''
  cv.value = null
  try {
    const [result] = await Promise.all([api.get<PublicCVView>(`/cv/public/${encodeURIComponent(String(slug))}`), loadThemes()])
    if (current === generation) cv.value = result
  } catch (e) { if (current === generation) error.value = e instanceof Error ? e.message : 'Le CV ne peut pas être chargé.' }
  finally { if (current === generation) loading.value = false }
}, { immediate: true })

useHead(computed(() => ({
  title: cv.value?.meta.title ?? 'CV',
  meta: [{ name: 'description', content: summary.value }, { property: 'og:title', content: cv.value?.meta.title ?? 'CV' }, { property: 'og:description', content: summary.value }],
  script: cv.value ? [{ type: 'application/ld+json', children: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: header.value.name, jobTitle: header.value.title }).replace(/</g, '\\u003c') }] : [],
})))

async function download() {
  downloadError.value = ''
  try { await downloadPublicPDF(String(route.params.slug)) }
  catch (e) { downloadError.value = e instanceof Error ? e.message : 'Le PDF n’a pas pu être généré. Réessayez.' }
}
</script>

<template>
  <div class="cv-public-page">
    <nav class="cv-public-nav" aria-label="Navigation du CV">
      <RouterLink to="/">← Retour au portfolio</RouterLink>
      <button v-if="cv" type="button" :disabled="downloading" @click="download"><DynamicIcon name="download" :size="16"/>{{ downloading ? 'Génération du PDF…' : 'Télécharger en PDF' }}</button>
    </nav>
    <main id="main" class="cv-public-main">
      <p v-if="loading" class="cv-public-message" role="status">Chargement du CV…</p>
      <div v-else-if="error" class="cv-public-message" role="alert"><h1>CV indisponible</h1><p>Ce CV n’est pas publié ou n’existe plus.</p><RouterLink to="/">Découvrir le portfolio</RouterLink></div>
      <template v-else-if="cv && theme">
        <p v-if="downloadError" class="cv-public-error" role="alert">{{ downloadError }} <button type="button" @click="download">Réessayer</button></p>
        <CVDocumentPreview :cv="cv" :theme="theme" :paper="false" title="CV publié" />
      </template>
    </main>
    <footer class="cv-public-footer">Un parcours, des projets, une prochaine rencontre.</footer>
  </div>
</template>

<style scoped>
.cv-public-page{min-height:100vh;background:#e8ecf1;color:#25334c;font-family:system-ui,sans-serif}.cv-public-nav{max-width:1040px;margin:auto;padding:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:13px;flex-wrap:wrap}.cv-public-nav a{color:#43516b}.cv-public-nav button{display:flex;align-items:center;gap:8px;background:#233c68;color:white;border-radius:7px;padding:11px 16px;font-weight:500}.cv-public-nav button:disabled{opacity:.6}.cv-public-main{max-width:794px;margin:0 auto}.cv-public-message{padding:90px 24px;text-align:center;line-height:2}.cv-public-message h1{font-size:26px}.cv-public-message a{color:#345fb2;text-decoration:underline}.cv-public-footer{text-align:center;font-size:11px;color:#67758b;padding:30px 16px}.cv-public-error{color:#a12d2d;padding:14px;background:#ffe7e5;margin-bottom:16px}.cv-public-error button{text-decoration:underline}.cv-public-page button:focus-visible,.cv-public-page a:focus-visible{outline:3px solid #4776ef;outline-offset:4px}@media(max-width:480px){.cv-public-nav{padding:16px;font-size:12px}}@media print{.cv-public-nav,.cv-public-footer{display:none}.cv-public-page{background:white}.cv-public-main{max-width:none}}
</style>
