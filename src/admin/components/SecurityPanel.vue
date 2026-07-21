<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '../store/adminStore'
import { api } from '@shared/utils/api'

/**
 * Changement du mot de passe administrateur.
 *
 * Le nouveau mot de passe est stocké en base et remplace celui du fichier
 * d'environnement : plus besoin de console ni de redémarrage pour en changer,
 * ce qui compte quand le site tourne sur un hébergeur distant.
 */

const store = useAdminStore()

const current = ref('')
const next = ref('')
const confirm = ref('')
const submitting = ref(false)
const reveal = ref(false)

const info = ref<{
  passwordSource: 'database' | 'environment'
  twoFactorEnabled: boolean
  minPasswordLength: number
} | null>(null)

const minLength = computed(() => info.value?.minPasswordLength ?? 10)

/**
 * Indicateur de robustesse. Volontairement basé sur la longueur et la variété,
 * sans règle rigide du type « une majuscule obligatoire » : ces règles poussent
 * surtout à choisir « Motdepasse1! », qui est faible. Un mot de passe long
 * vaut mieux qu'un mot de passe tordu.
 */
const strength = computed(() => {
  const value = next.value
  if (!value) return { score: 0, label: '', color: '#39404f' }

  let score = 0
  if (value.length >= minLength.value) score++
  if (value.length >= 16) score++
  if (value.length >= 24) score++
  if (/[^a-zA-Z0-9]/.test(value)) score++
  if (/\d/.test(value) && /[a-zA-Z]/.test(value)) score++

  const levels = [
    { label: 'Très faible', color: '#ff6b6b' },
    { label: 'Faible', color: '#ff9b52' },
    { label: 'Correct', color: '#ffc83d' },
    { label: 'Bon', color: '#8fd15f' },
    { label: 'Excellent', color: '#5fd18b' },
    { label: 'Excellent', color: '#5fd18b' },
  ]

  return { score, ...levels[score]! }
})

const tooShort = computed(() => !!next.value && next.value.length < minLength.value)
const mismatch = computed(() => !!confirm.value && next.value !== confirm.value)
const sameAsCurrent = computed(() => !!next.value && next.value === current.value)

const canSubmit = computed(
  () =>
    !submitting.value &&
    !!current.value &&
    next.value.length >= minLength.value &&
    next.value === confirm.value &&
    !sameAsCurrent.value,
)

async function loadInfo() {
  try {
    info.value = await api.get('/auth/security')
  } catch {
    /* non bloquant */
  }
}

async function submit() {
  if (!canSubmit.value) return

  submitting.value = true
  const ok = await store.changePassword(current.value, next.value)
  submitting.value = false

  if (ok) {
    current.value = ''
    next.value = ''
    confirm.value = ''
    await loadInfo()
  }
}

onMounted(loadInfo)
</script>

