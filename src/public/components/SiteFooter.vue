<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ADMIN_PATH } from '@/router'

defineProps<{ name: string; footerText?: string }>()

const router = useRouter()
const year = new Date().getFullYear()

/**
 * Accès discret à l'administration.
 *
 * Deux déclencheurs : cinq clics sur la mention de copyright, ou la saisie
 * du mot « admin » au clavier n'importe où sur la page.
 *
 * À dire clairement : ceci n'est PAS une mesure de sécurité. C'est du confort,
 * pour qu'aucun lien « Admin » ne traîne dans le pied de page. La seule
 * protection réelle est le mot de passe vérifié côté serveur — quelqu'un qui
 * devine l'URL n'obtient rien de plus qu'un écran de connexion.
 */

const CLICKS_REQUIRED = 5
const SEQUENCE = 'admin'

const clicks = ref(0)
const hint = ref(false)
let clickTimer: ReturnType<typeof setTimeout> | null = null
let typed = ''

function openAdmin() {
  void router.push(`${ADMIN_PATH}/login`)
}

function onCopyrightClick() {
  clicks.value++

  // Fenêtre glissante : les clics doivent s'enchaîner, sinon on repart de zéro.
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => (clicks.value = 0), 1200)

  if (clicks.value >= CLICKS_REQUIRED - 2 && clicks.value < CLICKS_REQUIRED) {
    hint.value = true
    setTimeout(() => (hint.value = false), 1200)
  }

  if (clicks.value >= CLICKS_REQUIRED) {
    clicks.value = 0
    openAdmin()
  }
}

function onKeydown(event: KeyboardEvent) {
  // On ignore la frappe si l'utilisateur est en train de remplir un champ :
  // sinon écrire « admin » dans le formulaire de contact déclencherait la redirection.
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if (target?.isContentEditable) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (event.key.length !== 1) return

  typed = (typed + event.key.toLowerCase()).slice(-SEQUENCE.length)
  if (typed === SEQUENCE) {
    typed = ''
    openAdmin()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (clickTimer) clearTimeout(clickTimer)
})
</script>

<template>
  <footer class="no-print py-10" :style="{ borderTop: '1px solid var(--c-border)' }">
    <div class="container-pf flex flex-col items-center gap-3 text-center">
      <p v-if="footerText" class="text-sm" :style="{ color: 'var(--c-text-muted)' }">
        {{ footerText }}
      </p>

      <!--
        La zone de déclenchement. Aucun attribut ne la distingue d'un texte
        ordinaire : ni title, ni curseur pointer, ni aria-label.
      -->
      <p
        class="select-none text-sm transition-opacity"
        :style="{ color: 'var(--c-text-muted)', opacity: hint ? 0.55 : 1 }"
        @click="onCopyrightClick"
      >
        © {{ year }} {{ name }}. Tous droits réservés.
      </p>

      <p class="text-xs" :style="{ color: 'var(--c-text-muted)', opacity: 0.6 }">
        Conçu et développé avec Vue 3 &amp; TypeScript.
      </p>
    </div>
  </footer>
</template>
