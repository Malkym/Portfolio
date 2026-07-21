<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdminStore } from '../store/adminStore'

/**
 * Avertissement affiché quand l'hébergeur ne conserve rien entre deux
 * redémarrages (plan gratuit sans disque persistant).
 *
 * Sans ce bandeau, on passe une soirée à saisir ses projets, le service se
 * met en veille, et tout a disparu au retour — sans la moindre explication.
 * Le rappel est permanent et non masquable : c'est une contrainte de
 * l'hébergement, pas une notification qu'on chasse d'un clic.
 */

const store = useAdminStore()
const isEphemeral = ref(false)

onMounted(async () => {
  try {
    const res = await fetch('/api/config')
    const config = (await res.json()) as { ephemeral?: boolean }
    isEphemeral.value = !!config.ephemeral
  } catch {
    /* en cas de doute, on n'alarme pas inutilement */
  }
})
</script>

<template>
  <div
    v-if="isEphemeral"
    class="mb-6 rounded-xl border border-[#4a3d1a] bg-[#1c1810] p-5"
    role="status"
  >
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="mb-1 text-sm font-semibold text-[#ffc83d]">
          Hébergement sans stockage persistant
        </p>
        <p class="text-sm text-[#c9b98a]">
          Vos modifications vivent en mémoire et
          <strong>disparaîtront au prochain redémarrage du serveur</strong>
          (le plan gratuit se met en veille après 15 minutes d'inactivité).
        </p>
        <p class="mt-2 text-sm text-[#c9b98a]">
          Pour les conserver : exportez le contenu, remplacez
          <code class="rounded bg-[#2a2418] px-1.5 py-0.5 text-xs">data/portfolio-data.json</code>
          dans votre dépôt, puis poussez sur GitHub. Le site redémarrera avec ce contenu.
        </p>
        <p class="mt-2 text-xs text-[#9c8f6a]">
          Les vues, notes et commentaires ne sont pas conservés dans ce mode.
        </p>
      </div>

      <button type="button" class="adm-btn-primary shrink-0" @click="store.exportData()">
        Exporter le contenu
      </button>
    </div>
  </div>
</template>
