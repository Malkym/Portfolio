<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import type { PublicCVView, CVThemeDefinition } from '../types/cv.types'
import { buildCVHTML } from '../utils/cvHTML'

const props = withDefaults(defineProps<{ cv: PublicCVView; theme: CVThemeDefinition; title?: string; paper?: boolean }>(), { title: 'Aperçu du CV', paper: true })
const host = ref<HTMLElement>()
const frame = ref<HTMLIFrameElement>()
const width = ref(640)
const height = ref(1123)
const scale = computed(() => props.paper ? Math.min(1, width.value / 794) : 1)
const html = computed(() => buildCVHTML(props.cv, props.theme))
let observer: ResizeObserver | undefined
let documentObserver: ResizeObserver | undefined

function measureDocument() {
  const doc = frame.value?.contentDocument
  if (doc) height.value = Math.max(1123, doc.body.scrollHeight, doc.documentElement.scrollHeight)
}
function loaded() {
  documentObserver?.disconnect()
  measureDocument()
  const body = frame.value?.contentDocument?.body
  if (body) {
    documentObserver = new ResizeObserver(measureDocument)
    documentObserver.observe(body)
    void body.ownerDocument.fonts.ready.then(measureDocument)
  }
}
onMounted(() => {
  observer = new ResizeObserver(entries => { width.value = entries[0]?.contentRect.width ?? 640 })
  if (host.value) observer.observe(host.value)
})
onBeforeUnmount(() => { observer?.disconnect(); documentObserver?.disconnect() })
</script>

<template>
  <div ref="host" class="cv-preview-host">
    <div class="cv-preview-paper" :style="{ width: paper ? `${794 * scale}px` : '100%', height: `${height * scale}px` }">
      <iframe ref="frame" :title="title" :srcdoc="html" sandbox="allow-same-origin" class="cv-document-frame"
        :style="{ width: paper ? '794px' : '100%', height: `${height}px`, transform: `scale(${scale})` }" @load="loaded" />
    </div>
  </div>
</template>

<style scoped>
.cv-preview-host{width:100%;min-width:0}.cv-preview-paper{position:relative;margin:0 auto;background:#fff;box-shadow:0 12px 40px #0002;overflow:hidden}.cv-document-frame{display:block;border:0;transform-origin:top left;background:#fff}
</style>
