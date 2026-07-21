<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '../store/adminStore'
import { api } from '@shared/utils/api'
import { MONTH_NAMES, applyTheme } from '@shared/utils/themeManager'
import type { ThemeDefinition } from '@shared/types/portfolio.types'

const store = useAdminStore()

const preview = ref<ThemeDefinition | null>(null)
const schedule = ref<Record<string, string>>({})
const autoRotate = ref(false)
const customColors = ref<Record<string, string>>({})
const customCss = ref('')
const animationSpeed = ref(1)
const animationsEnabled = ref(true)

const currentMonth = new Date().getMonth() + 1

const activeId = computed(() => store.data?.design.active ?? '')

/** Thème réellement affiché aujourd'hui, rotation prise en compte. */
const effectiveId = computed(() => {
  if (autoRotate.value && schedule.value[String(currentMonth)]) {
    return schedule.value[String(currentMonth)]
  }
  return activeId.value
})

onMounted(() => {
  const design = store.data?.design
  if (!design) return

  schedule.value = { ...design.schedule }
  autoRotate.value = design.autoRotate
  customColors.value = { ...design.customColors }
  customCss.value = design.customCss
  animationSpeed.value = design.animationSpeed
  animationsEnabled.value = design.animationsEnabled
})

/**
 * Prévisualisation en direct.
 *
 * On applique le thème au document de l'admin lui-même plutôt que dans une
 * iframe : c'est immédiat, sans requête, et ça suffit pour juger d'une
 * palette. « Appliquer » est l'action qui touche réellement le site public.
 */
async function previewTheme(id: string) {
  try {
    const theme = await api.get<ThemeDefinition>(`/designs/${id}`)
    preview.value = theme
    applyTheme(theme)
  } catch (e) {
    store.notify('error', (e as Error).message)
  }
}

function stopPreview() {
  preview.value = null
  // Rend la main à la feuille de style de l'admin.
  document.documentElement.removeAttribute('style')
}

async function activate(id: string) {
  await store.activateDesign(id)
  autoRotate.value = false
  stopPreview()
}

async function saveSchedule() {
  // On nettoie les mois laissés vides avant d'envoyer.
  const cleaned = Object.fromEntries(Object.entries(schedule.value).filter(([, v]) => v))
  await store.saveSchedule(cleaned, autoRotate.value)
}

async function saveCustomization() {
  await store.customizeDesign({
    customColors: customColors.value,
    customCss: customCss.value,
    animationSpeed: animationSpeed.value,
    animationsEnabled: animationsEnabled.value,
  })
}

async function resetCustomization() {
  await api.post('/admin/designs/reset-customization')
  customColors.value = {}
  customCss.value = ''
  await store.loadAll()
  store.notify('ok', 'Personnalisation réinitialisée')
}

