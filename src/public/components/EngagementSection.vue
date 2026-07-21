<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import SectionHeader from './SectionHeader.vue'
import { useEngagement } from '@shared/composables/useEngagement'
import type { PortfolioData } from '@shared/types/portfolio.types'

defineProps<{ config: PortfolioData['engagement']; index?: number }>()

const { state, loading, message, hasRated, refresh, toggleLike, rate, postComment } =
  useEngagement()

const hovered = ref(0)

const form = ref({ author: '', email: '', body: '' })
const sent = ref(false)

/** L'étoile est pleine si elle est sous le survol, ou sous la moyenne. */
function starFill(position: number): 'full' | 'half' | 'empty' {
  const reference = hovered.value || state.value.me.rated || state.value.rating.average
  if (reference >= position) return 'full'
  if (reference >= position - 0.5) return 'half'
  return 'empty'
}

const ratingLabel = computed(() => {
  const { average, count } = state.value.rating
  if (!count) return 'Aucune note pour le moment'
  return `${average} sur 5 — ${count} ${count > 1 ? 'votes' : 'vote'}`
})

async function submit() {
  if (!form.value.author.trim() || !form.value.body.trim()) return

  const ok = await postComment({
    author: form.value.author,
    email: form.value.email || undefined,
    body: form.value.body,
  })

  if (ok) {
    form.value = { author: '', email: '', body: '' }
    sent.value = true
  }
}

onMounted(refresh)
</script>

