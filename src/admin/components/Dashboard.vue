<script setup lang="ts">
import { computed } from 'vue'
import { Star } from '@lucide/vue'
import { useAdminStore } from '../store/adminStore'

const store = useAdminStore()

const stats = computed(() => store.stats)

/** Courbe des vues sur 30 jours, normalisée pour un rendu SVG simple. */
const chart = computed(() => {
  const points = stats.value?.views.last30 ?? []
  if (!points.length) return null

  const max = Math.max(...points.map((p) => p.count), 1)
  const width = 100
  const height = 34

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? width / 2 : (i / (points.length - 1)) * width
    const y = height - (p.count / max) * height
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  return {
    line: coords.join(' '),
    // Le polygone fermé sert le remplissage sous la courbe.
    area: `0,${height} ${coords.join(' ')} ${width},${height}`,
    max,
    total: points.reduce((sum, p) => sum + p.count, 0),
  }
})

const ratingBars = computed(() => {
  const breakdown = stats.value?.ratingBreakdown ?? []
  const total = breakdown.reduce((sum, b) => sum + b.n, 0) || 1
  return [5, 4, 3, 2, 1].map((score) => {
    const entry = breakdown.find((b) => b.score === score)
    return { score, count: entry?.n ?? 0, percent: Math.round(((entry?.n ?? 0) / total) * 100) }
  })
})

const ACTION_LABELS: Record<string, string> = {
  login_success: 'Connexion',
  login_failed: 'Échec de connexion',
  logout: 'Déconnexion',
  update_data: 'Contenu modifié',
  create: 'Élément créé',
  update: 'Élément modifié',
  archive: 'Élément archivé',
  delete_hard: 'Élément supprimé',
  reorder: 'Ordre modifié',
  create_section: 'Section créée',
  delete_section: 'Section supprimée',
  activate_theme: 'Thème activé',
  update_schedule: 'Calendrier modifié',
  customize_theme: 'Thème personnalisé',
  upload: 'Fichier envoyé',
  export: 'Sauvegarde exportée',
  import: 'Sauvegarde importée',
  moderate_comment: 'Commentaire modéré',
  contact_message: 'Message reçu',
}

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso.replace(' ', 'T') + 'Z').getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}
</script>

