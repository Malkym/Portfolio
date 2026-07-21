<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../store/adminStore'
import DynamicIcon from '../../shared/components/DynamicIcon.vue'
import Dashboard from '../components/Dashboard.vue'
import DataManager from '../components/DataManager.vue'
import DesignSelector from '../components/DesignSelector.vue'
import ContentEditor from '../components/ContentEditor.vue'
import DynamicFieldCreator from '../components/DynamicFieldCreator.vue'
import CommentsManager from '../components/CommentsManager.vue'
import SecurityPanel from '../components/SecurityPanel.vue'
import { ADMIN_PATH } from '@/router'
import type { CustomField } from '@shared/types/portfolio.types'

const store = useAdminStore()
const route = useRoute()
const router = useRouter()

const sidebarOpen = ref(false)

const tab = computed(() => (route.params.tab as string) || 'dashboard')

function goTo(id: string) {
  sidebarOpen.value = false
  void router.push(`${ADMIN_PATH}/${id}`)
}

/**
 * Schémas des collections natives.
 *
 * Décrire les champs en données plutôt qu'en composants permet de réutiliser
 * le même DataManager partout — natif comme dynamique. Ajouter un champ à
 * « Projets » se fait ici, en une ligne.
 */
const SCHEMAS: Record<string, { label: string; icon: string; fields: CustomField[] }> = {
  projects: {
    label: 'Projets',
    icon: 'briefcase',
    fields: [
      { name: 'title', label: 'Titre', type: 'text', required: true, role: 'title' },
      { name: 'description', label: 'Description courte', type: 'textarea', required: true, role: 'body' },
      { name: 'longDescription', label: 'Description détaillée', type: 'rich-text', required: false },
      { name: 'image', label: 'Image', type: 'image', required: false, role: 'media' },
      { name: 'technologies', label: 'Technologies', type: 'tags', required: false },
      { name: 'tags', label: 'Étiquettes de filtrage', type: 'tags', required: false },
      { name: 'demoUrl', label: 'Lien de démo', type: 'url', required: false, role: 'link' },
      { name: 'repoUrl', label: 'Dépôt de code', type: 'url', required: false },
      { name: 'startDate', label: 'Début', type: 'date', required: false },
      { name: 'endDate', label: 'Fin', type: 'date', required: false },
      {
        name: 'kind', label: 'Type', type: 'select', required: false,
        options: ['personnel', 'client', 'open-source'],
      },
      { name: 'featured', label: 'Mettre en avant', type: 'boolean', required: false },
    ],
  },
  experience: {
    label: 'Expériences',
    icon: 'building',
    fields: [
      { name: 'role', label: 'Poste', type: 'text', required: true, role: 'title' },
      { name: 'company', label: 'Entreprise', type: 'text', required: true, role: 'subtitle' },
      { name: 'location', label: 'Lieu', type: 'text', required: false },
      { name: 'startDate', label: 'Début (AAAA-MM)', type: 'text', required: true },
      { name: 'endDate', label: 'Fin (AAAA-MM)', type: 'text', required: false },
      { name: 'current', label: 'Poste actuel', type: 'boolean', required: false },
      { name: 'description', label: 'Description', type: 'textarea', required: false, role: 'body' },
      { name: 'achievements', label: 'Réalisations (une par virgule)', type: 'tags', required: false },
      { name: 'technologies', label: 'Technologies', type: 'tags', required: false },
      { name: 'logo', label: 'Logo', type: 'image', required: false, role: 'media' },
    ],
  },
  education: {
    label: 'Formations',
    icon: 'graduation-cap',
    fields: [
      { name: 'degree', label: 'Diplôme', type: 'text', required: true, role: 'title' },
      { name: 'school', label: 'Établissement', type: 'text', required: true, role: 'subtitle' },
      { name: 'field', label: 'Spécialisation', type: 'text', required: false },
      { name: 'startYear', label: 'Année de début', type: 'text', required: false },
      { name: 'endYear', label: 'Année de fin', type: 'text', required: false },
      { name: 'description', label: 'Description', type: 'textarea', required: false, role: 'body' },
      { name: 'logo', label: 'Logo', type: 'image', required: false, role: 'media' },
    ],
  },
  skills: {
    label: 'Compétences',
    icon: 'zap',
    fields: [
      { name: 'name', label: 'Nom de la catégorie', type: 'text', required: true, role: 'title' },
      { name: 'icon', label: 'Icône (nom Lucide)', type: 'text', required: false },
      {
        name: 'skills', label: 'Compétences', type: 'textarea', required: false,
        help: 'Une compétence par ligne. Format : Nom | Niveau (Junior/Mid/Senior/Expert) | Score (0-100). Exemple :\nVue.js | Expert | 96\nTypeScript | Senior | 85',
      },
    ],
  },
  testimonials: {
    label: 'Témoignages',
    icon: 'message-circle',
    fields: [
      { name: 'name', label: 'Nom', type: 'text', required: true, role: 'title' },
      { name: 'role', label: 'Poste', type: 'text', required: false, role: 'subtitle' },
      { name: 'company', label: 'Entreprise', type: 'text', required: false },
      { name: 'quote', label: 'Témoignage', type: 'textarea', required: true, role: 'body' },
      { name: 'photo', label: 'Photo', type: 'image', required: false, role: 'media' },
      { name: 'rating', label: 'Note', type: 'rating', required: false },
    ],
  },
  stats: {
    label: 'Chiffres clés',
    icon: 'bar-chart-3',
    fields: [
      { name: 'label', label: 'Libellé', type: 'text', required: true, role: 'title' },
      { name: 'value', label: 'Valeur', type: 'number', required: true },
      { name: 'suffix', label: 'Suffixe', type: 'text', required: false },
      { name: 'icon', label: 'Icône', type: 'text', required: false },
    ],
  },
  articles: {
    label: 'Articles',
    icon: 'file-text',
    fields: [
      { name: 'title', label: 'Titre', type: 'text', required: true, role: 'title' },
      { name: 'date', label: 'Date', type: 'date', required: false },
      { name: 'excerpt', label: 'Résumé', type: 'textarea', required: false, role: 'body' },
      { name: 'url', label: 'Lien', type: 'url', required: false, role: 'link' },
      { name: 'cover', label: 'Couverture', type: 'image', required: false, role: 'media' },
      { name: 'tags', label: 'Étiquettes', type: 'tags', required: false },
    ],
  },
  timeline: {
    label: 'Parcours',
    icon: 'clock',
    fields: [
      { name: 'title', label: 'Titre', type: 'text', required: true, role: 'title' },
      { name: 'date', label: 'Date', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: false, role: 'body' },
      { name: 'icon', label: 'Icône', type: 'text', required: false },
    ],
  },
  gallery: {
    label: 'Galerie',
    icon: 'image',
    fields: [
      { name: 'title', label: 'Titre', type: 'text', required: false, role: 'title' },
      { name: 'media', label: 'Média', type: 'image', required: true, role: 'media' },
      { name: 'type', label: 'Type', type: 'select', required: false, options: ['image', 'video'] },
      { name: 'caption', label: 'Légende', type: 'text', required: false, role: 'body' },
    ],
  },
}