<template>
  <section id="engagement" class="section-pf no-print" :style="{ background: 'var(--c-surface-alt)' }">
    <div class="container-pf max-w-3xl">
      <SectionHeader
        title="Votre avis compte"
        subtitle="Un mot, une note — ça prend dix secondes et ça fait toujours plaisir."
        :index="index"
      />

      <!-- ---------------- Notation ---------------- -->
      <div v-if="config.ratingsEnabled" v-reveal class="card-pf mb-6 p-8 text-center">
        <p class="mb-5 text-sm uppercase tracking-widest" :style="{ color: 'var(--c-text-muted)' }">
          {{ hasRated ? 'Votre note' : 'Notez ce portfolio' }}
        </p>

        <!--
          role="radiogroup" : la notation est un vrai choix unique, pas une
          rangée de boutons décoratifs. Une fois voté, tout passe en disabled —
          le serveur refuserait de toute façon, autant le dire clairement ici.
        -->
        <div
          class="mb-4 flex justify-center gap-1.5"
          role="radiogroup"
          aria-label="Note de 1 à 5 étoiles"
          @mouseleave="hovered = 0"
        >
          <button
            v-for="position in 5"
            :key="position"
            type="button"
            role="radio"
            :aria-checked="state.me.rated === position"
            :aria-label="`${position} étoile${position > 1 ? 's' : ''}`"
            :disabled="hasRated || loading"
            class="transition-transform duration-200"
            :class="hasRated ? 'cursor-default' : 'cursor-pointer hover:scale-125'"
            @mouseenter="!hasRated && (hovered = position)"
            @click="rate(position)"
          >
            <svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true">
              <defs>
                <linearGradient :id="`half-${position}`">
                  <stop offset="50%" stop-color="var(--c-primary)" />
                  <stop offset="50%" stop-color="transparent" />
                </linearGradient>
              </defs>
              <path
                d="M12 2.5l2.9 6.05 6.6.9-4.8 4.6 1.2 6.55L12 17.5l-5.9 3.1 1.2-6.55-4.8-4.6 6.6-.9z"
                :fill="
                  starFill(position) === 'full'
                    ? 'var(--c-primary)'
                    : starFill(position) === 'half'
                      ? `url(#half-${position})`
                      : 'transparent'
                "
                stroke="var(--c-primary)"
                stroke-width="1.4"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>

        <p class="text-sm" :style="{ color: 'var(--c-text-muted)' }" aria-live="polite">
          {{ ratingLabel }}
        </p>

        <p v-if="hasRated" class="mt-2 text-xs" :style="{ color: 'var(--c-primary)' }">
          Merci ! Une seule note par visiteur.
        </p>
      </div>

      <!-- ---------------- Like ---------------- -->
      <div v-if="config.likesEnabled" v-reveal="80" class="mb-6 flex justify-center">
        <button
          type="button"
          class="btn-pf btn-ghost group"
          :aria-pressed="state.me.liked"
          :disabled="loading"
          @click="toggleLike()"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
            class="transition-transform duration-300 group-hover:scale-125"
            :fill="state.me.liked ? 'var(--c-primary)' : 'none'"
            stroke="var(--c-primary)"
            stroke-width="1.8"
          >
            <path
              d="M12 20.7l-1.45-1.32C5.4 14.72 2 11.64 2 7.85 2 4.77 4.42 2.35 7.5 2.35c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09 3.08 0 5.5 2.42 5.5 5.5 0 3.79-3.4 6.87-8.55 11.54z"
            />
          </svg>

          <span>{{ state.me.liked ? 'Vous aimez' : "J'aime" }}</span>

          <!-- Le compteur n'apparaît que si le propriétaire l'a rendu public. -->
          <span
            v-if="state.likes !== null"
            class="font-mono text-sm"
            :style="{ color: 'var(--c-text-muted)' }"
          >
            {{ state.likes }}
          </span>
        </button>
      </div>

      <!-- ---------------- Commentaire ---------------- -->
      <form
        v-if="config.commentsEnabled"
        v-reveal="140"
        class="card-pf p-8"
        novalidate
        @submit.prevent="submit"
      >
        <h3 class="mb-2 text-xl">Laisser un message</h3>
        <p class="mb-6 text-sm" :style="{ color: 'var(--c-text-muted)' }">
          Votre message m'est envoyé directement — il n'est pas affiché publiquement.
        </p>

        <div class="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label for="c-author" class="mb-1.5 block text-sm font-medium">
              Nom <span :style="{ color: 'var(--c-primary)' }">*</span>
            </label>
            <input
              id="c-author"
              v-model="form.author"
              class="input-pf"
              required
              minlength="2"
              maxlength="80"
              autocomplete="name"
            />
          </div>

          <div>
            <label for="c-email" class="mb-1.5 block text-sm font-medium">
              Email <span class="text-xs" :style="{ color: 'var(--c-text-muted)' }">(facultatif)</span>
            </label>
            <input
              id="c-email"
              v-model="form.email"
              type="email"
              class="input-pf"
              autocomplete="email"
            />
          </div>
        </div>

        <div class="mb-5">
          <label for="c-body" class="mb-1.5 block text-sm font-medium">
            Message <span :style="{ color: 'var(--c-primary)' }">*</span>
          </label>
          <textarea
            id="c-body"
            v-model="form.body"
            class="input-pf resize-y"
            rows="4"
            required
            minlength="5"
            maxlength="2000"
          />
          <p class="mt-1 text-right text-xs" :style="{ color: 'var(--c-text-muted)' }">
            {{ form.body.length }} / 2000
          </p>
        </div>

        <button
          type="submit"
          class="btn-pf btn-primary w-full"
          :disabled="loading || !form.author.trim() || form.body.trim().length < 5"
        >
          {{ loading ? 'Envoi…' : 'Envoyer' }}
        </button>

        <p v-if="sent" class="mt-4 text-center text-sm" :style="{ color: 'var(--c-primary)' }">
          Message bien reçu, merci !
        </p>
      </form>

      <!-- Retour d'action, annoncé aux lecteurs d'écran. -->
      <p
        v-if="message"
        class="mt-5 text-center text-sm"
        role="status"
        aria-live="polite"
        :style="{ color: message.type === 'ok' ? 'var(--c-primary)' : '#ef4444' }"
      >
        {{ message.text }}
      </p>
    </div>
  </section>
</template>