const COLOR_KEYS = [
  { key: 'primary', label: 'Primaire' },
  { key: 'secondary', label: 'Secondaire' },
  { key: 'tertiary', label: 'Tertiaire' },
  { key: 'bg', label: 'Fond' },
  { key: 'surface', label: 'Surface' },
  { key: 'text', label: 'Texte' },
]
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">Thèmes</h2>
        <p class="text-sm text-[#7d8798]">
          {{ store.designs.length }} thèmes disponibles — actif :
          <strong class="text-[#e6e9ef]">{{ effectiveId || '—' }}</strong>
        </p>
      </div>

      <button v-if="preview" type="button" class="adm-btn-ghost" @click="stopPreview">
        Arrêter la prévisualisation
      </button>
    </div>

    <!-- ---------------- Grille des thèmes ---------------- -->
    <div class="mb-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <article
        v-for="theme in store.designs"
        :key="theme.id"
        class="overflow-hidden rounded-xl border transition-colors"
        :class="
          effectiveId === theme.id
            ? 'border-[#4b7bff] ring-1 ring-[#4b7bff]'
            : 'border-[#232833] hover:border-[#39404f]'
        "
      >
        <!-- Aperçu de palette : trois bandes suffisent à reconnaître un thème. -->
        <div class="flex h-20" aria-hidden="true">
          <div v-for="(color, i) in theme.swatch" :key="i" class="flex-1" :style="{ background: color }" />
        </div>

        <div class="p-4">
          <div class="mb-1 flex items-center justify-between gap-2">
            <h3 class="truncate text-sm font-semibold">{{ theme.name }}</h3>
            <span class="shrink-0 text-[0.65rem] uppercase text-[#5c6577]">{{ theme.scheme }}</span>
          </div>

          <p class="mb-4 line-clamp-2 text-xs text-[#7d8798]">{{ theme.description }}</p>

          <div class="flex gap-2">
            <button type="button" class="adm-btn-ghost flex-1 text-xs" @click="previewTheme(theme.id)">
              Aperçu
            </button>
            <button
              type="button"
              class="adm-btn-primary flex-1 text-xs"
              :disabled="effectiveId === theme.id"
              @click="activate(theme.id)"
            >
              {{ effectiveId === theme.id ? 'Actif' : 'Appliquer' }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- ---------------- Rotation mensuelle ---------------- -->
    <div class="mb-6 adm-card p-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold">Rotation mensuelle</h3>
          <p class="text-xs text-[#7d8798]">
            Le portfolio change de thème tout seul selon le mois en cours.
          </p>
        </div>

        <label class="flex cursor-pointer items-center gap-2.5 text-sm">
          <input v-model="autoRotate" type="checkbox" class="h-4 w-4 accent-[#4b7bff]" />
          Activer la rotation
        </label>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="(name, i) in MONTH_NAMES" :key="i">
          <label
            :for="`month-${i + 1}`"
            class="mb-1 block text-xs"
            :class="currentMonth === i + 1 ? 'font-semibold text-[#4b7bff]' : 'text-[#7d8798]'"
          >
            {{ name }}<span v-if="currentMonth === i + 1"> (mois en cours)</span>
          </label>
          <select :id="`month-${i + 1}`" v-model="schedule[String(i + 1)]" class="adm-input text-xs">
            <option value="">— Aucun —</option>
            <option v-for="theme in store.designs" :key="theme.id" :value="theme.id">
              {{ theme.name }}
            </option>
          </select>
        </div>
      </div>

      <button type="button" class="adm-btn-primary mt-5" @click="saveSchedule">
        Enregistrer le calendrier
      </button>
    </div>

    <!-- ---------------- Personnalisation ---------------- -->
    <div class="adm-card p-6">
      <h3 class="mb-1 text-sm font-semibold">Personnalisation du thème actif</h3>
      <p class="mb-5 text-xs text-[#7d8798]">
        Ces réglages s'appliquent par-dessus le thème choisi. Laisser vide = valeur du thème.
      </p>

      <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="entry in COLOR_KEYS" :key="entry.key">
          <label :for="`c-${entry.key}`" class="mb-1.5 block text-xs text-[#7d8798]">
            {{ entry.label }}
          </label>
          <div class="flex gap-2">
            <input
              :id="`c-${entry.key}`"
              v-model="customColors[entry.key]"
              type="color"
              class="h-9 w-12 rounded border border-[#2a3040] bg-transparent"
            />
            <input
              v-model="customColors[entry.key]"
              type="text"
              placeholder="(défaut)"
              class="adm-input flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      <div class="mb-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label for="speed" class="mb-1.5 block text-xs text-[#7d8798]">
            Vitesse des animations — ×{{ animationSpeed }}
          </label>
          <input
            id="speed"
            v-model.number="animationSpeed"
            type="range"
            min="0.25"
            max="3"
            step="0.25"
            class="w-full accent-[#4b7bff]"
          />
        </div>

        <label class="flex items-end gap-2.5 pb-1 text-sm">
          <input v-model="animationsEnabled" type="checkbox" class="h-4 w-4 accent-[#4b7bff]" />
          Animations activées
        </label>
      </div>

      <div class="mb-5">
        <label for="css" class="mb-1.5 block text-xs text-[#7d8798]">CSS personnalisé</label>
        <textarea
          id="css"
          v-model="customCss"
          rows="7"
          placeholder=".card-pf { border-radius: 30px; }"
          class="adm-input resize-y font-mono text-xs"
        />
      </div>

      <div class="flex flex-wrap gap-3">
        <button type="button" class="adm-btn-primary" @click="saveCustomization">Appliquer</button>
        <button type="button" class="adm-btn-ghost" @click="resetCustomization">Réinitialiser</button>
      </div>
    </div>
  </section>
</template>
