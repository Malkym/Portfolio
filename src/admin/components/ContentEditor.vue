<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useAdminStore } from '../store/adminStore'
import { api } from '@shared/utils/api'

/**
 * Édition des contenus non répétables : identité, hero, à propos, SEO,
 * engagement, image de marque, sauvegarde.
 *
 * Ce qui se compte en éléments (projets, expériences…) passe par DataManager ;
 * ici on ne trouve que des réglages uniques.
 */

const store = useAdminStore()

const uploadRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadTarget = ref<string | null>(null)
const showMedia = ref(false)
const mediaFiles = ref<{ url: string; name: string; size: number }[]>([])

const tab = ref<'identity' | 'hero' | 'about' | 'contact' | 'seo' | 'engagement' | 'branding' | 'backup'>(
  'identity',
)

const TABS = [
  { id: 'identity', label: 'Identité' },
  { id: 'hero', label: 'Accroche' },
  { id: 'about', label: 'À propos' },
  { id: 'contact', label: 'Contact' },
  { id: 'seo', label: 'SEO' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'branding', label: 'Marque' },
  { id: 'backup', label: 'Sauvegarde' },
] as const

const data = computed(() => store.data)

/* ---------------- Sauvegarde automatique du brouillon ---------------- */

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Enregistrement différé.
 *
 * On attend 1,5 s de calme avant d'envoyer : sans ce délai, chaque frappe
 * dans un champ déclencherait une requête. Le compromis est volontaire —
 * assez court pour qu'on ne perde rien, assez long pour ne pas marteler l'API.
 */
function scheduleSave() {
  store.dirty = true
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => void store.save(), 1500)
}

watch(
  () => store.data,
  (value, previous) => {
    // On ignore le tout premier chargement, qui n'est pas une modification.
    if (previous && value) scheduleSave()
  },
  { deep: true },
)

watch(
  () => store.data?.personal.phone,
  (phone) => {
    if (store.data && phone !== undefined) store.data.contact.phone = phone
  },
)

watch(
  () => store.data?.personal.email,
  (email) => {
    if (store.data && email !== undefined) store.data.contact.email = email
  },
)

/* ---------------- Raccourci clavier ---------------- */

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    void store.save()
  }
}

/** Avertit avant de quitter avec des modifications non envoyées. */
function onBeforeUnload(event: BeforeUnloadEvent) {
  if (store.dirty) event.preventDefault()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
})

/* ---------------- Mots animés du hero ---------------- */

const typedWordsText = computed({
  get: () => data.value?.hero.typedWords.join(', ') ?? '',
  set: (value: string) => {
    if (data.value) {
      data.value.hero.typedWords = value.split(',').map((w) => w.trim()).filter(Boolean)
    }
  },
})

const valuesText = computed({
  get: () => data.value?.about.values.join('\n') ?? '',
  set: (value: string) => {
    if (data.value) data.value.about.values = value.split('\n').map((v) => v.trim()).filter(Boolean)
  },
})

/* ---------------- Sauvegarde / restauration ---------------- */

const importing = ref(false)
const snapshots = ref<{ id: number; label: string; created_at: string }[]>([])

async function loadSnapshots() {
  snapshots.value = await api.get('/admin/snapshots')
}

async function onImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!confirm('Remplacer la configuration actuelle par ce fichier ? Un instantané de sécurité sera créé.')) return

  importing.value = true
  try {
    const payload = JSON.parse(await file.text())
    await store.importData(payload)
  } catch (e) {
    store.notify('error', `Import impossible : ${(e as Error).message}`)
  } finally {
    importing.value = false
  }
}

async function restoreSnapshot(id: number) {
  if (!confirm('Restaurer cette version ? La configuration actuelle sera archivée avant.')) return
  await api.post(`/admin/snapshots/${id}/restore`)
  await store.loadAll()
  store.notify('ok', 'Version restaurée')
}

onMounted(loadSnapshots)

async function loadMedia() {
  mediaFiles.value = await api.get('/admin/media')
}

async function triggerUpload(target: string) {
  uploadTarget.value = target
  uploadRef.value?.click()
}

