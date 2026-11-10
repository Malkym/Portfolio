<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import type { PublicCVView, CVThemeDefinition } from '@shared/types/cv.types'

const props = defineProps<{ themes: CVThemeDefinition[]; currentThemeId: string; cvPreview: PublicCVView; readonly?: boolean }>()
const emit = defineEmits<{ 'update:themeId': [string]; previewTheme: [string | null] }>()
const query = ref('')
const scheme = ref('all')
const filtered = computed(() => props.themes.filter(t => `${t.name} ${t.description}`.toLowerCase().includes(query.value.toLowerCase()) && (scheme.value === 'all' || t.scheme === scheme.value)))
let timer: ReturnType<typeof setTimeout> | undefined
function preview(id: string | null) {
  if (timer) clearTimeout(timer)
  if (id) timer = setTimeout(() => emit('previewTheme', id), 150)
  else emit('previewTheme', null)
}
onBeforeUnmount(() => { if (timer) clearTimeout(timer); emit('previewTheme', null) })
</script>

<template>
  <div class="cv-theme-picker">
    <div class="cv-theme-filters">
      <input v-model="query" type="search" class="adm-input" aria-label="Rechercher un thème" placeholder="Rechercher un thème…" />
      <select v-model="scheme" class="adm-input" aria-label="Filtrer les thèmes"><option value="all">Tous les thèmes</option><option value="light">Clairs</option><option value="dark">Sombres</option></select>
    </div>
    <p class="cv-theme-count">{{ filtered.length }} thèmes · Survolez pour essayer, cliquez pour choisir.</p>
    <div class="cv-theme-grid">
      <button v-for="theme in filtered" :key="theme.id" type="button" class="cv-theme-choice" :class="{ selected: theme.id === currentThemeId }"
        :aria-label="`Appliquer le thème ${theme.name}`" :aria-pressed="theme.id === currentThemeId" :disabled="readonly"
        @mouseenter="preview(theme.id)" @mouseleave="preview(null)" @focus="preview(theme.id)" @blur="preview(null)" @click="preview(null); emit('update:themeId', theme.id)">
        <span class="cv-theme-sample" :style="{ background: theme.colors.bg, color: theme.colors.text, fontFamily: theme.typography.heading, borderTopColor: theme.colors.primary }" aria-hidden="true">
          <span class="cv-theme-type" :style="{ color: theme.colors.primary }">Aa</span><span class="cv-theme-lines"><i :style="{ background: theme.colors.primary }"/><i :style="{ background: theme.colors.textMuted }"/><i :style="{ background: theme.colors.textMuted }"/></span>
        </span>
        <span class="cv-theme-name">{{ theme.name }}<span v-if="theme.id === currentThemeId" aria-hidden="true"> ✓</span></span>
        <span class="cv-theme-kind">{{ theme.scheme === 'dark' ? 'Sombre' : 'Clair' }} · {{ theme.cv?.headerStyle === 'classic' ? 'Classique' : theme.cv?.headerStyle === 'banner' ? 'Bannière' : theme.cv?.headerStyle === 'sidebar' ? 'Latéral' : theme.cv?.headerStyle === 'split' ? 'Éditorial' : 'Minimal' }}</span>
      </button>
    </div>
    <p v-if="!filtered.length" class="cv-theme-count">Aucun thème trouvé. Essayez un autre nom.</p>
  </div>
</template>

<style scoped>
.cv-theme-picker{padding:20px;overflow-y:auto}.cv-theme-filters{display:grid;grid-template-columns:1fr 160px;gap:10px}.cv-theme-count{color:#98a2b5;font-size:12px;margin:14px 0}.cv-theme-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.cv-theme-choice{text-align:left;border:1px solid #2a3040;padding:7px;border-radius:10px;min-width:0;background:#121722}.cv-theme-choice:hover,.cv-theme-choice:focus-visible{border-color:#8daaff;outline:2px solid #8daaff;outline-offset:2px}.cv-theme-choice.selected{border-color:#648cff;background:#1c2945}.cv-theme-sample{display:flex;gap:12px;align-items:center;height:90px;padding:14px;border-radius:5px;border-top:4px solid;overflow:hidden}.cv-theme-type{font-size:34px;line-height:1}.cv-theme-lines{flex:1;display:grid;gap:7px}.cv-theme-lines i{display:block;height:3px;opacity:.55}.cv-theme-lines i:first-child{height:5px;opacity:1}.cv-theme-lines i:last-child{width:65%}.cv-theme-name{display:block;font-size:12px;font-weight:600;color:#e6e9ef;margin:9px 3px 3px}.cv-theme-kind{display:block;font-size:10px;color:#98a2b5;margin:0 3px 5px}@media(max-width:600px){.cv-theme-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cv-theme-filters{grid-template-columns:1fr}.cv-theme-sample{height:80px;padding:10px}}
</style>
