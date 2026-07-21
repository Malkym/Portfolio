<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminStore } from '../store/adminStore'
import { Lock } from '@lucide/vue'
import { api } from '@shared/utils/api'
import { ADMIN_PATH } from '@/router'

const store = useAdminStore()
const router = useRouter()
const route = useRoute()

const password = ref('')
const answer = ref('')
const question = ref<string | null>(null)
const submitting = ref(false)
const error = ref('')

onMounted(async () => {
  // Session encore valide ? On évite de redemander le mot de passe.
  if (await store.checkSession()) {
    void router.replace((route.query.redirect as string) || ADMIN_PATH)
    return
  }

  // La question secrète n'est demandée que si elle est configurée.
  try {
    const res = await api.get<{ question: string | null }>('/auth/challenge')
    question.value = res.question
  } catch {
    /* facultatif */
  }
})

async function submit() {
  if (!password.value) return

  submitting.value = true
  error.value = ''

  const ok = await store.login(password.value, answer.value)

  if (ok) {
    void router.replace((route.query.redirect as string) || ADMIN_PATH)
  } else {
    // Message générique : il ne dit jamais si c'est le mot de passe ou la
    // réponse secrète qui est fausse.
    error.value = 'Identifiants invalides.'
    password.value = ''
  }

  submitting.value = false
}
</script>

<template>
  <div class="grid min-h-svh place-items-center bg-[#0b0d12] px-6 text-[#e6e9ef]">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <div
          aria-hidden="true"
          class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#161a23]"
        >
          <Lock :size="28" />
        </div>
        <h1 class="text-xl font-semibold">Accès restreint</h1>
        <p class="mt-1 text-sm text-[#7d8798]">Espace d'administration</p>
      </div>

      <form class="rounded-2xl border border-[#232833] bg-[#111520] p-7" @submit.prevent="submit">
        <div class="mb-4">
          <label for="pw" class="mb-1.5 block text-sm font-medium">Mot de passe</label>
          <input
            id="pw"
            v-model="password"
            type="password"
            autocomplete="current-password"
            autofocus
            required
            class="w-full rounded-lg border border-[#2a3040] bg-[#0d1017] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#4b7bff]"
          />
        </div>

        <div v-if="question" class="mb-4">
          <label for="answer" class="mb-1.5 block text-sm font-medium">{{ question }}</label>
          <input
            id="answer"
            v-model="answer"
            type="text"
            autocomplete="off"
            class="w-full rounded-lg border border-[#2a3040] bg-[#0d1017] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#4b7bff]"
          />
        </div>

        <button
          type="submit"
          :disabled="submitting || !password"
          class="w-full rounded-lg bg-[#4b7bff] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {{ submitting ? 'Vérification…' : 'Se connecter' }}
        </button>

        <p v-if="error" class="mt-4 text-center text-sm text-[#ff6b6b]" role="alert">
          {{ error }}
        </p>
      </form>

      <p class="mt-6 text-center text-xs text-[#5c6577]">
        Après 5 échecs, l'accès est bloqué 15 minutes.
      </p>

      <div class="mt-4 text-center">
        <RouterLink to="/" class="text-xs text-[#5c6577] underline underline-offset-4 hover:text-[#7d8798]">
          Retour au portfolio
        </RouterLink>
      </div>
    </div>
  </div>
</template>