<template>
  <section v-if="stats">
    <h2 class="mb-1 text-lg font-semibold">Vue d'ensemble</h2>
    <p class="mb-7 text-sm text-[#7d8798]">
      Vues et commentaires ne sont visibles que depuis cet écran — le public ne
      voit que la note en étoiles.
    </p>

    <!-- ---------------- Chiffres clés ---------------- -->
    <div class="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="adm-card p-5">
        <p class="text-xs uppercase tracking-wider text-[#7d8798]">Vues totales</p>
        <p class="mt-1 text-3xl font-bold">{{ stats.views.total }}</p>
        <p class="mt-1 text-xs text-[#5c6577]">{{ stats.views.unique }} visiteurs uniques</p>
      </div>

      <div class="adm-card p-5">
        <p class="text-xs uppercase tracking-wider text-[#7d8798]">Aujourd'hui</p>
        <p class="mt-1 text-3xl font-bold text-[#4b7bff]">{{ stats.views.today }}</p>
        <p class="mt-1 text-xs text-[#5c6577]">visites</p>
      </div>

      <div class="adm-card p-5">
        <p class="text-xs uppercase tracking-wider text-[#7d8798]">Note moyenne</p>
        <p class="mt-1 text-3xl font-bold text-[#ffc83d]">
          {{ stats.rating.average || '—' }}
          <span v-if="stats.rating.count" class="text-base font-normal text-[#7d8798]">/ 5</span>
        </p>
        <p class="mt-1 text-xs text-[#5c6577]">{{ stats.rating.count }} vote(s)</p>
      </div>

      <div class="adm-card p-5">
        <p class="text-xs uppercase tracking-wider text-[#7d8798]">J'aime</p>
        <p class="mt-1 text-3xl font-bold text-[#ff6b9d]">{{ stats.likes }}</p>
        <p class="mt-1 text-xs text-[#5c6577]">
          {{ stats.comments.total }} commentaire(s)
        </p>
      </div>
    </div>

    <!-- ---------------- Alertes ---------------- -->
    <div
      v-if="store.pendingComments.length || store.unreadMessages.length"
      class="mb-7 rounded-xl border border-[#4a3d1a] bg-[#1c1810] p-5"
    >
      <p class="mb-1 text-sm font-semibold text-[#ffc83d]">À traiter</p>
      <ul class="text-sm text-[#c9b98a]">
        <li v-if="store.pendingComments.length">
          {{ store.pendingComments.length }} commentaire(s) en attente de modération
        </li>
        <li v-if="store.unreadMessages.length">
          {{ store.unreadMessages.length }} message(s) de contact non lu(s)
        </li>
      </ul>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <!-- ---------------- Courbe des vues ---------------- -->
      <div class="adm-card p-6">
        <div class="mb-4 flex items-baseline justify-between">
          <h3 class="text-sm font-semibold">Vues sur 30 jours</h3>
          <span class="text-xs text-[#5c6577]">{{ chart?.total ?? 0 }} au total</span>
        </div>

        <svg
          v-if="chart"
          viewBox="0 0 100 34"
          preserveAspectRatio="none"
          class="h-32 w-full"
          role="img"
          :aria-label="`Évolution des vues : ${chart.total} sur 30 jours, maximum ${chart.max} en une journée`"
        >
          <polygon :points="chart.area" fill="#4b7bff" opacity="0.14" />
          <polyline
            :points="chart.line"
            fill="none"
            stroke="#4b7bff"
            stroke-width="1"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <p v-else class="py-10 text-center text-sm text-[#5c6577]">
          Pas encore de données de visite.
        </p>
      </div>

      <!-- ---------------- Répartition des notes ---------------- -->
      <div class="adm-card p-6">
        <h3 class="mb-4 text-sm font-semibold">Répartition des notes</h3>

        <ul v-if="stats.rating.count" class="space-y-2.5">
          <li v-for="bar in ratingBars" :key="bar.score" class="flex items-center gap-3">
            <span class="w-8 shrink-0 text-xs text-[#7d8798]">
              <Star :size="14" class="inline" /> {{ bar.score }}
            </span>
            <span class="h-2 flex-1 overflow-hidden rounded-full bg-[#1c212c]">
              <span
                class="block h-full rounded-full bg-[#ffc83d] transition-all duration-500"
                :style="{ width: `${bar.percent}%` }"
              />
            </span>
            <span class="w-8 shrink-0 text-right text-xs text-[#7d8798]">{{ bar.count }}</span>
          </li>
        </ul>

        <p v-else class="py-10 text-center text-sm text-[#5c6577]">Aucune note reçue.</p>
      </div>
    </div>

    <!-- ---------------- Journal ---------------- -->
    <div class="mt-5 adm-card p-6">
      <h3 class="mb-4 text-sm font-semibold">Dernières actions</h3>

      <ul v-if="store.activity.length" class="space-y-2.5">
        <li
          v-for="(entry, i) in store.activity.slice(0, 12)"
          :key="i"
          class="flex items-baseline justify-between gap-4 border-b border-[#1c212c] pb-2 text-sm last:border-0"
        >
          <span>
            {{ ACTION_LABELS[entry.action] ?? entry.action }}
            <span v-if="entry.detail" class="text-xs text-[#5c6577]">— {{ entry.detail }}</span>
          </span>
          <span class="shrink-0 text-xs text-[#5c6577]">{{ relative(entry.created_at) }}</span>
        </li>
      </ul>

      <p v-else class="py-8 text-center text-sm text-[#5c6577]">Aucune activité enregistrée.</p>
    </div>
  </section>

  <p v-else class="py-20 text-center text-sm text-[#5c6577]">Chargement des statistiques…</p>
</template>