const NAV = [
  { id: 'dashboard', label: 'Tableau de bord', icon: 'trending-up' },
  { id: 'content', label: 'Contenu & réglages', icon: 'edit' },
  ...Object.entries(SCHEMAS).map(([id, s]) => ({ id, label: s.label, icon: s.icon })),
  { id: 'sections', label: 'Sections perso.', icon: 'sparkles' },
  { id: 'designs', label: 'Thèmes', icon: 'palette' },
  { id: 'feedback', label: 'Retours visiteurs', icon: 'mail' },
  { id: 'security', label: 'Sécurité', icon: 'lock' },
]

/** Éléments de la collection affichée, quel que soit son nom de tableau. */
const currentItems = computed(() => {
  const section = store.data?.[tab.value as keyof typeof store.data] as
    | { items?: unknown[]; categories?: unknown[] }
    | undefined
  return ((section?.items ?? section?.categories ?? []) as Record<string, unknown>[])
})

/** La section elle-même (pour son état enabled). */
const currentSection = computed(() => {
  if (!store.data || !SCHEMAS[tab.value]) return null
  return store.data[tab.value as keyof typeof store.data] as { enabled?: boolean } | null
})

async function toggleSection() {
  const section = store.data?.[tab.value as keyof typeof store.data] as { enabled?: boolean } | undefined
  if (!section) return
  section.enabled = !section.enabled
  await store.save()
}

const badge = computed(
  () => store.pendingComments.length + store.unreadMessages.length,
)

onMounted(async () => {
  if (!(await store.checkSession())) {
    void router.replace(`${ADMIN_PATH}/login`)
    return
  }
  await store.loadAll()
})

async function logout() {
  await store.logout()
  void router.replace(`${ADMIN_PATH}/login`)
}
</script>

<template>
  <div class="min-h-svh bg-[#0b0d12] text-[#e6e9ef]">
    <!-- ---------------- En-tête mobile ---------------- -->
    <header class="flex items-center justify-between border-b border-[#1c212c] p-4 lg:hidden">