<template>
  <section>
    <h2 class="mb-1 text-lg font-semibold">Sécurité</h2>
    <p class="mb-7 text-sm text-[#7d8798]">
      Changez votre mot de passe sans passer par la ligne de commande.
    </p>

    <div class="grid gap-5 lg:grid-cols-[1.3fr,1fr]">
      <!-- ---------------- Formulaire ---------------- -->
      <form class="adm-card p-6" autocomplete="off" @submit.prevent="submit">
        <h3 class="mb-5 text-sm font-semibold">Changer le mot de passe</h3>

        <div class="mb-4">
          <label for="pw-current" class="adm-label">Mot de passe actuel</label>
          <input
            id="pw-current"
            v-model="current"
            :type="reveal ? 'text' : 'password'"
            class="adm-input"
            autocomplete="current-password"
            required
          />
        </div>

        <div class="mb-4">
          <label for="pw-new" class="adm-label">Nouveau mot de passe</label>
          <input
            id="pw-new"
            v-model="next"
            :type="reveal ? 'text' : 'password'"
            class="adm-input"
            autocomplete="new-password"
            :aria-invalid="tooShort || sameAsCurrent"
            :aria-describedby="tooShort ? 'pw-err-short' : sameAsCurrent ? 'pw-err-same' : 'pw-strength'"
            required
          />

          <!-- Jauge de robustesse -->
          <div v-if="next" class="mt-2">
            <div class="mb-1 flex h-1 gap-1" aria-hidden="true">
              <span
                v-for="i in 5"
                :key="i"
                class="flex-1 rounded-full transition-colors duration-300"
                :style="{ background: i <= strength.score ? strength.color : '#232833' }"
              />
            </div>
            <p id="pw-strength" class="text-xs" :style="{ color: strength.color }" aria-live="polite">
              {{ strength.label }}
            </p>
          </div>

          <p v-if="tooShort" id="pw-err-short" class="mt-1 text-xs text-[#ff8080]">
            {{ minLength }} caractères minimum.
          </p>
          <p v-else-if="sameAsCurrent" id="pw-err-same" class="mt-1 text-xs text-[#ff8080]">
            Le nouveau mot de passe doit être différent de l'actuel.
          </p>
        </div>

        <div class="mb-4">
          <label for="pw-confirm" class="adm-label">Confirmer le nouveau mot de passe</label>
          <input
            id="pw-confirm"
            v-model="confirm"
            :type="reveal ? 'text' : 'password'"
            class="adm-input"
            autocomplete="new-password"
            :aria-invalid="mismatch"
            :aria-describedby="mismatch ? 'pw-err-match' : undefined"
            required
          />
          <p v-if="mismatch" id="pw-err-match" class="mt-1 text-xs text-[#ff8080]">
            Les deux saisies ne correspondent pas.
          </p>
        </div>

        <label class="mb-6 flex cursor-pointer items-center gap-2.5 text-sm text-[#98a2b5]">
          <input v-model="reveal" type="checkbox" class="h-4 w-4 accent-[#4b7bff]" />
          Afficher les mots de passe
        </label>

        <button type="submit" class="adm-btn-primary w-full" :disabled="!canSubmit">
          {{ submitting ? 'Modification…' : 'Changer le mot de passe' }}
        </button>

        <p class="mt-4 text-xs text-[#7d8798]">
          Toutes les autres sessions seront déconnectées immédiatement. La vôtre
          reste active.
        </p>
      </form>

      <!-- ---------------- État ---------------- -->
      <div class="space-y-5">
        <div class="adm-card p-6">
          <h3 class="mb-4 text-sm font-semibold">État de la configuration</h3>

          <dl class="space-y-3 text-sm">
            <div class="flex items-start justify-between gap-4">
              <dt class="text-[#7d8798]">Source du mot de passe</dt>
              <dd class="text-right">
                <span v-if="info?.passwordSource === 'database'" class="text-[#5fd18b]">
                  Base de données
                </span>
                <span v-else class="text-[#ffc83d]">Variable d'environnement</span>
              </dd>
            </div>

            <div class="flex items-start justify-between gap-4">
              <dt class="text-[#7d8798]">Question secrète (2FA)</dt>
              <dd :class="info?.twoFactorEnabled ? 'text-[#5fd18b]' : 'text-[#7d8798]'">
                {{ info?.twoFactorEnabled ? 'Activée' : 'Désactivée' }}
              </dd>
            </div>

            <div class="flex items-start justify-between gap-4">
              <dt class="text-[#7d8798]">Blocage après échecs</dt>
              <dd>5 essais / 15 min</dd>
            </div>

            <div class="flex items-start justify-between gap-4">
              <dt class="text-[#7d8798]">Durée de session</dt>
              <dd>7 jours</dd>
            </div>
          </dl>
        </div>

        <div
          v-if="info?.passwordSource === 'database'"
          class="rounded-xl border border-[#243347] bg-[#111a26] p-5 text-sm text-[#8fa8c4]"
        >
          <p class="mb-2 font-semibold text-[#a8c4e0]">Bon à savoir</p>
          <p class="mb-3">
            Votre mot de passe est désormais géré depuis cette interface.
            Modifier <code class="text-xs">ADMIN_PASSWORD_HASH</code> dans les
            variables d'environnement n'a plus d'effet.
          </p>
          <p>
            En cas d'oubli, lancez <code class="text-xs">npm run reset-password</code>
            sur le serveur : l'authentification repartira de la variable
            d'environnement.
          </p>
        </div>

        <div
          v-else
          class="rounded-xl border border-[#4a3d1a] bg-[#1c1810] p-5 text-sm text-[#c9b98a]"
        >
          <p class="mb-2 font-semibold text-[#ffc83d]">Mot de passe d'origine</p>
          <p>
            Vous utilisez encore le mot de passe défini à l'installation. Si c'est
            celui de la démonstration, changez-le maintenant.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