async function onUploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !uploadTarget.value) return

  uploading.value = true
  try {
    const body = new FormData()
    body.append('files', file)
    const [uploaded] = await api.post<{ url: string }[]>('/admin/upload', body)
    if (uploaded && data.value) {
      const keys = uploadTarget.value.split('.')
      let obj: Record<string, unknown> = data.value as Record<string, unknown>
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]] as Record<string, unknown>
      obj[keys[keys.length - 1]] = uploaded.url
    }
  } catch (e) {
    store.notify('error', (e as Error).message)
  } finally {
    uploading.value = false
    uploadTarget.value = null
    input.value = ''
  }
}

function openMedia(target: string) {
  uploadTarget.value = target
  showMedia.value = true
  loadMedia()
}

function pickMedia(url: string) {
  showMedia.value = false
  if (!data.value || !uploadTarget.value) return
  const keys = uploadTarget.value.split('.')
  let obj: Record<string, unknown> = data.value as Record<string, unknown>
  for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]] as Record<string, unknown>
  obj[keys[keys.length - 1]] = url
  uploadTarget.value = null
}

function addSocialLink() {
  if (!data.value) return
  data.value.contact.socialLinks.push({
    id: crypto.randomUUID(),
    order: data.value.contact.socialLinks.length,
    enabled: true,
    archived: false,
    platform: '',
    url: '',
    icon: 'external-link',
  })
  scheduleSave()
}
</script>