<button
          type="button"
          class="text-sm"
          :aria-expanded="sidebarOpen"
          @click="sidebarOpen = !sidebarOpen"
        >
          <DynamicIcon name="menu" :size="18" />
          <span class="sr-only">Menu</span>
        </button>
      <span class="text-sm font-semibold">Administration</span>
    </header>

    <div class="flex">
      <!-- ---------------- Barre latérale ---------------- -->
      <aside
        class="fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto border-r border-[#1c212c] bg-[#0e121b] transition-transform lg:static lg:translate-x-0"
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="border-b border-[#1c212c] p-5">
          <p class="text-sm font-semibold">{{ store.data?.personal.name || 'Portfolio' }}</p>
          <p class="text-xs text-[#5c6577]">Administration</p>
        </div>

        <nav class="p-3" aria-label="Sections d'administration">
          <ul class="space-y-1">
            <li v-for="entry in NAV" :key="entry.id">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                :class="tab === entry.id ? 'bg-[#182238] text-[#4b7bff]' : 'text-[#98a2b5] hover:bg-[#141924]'"
                :aria-current="tab === entry.id ? 'page' : undefined"
                @click="goTo(entry.id)"
              >
                <DynamicIcon :name="entry.icon" :size="18" />
                <span class="flex-1">{{ entry.label }}</span>
                <span
                  v-if="entry.id === 'feedback' && badge"
                  class="rounded-full bg-[#4b7bff] px-1.5 text-[0.65rem] font-bold text-white"
                >
                  {{ badge }}
                </span>
              </button>
            </li>
          </ul>
        </nav>

        <div class="border-t border-[#1c212c] p-3">
          <a
            href="/"
            target="_blank"
            class="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#98a2b5] hover:bg-[#141924]"
          >
            <DynamicIcon name="external-link" :size="16" /> Voir le portfolio
          </a>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#ff8080] hover:bg-[#141924]"
            @click="logout"
          >
            <DynamicIcon name="log-out" :size="16" /> Se déconnecter
          </button>
        </div>
      </aside>

      <!-- Voile de fermeture sur mobile. -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-black/60 lg:hidden"
        @click="sidebarOpen = false"
      />

      <!-- ---------------- Contenu ---------------- -->
      <main class="min-w-0 flex-1 p-5 lg:p-9">
        <p v-if="store.loading" class="py-24 text-center text-sm text-[#5c6577]">Chargement…</p>

        <template v-else-if="store.data">
          <Dashboard v-if="tab === 'dashboard'" />
          <ContentEditor v-else-if="tab === 'content'" />
          <DynamicFieldCreator v-else-if="tab === 'sections'" />
          <DesignSelector v-else-if="tab === 'designs'" />
          <CommentsManager v-else-if="tab === 'feedback'" />
          <SecurityPanel v-else-if="tab === 'security'" />

          <DataManager
            v-else-if="SCHEMAS[tab]"
            :key="tab"
            :collection="tab"
            :title="SCHEMAS[tab]!.label"
            :fields="SCHEMAS[tab]!.fields"
            :items="currentItems"
          >
            <template #header-extra>
              <button
                v-if="currentSection"
                type="button"
                class="adm-btn-ghost text-xs"
                @click="toggleSection"
              >
                {{ currentSection.enabled ? 'Masquer la section' : 'Afficher la section' }}
              </button>
            </template>
          </DataManager>

          <p v-else class="py-24 text-center text-sm text-[#5c6577]">Section inconnue.</p>
        </template>
      </main>
    </div>

    <!-- ---------------- Notifications ---------------- -->
    <Transition name="toast">
      <div
        v-if="store.toast"
        class="fixed bottom-6 right-6 z-[60] rounded-xl px-5 py-3.5 text-sm shadow-2xl"
        :class="store.toast.type === 'ok' ? 'bg-[#193321] text-[#5fd18b]' : 'bg-[#3a1e1e] text-[#ff8080]'"
        role="status"
        aria-live="polite"
      >
        {{ store.toast.text }}
      </div>
    </Transition>
  </div>
</template>

<style>
/* Styles de l'admin. Volontairement indépendants du thème public :
   l'apparence de l'outil ne doit pas changer avec le thème du site. */
.adm-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid #2a3040;
  background: #0d1017;
  padding: 0.6rem 0.85rem;
  font-size: 0.875rem;
  color: #e6e9ef;
  outline: none;
  transition: border-color 160ms ease;
}

.adm-input:focus {
  border-color: #4b7bff;
}

.adm-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #98a2b5;
}

.adm-card {
  border-radius: 0.75rem;
  border: 1px solid #232833;
  background: #111520;
}

.adm-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  background: #4b7bff;
  padding: 0.6rem 1.1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  transition: opacity 160ms ease;
}

.adm-btn-primary:hover:not(:disabled) {
  opacity: 0.88;
}

.adm-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.adm-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  border: 1px solid #2a3040;
  padding: 0.6rem 1.1rem;
  font-size: 0.875rem;
  color: #c2c8d4;
  transition: border-color 160ms ease;
}

.adm-btn-ghost:hover {
  border-color: #4b7bff;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