<template>
  <section v-if="data">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-semibold">Contenu &amp; réglages</h2>
      <span class="text-xs" :class="store.dirty ? 'text-[#ffc83d]' : 'text-[#5fd18b]'">
        {{ store.saving ? 'Enregistrement…' : store.dirty ? 'Modifications en attente' : 'À jour' }}
        <span class="ml-1 text-[#5c6577]">— Ctrl+S pour forcer</span>
      </span>
    </div>

    <div class="mb-6 flex flex-wrap gap-2 border-b border-[#232833]">
      <button
        v-for="entry in TABS"
        :key="entry.id"
        type="button"
        class="relative px-3.5 py-2.5 text-sm transition-colors"
        :class="tab === entry.id ? 'font-semibold text-[#4b7bff]' : 'text-[#7d8798]'"
        @click="tab = entry.id"
      >
        {{ entry.label }}
        <span v-if="tab === entry.id" class="absolute inset-x-0 -bottom-px h-0.5 bg-[#4b7bff]" />
      </button>
    </div>

    <!-- ---------------- Identité ---------------- -->
    <div v-if="tab === 'identity'" class="adm-card grid gap-4 p-6 sm:grid-cols-2">
      <label class="block"><span class="adm-label">Nom complet</span>
        <input v-model="data.personal.name" class="adm-input" /></label>

      <label class="block"><span class="adm-label">Titre / poste</span>
        <input v-model="data.personal.title" class="adm-input" /></label>

      <label class="block"><span class="adm-label">Email</span>
        <input v-model="data.personal.email" type="email" class="adm-input" /></label>

      <label class="block"><span class="adm-label">Téléphone</span>
        <input v-model="data.personal.phone" class="adm-input" /></label>

      <label class="block"><span class="adm-label">Localisation</span>
        <input v-model="data.personal.location" class="adm-input" /></label>

      <label class="block"><span class="adm-label">Photo</span>
        <div class="flex gap-2">
          <input v-model="data.personal.photo" class="adm-input flex-1" placeholder="https://… ou /uploads/…" />
          <button type="button" class="adm-btn-ghost text-xs shrink-0" :disabled="uploading" @click="triggerUpload('personal.photo')">
            {{ uploading && uploadTarget === 'personal.photo' ? '…' : 'Upload' }}
          </button>
          <button type="button" class="adm-btn-ghost text-xs shrink-0" @click="openMedia('personal.photo')">
            Média
          </button>
        </div></label>

      <label class="block sm:col-span-2"><span class="adm-label">Lien du CV</span>
        <input v-model="data.personal.resumeUrl" class="adm-input" /></label>

      <label class="block sm:col-span-2"><span class="adm-label">Biographie courte</span>
        <textarea v-model="data.personal.bio" rows="3" class="adm-input resize-y" /></label>
    </div>

    <!-- ---------------- Hero ---------------- -->
    <div v-else-if="tab === 'hero'" class="adm-card grid gap-4 p-6 sm:grid-cols-2">
      <label class="block sm:col-span-2"><span class="adm-label">Sous-titre</span>
        <textarea v-model="data.hero.subtitle" rows="2" class="adm-input resize-y" /></label>

      <label class="block sm:col-span-2">
        <span class="adm-label">Mots animés (séparés par des virgules)</span>
        <input v-model="typedWordsText" class="adm-input" />
      </label>

      <label class="block"><span class="adm-label">Bouton principal</span>
        <input v-model="data.hero.ctaText" class="adm-input" /></label>

      <label class="block"><span class="adm-label">Lien du bouton principal</span>
        <input v-model="data.hero.ctaLink" class="adm-input" /></label>

      <label class="block"><span class="adm-label">Bouton secondaire</span>
        <input v-model="data.hero.ctaSecondaryText" class="adm-input" /></label>

      <label class="block"><span class="adm-label">Lien du bouton secondaire</span>
        <input v-model="data.hero.ctaSecondaryLink" class="adm-input" /></label>

      <label class="block"><span class="adm-label">Type de fond</span>
        <select v-model="data.hero.background" class="adm-input">
          <option value="gradient">Dégradé</option>
          <option value="particles">Particules</option>
          <option value="video">Vidéo</option>
          <option value="image">Image</option>
          <option value="grid">Grille</option>
          <option value="none">Aucun</option>
        </select>
      </label>

      <label class="block"><span class="adm-label">Média de fond</span>
        <div class="flex gap-2">
          <input v-model="data.hero.backgroundMedia" class="adm-input flex-1" placeholder="https://… ou /uploads/…" />
          <button type="button" class="adm-btn-ghost text-xs shrink-0" :disabled="uploading" @click="triggerUpload('hero.backgroundMedia')">
            {{ uploading && uploadTarget === 'hero.backgroundMedia' ? '…' : 'Upload' }}
          </button>
          <button type="button" class="adm-btn-ghost text-xs shrink-0" @click="openMedia('hero.backgroundMedia')">
            Média
          </button>
        </div></label>
    </div>

    <!-- ---------------- À propos ---------------- -->
    <div v-else-if="tab === 'about'" class="adm-card grid gap-4 p-6">
      <label class="flex items-center gap-2.5 text-sm">
        <input v-model="data.about.enabled" type="checkbox" class="h-4 w-4 accent-[#4b7bff]" />
        Afficher la section
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block"><span class="adm-label">Titre</span>
          <input v-model="data.about.title" class="adm-input" /></label>
        <label class="block"><span class="adm-label">Sous-titre</span>
          <input v-model="data.about.subtitle" class="adm-input" /></label>
      </div>

      <label class="block"><span class="adm-label">Contenu (HTML accepté)</span>
        <textarea v-model="data.about.content" rows="9" class="adm-input resize-y font-mono text-xs" /></label>

      <label class="block"><span class="adm-label">Image</span>
        <div class="flex gap-2">
          <input v-model="data.about.image" class="adm-input flex-1" placeholder="https://… ou /uploads/…" />
          <button type="button" class="adm-btn-ghost text-xs shrink-0" :disabled="uploading" @click="triggerUpload('about.image')">
            {{ uploading && uploadTarget === 'about.image' ? '…' : 'Upload' }}
          </button>
          <button type="button" class="adm-btn-ghost text-xs shrink-0" @click="openMedia('about.image')">
            Média
          </button>
        </div></label>

      <label class="block"><span class="adm-label">Valeurs (une par ligne)</span>
        <textarea v-model="valuesText" rows="5" class="adm-input resize-y" /></label>
    </div>

    <!-- ---------------- Contact ---------------- -->
    <div v-else-if="tab === 'contact'" class="adm-card grid gap-5 p-6">
      <label class="flex items-center gap-2.5 text-sm">
        <input v-model="data.contact.enabled" type="checkbox" class="h-4 w-4 accent-[#4b7bff]" />
        Afficher la section contact
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block"><span class="adm-label">Titre</span>
          <input v-model="data.contact.title" class="adm-input" /></label>
        <label class="block"><span class="adm-label">Sous-titre</span>
          <input v-model="data.contact.subtitle" class="adm-input" /></label>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block"><span class="adm-label">Email</span>
          <input v-model="data.contact.email" type="email" class="adm-input" /></label>
        <label class="block"><span class="adm-label">Téléphone</span>
          <input v-model="data.contact.phone" class="adm-input" /></label>
        <label class="block sm:col-span-2"><span class="adm-label">Adresse</span>
          <input v-model="data.contact.address" class="adm-input" /></label>
        <label class="block sm:col-span-2"><span class="adm-label">Carte intégrée (URL iframe)</span>
          <input v-model="data.contact.mapEmbed" class="adm-input" placeholder="https://www.openstreetmap.org/export/embed.html?bbox=..." /></label>
      </div>

      <label class="flex items-center gap-2.5 text-sm">
        <input v-model="data.contact.formEnabled" type="checkbox" class="h-4 w-4 accent-[#4b7bff]" />
        Activer le formulaire de contact
      </label>

      <!-- ---------------- Réseaux sociaux ---------------- -->
      <div class="border-t border-[#232833] pt-4">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold">Réseaux sociaux</h3>
          <button type="button" class="adm-btn-ghost text-xs" @click="addSocialLink">
            + Ajouter un lien
          </button>
        </div>

        <div v-if="data.contact.socialLinks.length" class="space-y-2">
          <div
            v-for="(link, i) in data.contact.socialLinks"
            :key="link.id"
            class="flex flex-wrap items-center gap-2 rounded-lg border border-[#232833] bg-[#111520] p-3"
          >
            <input
              v-model="link.platform"
              class="adm-input w-28 text-sm"
              placeholder="GitHub"
            />
            <input
              v-model="link.url"
              class="adm-input flex-1 text-sm"
              placeholder="https://github.com/..."
            />
            <input
              v-model="link.icon"
              class="adm-input w-24 text-sm"
              placeholder="github"
            />
            <button
              type="button"
              class="text-sm text-[#ff8080] hover:opacity-80"
              aria-label="Supprimer ce lien"
              @click="data.contact.socialLinks.splice(i, 1)"
            >
              ×
            </button>
          </div>
        </div>

        <p v-else class="text-xs text-[#5c6577]">
          Aucun lien. Ajoutez GitHub, LinkedIn, etc.
        </p>
      </div>
    </div>

    <!-- ---------------- SEO ---------------- -->
    <div v-else-if="tab === 'seo'" class="adm-card grid gap-4 p-6">
      <label class="block"><span class="adm-label">Titre de la page</span>
        <input v-model="data.seo.title" class="adm-input" maxlength="70" />
        <span class="mt-1 block text-xs text-[#5c6577]">
          {{ data.seo.title.length }}/70 — au-delà, Google tronque.
        </span>
      </label>

      <label class="block"><span class="adm-label">Description</span>
        <textarea v-model="data.seo.description" rows="3" class="adm-input resize-y" maxlength="160" />
        <span class="mt-1 block text-xs text-[#5c6577]">{{ data.seo.description.length }}/160</span>
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block"><span class="adm-label">Mots-clés</span>
          <input v-model="data.seo.keywords" class="adm-input" /></label>
        <label class="block"><span class="adm-label">Auteur</span>
          <input v-model="data.seo.author" class="adm-input" /></label>
        <label class="block"><span class="adm-label">Image de partage (OG)</span>
          <div class="flex gap-2">
            <input v-model="data.seo.ogImage" class="adm-input flex-1" placeholder="https://… ou /uploads/…" />
            <button type="button" class="adm-btn-ghost text-xs shrink-0" :disabled="uploading" @click="triggerUpload('seo.ogImage')">
              {{ uploading && uploadTarget === 'seo.ogImage' ? '…' : 'Upload' }}
            </button>
            <button type="button" class="adm-btn-ghost text-xs shrink-0" @click="openMedia('seo.ogImage')">
              Média
            </button>
          </div></label>
        <label class="block"><span class="adm-label">URL du site</span>
          <input v-model="data.seo.siteUrl" class="adm-input" placeholder="https://exemple.com" /></label>
      </div>

      <div class="border-t border-[#232833] pt-4">
        <label class="mb-3 flex items-center gap-2.5 text-sm">
          <input v-model="data.analytics.enableTracking" type="checkbox" class="h-4 w-4 accent-[#4b7bff]" />
          Activer Google Analytics
        </label>
        <label class="block"><span class="adm-label">Identifiant de mesure</span>
          <input v-model="data.analytics.googleAnalyticsId" class="adm-input font-mono text-xs" placeholder="G-XXXXXXX" /></label>
      </div>
    </div>

    <!-- ---------------- Engagement ---------------- -->
    <div v-else-if="tab === 'engagement'" class="adm-card p-6">
      <p class="mb-5 rounded-lg border border-[#243347] bg-[#111a26] p-4 text-sm text-[#8fa8c4]">
        Le public ne voit que la note moyenne en étoiles. Le nombre de vues et
        les commentaires restent visibles uniquement depuis cet espace.
      </p>

      <div class="space-y-4">
        <label class="flex items-start gap-3 text-sm">
          <input v-model="data.engagement.ratingsEnabled" type="checkbox" class="mt-0.5 h-4 w-4 accent-[#4b7bff]" />
          <span>
            <span class="block font-medium">Notation par étoiles</span>
            <span class="block text-xs text-[#7d8798]">Une seule note par visiteur, définitive.</span>
          </span>
        </label>

        <label class="flex items-start gap-3 text-sm">
          <input v-model="data.engagement.likesEnabled" type="checkbox" class="mt-0.5 h-4 w-4 accent-[#4b7bff]" />
          <span>
            <span class="block font-medium">Bouton « J'aime »</span>
            <span class="block text-xs text-[#7d8798]">Un like par visiteur, annulable.</span>
          </span>
        </label>

        <label class="flex items-start gap-3 pl-7 text-sm">
          <input v-model="data.engagement.likeCountPublic" type="checkbox" class="mt-0.5 h-4 w-4 accent-[#4b7bff]" />
          <span>
            <span class="block font-medium">Afficher le compteur de likes au public</span>
            <span class="block text-xs text-[#7d8798]">Désactivé, le visiteur ne voit pas le total.</span>
          </span>
        </label>

        <label class="flex items-start gap-3 text-sm">
          <input v-model="data.engagement.commentsEnabled" type="checkbox" class="mt-0.5 h-4 w-4 accent-[#4b7bff]" />
          <span>
            <span class="block font-medium">Commentaires</span>
            <span class="block text-xs text-[#7d8798]">Les visiteurs écrivent, vous seul lisez.</span>
          </span>
        </label>

        <label class="flex items-start gap-3 pl-7 text-sm">
          <input v-model="data.engagement.commentsModerated" type="checkbox" class="mt-0.5 h-4 w-4 accent-[#4b7bff]" />
          <span>
            <span class="block font-medium">Modération préalable</span>
            <span class="block text-xs text-[#7d8798]">Les nouveaux commentaires arrivent « en attente ».</span>
          </span>
        </label>
      </div>
    </div>

    <!-- ---------------- Marque ---------------- -->
    <div v-else-if="tab === 'branding'" class="adm-card grid gap-4 p-6">
      <label class="block"><span class="adm-label">Logo</span>
        <div class="flex gap-2">
          <input v-model="data.branding.logo" class="adm-input flex-1" placeholder="https://… ou /uploads/…" />
          <button type="button" class="adm-btn-ghost text-xs shrink-0" :disabled="uploading" @click="triggerUpload('branding.logo')">
            {{ uploading && uploadTarget === 'branding.logo' ? '…' : 'Upload' }}
          </button>
          <button type="button" class="adm-btn-ghost text-xs shrink-0" @click="openMedia('branding.logo')">
            Média
          </button>
        </div></label>
      <label class="block"><span class="adm-label">Favicon</span>
        <div class="flex gap-2">
          <input v-model="data.branding.favicon" class="adm-input flex-1" placeholder="https://… ou /uploads/…" />
          <button type="button" class="adm-btn-ghost text-xs shrink-0" :disabled="uploading" @click="triggerUpload('branding.favicon')">
            {{ uploading && uploadTarget === 'branding.favicon' ? '…' : 'Upload' }}
          </button>
          <button type="button" class="adm-btn-ghost text-xs shrink-0" @click="openMedia('branding.favicon')">
            Média
          </button>
        </div></label>
      <label class="block"><span class="adm-label">Texte du pied de page</span>
        <input v-model="data.branding.footerText" class="adm-input" /></label>
    </div>

    <!-- ---------------- Sauvegarde ---------------- -->
    <div v-else class="space-y-5">
      <div class="adm-card p-6">
        <h3 class="mb-2 text-sm font-semibold">Exporter / importer</h3>
        <p class="mb-5 text-sm text-[#7d8798]">
          Un fichier JSON contient l'intégralité de votre portfolio. Gardez-en une
          copie ailleurs que sur le serveur — c'est votre vraie assurance longue durée.
        </p>

        <div class="flex flex-wrap gap-3">
          <button type="button" class="adm-btn-primary" @click="store.exportData()">
            Télécharger une sauvegarde
          </button>

          <label class="adm-btn-ghost cursor-pointer">
            {{ importing ? 'Import en cours…' : 'Importer un fichier' }}
            <input type="file" accept="application/json" class="hidden" @change="onImportFile" />
          </label>
        </div>
      </div>

      <div class="adm-card p-6">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-semibold">Historique des versions</h3>
          <button type="button" class="adm-btn-ghost text-xs" @click="loadSnapshots">Actualiser</button>
        </div>

        <p class="mb-4 text-sm text-[#7d8798]">
          Un instantané est pris automatiquement avant chaque modification importante.
          Les 50 derniers sont conservés.
        </p>

        <ul v-if="snapshots.length" class="space-y-2">
          <li
            v-for="snapshot in snapshots"
            :key="snapshot.id"
            class="flex items-center justify-between gap-4 rounded-lg border border-[#232833] p-3.5"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm">{{ snapshot.label }}</span>
              <span class="block text-xs text-[#5c6577]">{{ snapshot.created_at }}</span>
            </span>
            <button type="button" class="adm-btn-ghost shrink-0 text-xs" @click="restoreSnapshot(snapshot.id)">
              Restaurer
            </button>
          </li>
        </ul>

        <p v-else class="py-8 text-center text-sm text-[#5c6577]">Aucun instantané.</p>
      </div>
    </div>

    <!-- ---------------- Input upload caché ---------------- -->
    <input ref="uploadRef" type="file" accept="image/*,video/*" class="hidden" @change="onUploadFile" />

    <!-- ---------------- Médiathèque ---------------- -->
    <div
      v-if="showMedia"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"
      role="dialog"
      aria-modal="true"
      @click.self="showMedia = false"
    >
      <div class="max-h-[80svh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#232833] bg-[#0e121b] p-7">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="text-lg font-semibold">Médiathèque</h3>
          <button type="button" class="adm-btn-ghost text-xs" @click="showMedia = false">Fermer</button>
        </div>

        <div v-if="mediaFiles.length" class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <button
            v-for="file in mediaFiles"
            :key="file.name"
            type="button"
            class="group relative aspect-square overflow-hidden rounded-lg border border-[#232833] bg-[#111520] hover:border-[#4b7bff]"
            @click="pickMedia(file.url)"
          >
            <img
              :src="file.url"
              :alt="file.name"
              loading="lazy"
              class="h-full w-full object-cover"
            />
            <span class="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-[0.6rem] text-white opacity-0 group-hover:opacity-100">
              {{ file.name }}
            </span>
          </button>
        </div>

        <p v-else class="py-12 text-center text-sm text-[#5c6577]">
          Aucun fichier. Utilisez le bouton « Upload » pour en envoyer.
        </p>
      </div>
    </div>
  </section>
</template>
