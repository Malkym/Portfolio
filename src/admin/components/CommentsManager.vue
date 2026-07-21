<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAdminStore } from '../store/adminStore'

/**
 * Modération des commentaires et boîte de réception du formulaire de contact.
 * Ces deux flux sont strictement privés : aucune route publique ne les expose.
 */

const store = useAdminStore()

const tab = ref<'comments' | 'messages'>('comments')
const filter = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')
const expanded = ref<string | null>(null)

const filtered = computed(() =>
  filter.value === 'all'
    ? store.comments
    : store.comments.filter((c) => c.status === filter.value),
)

const STATUS_LABEL = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
} as const

const STATUS_CLASS = {
  pending: 'bg-[#3a3218] text-[#ffc83d]',
  approved: 'bg-[#193321] text-[#5fd18b]',
  rejected: 'bg-[#3a1e1e] text-[#ff8080]',
} as const

function formatDate(iso: string): string {
  return new Date(iso.replace(' ', 'T') + 'Z').toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function openMessage(id: string, read: number) {
  expanded.value = expanded.value === id ? null : id
  if (!read && expanded.value === id) await store.markMessageRead(id)
}
</script>

<template>
  <section>
    <h2 class="mb-1 text-lg font-semibold">Retours des visiteurs</h2>
    <p class="mb-6 text-sm text-[#7d8798]">
      Ces contenus ne sont jamais affichés publiquement.
    </p>

    <!-- ---------------- Onglets ---------------- -->
    <div class="mb-6 flex gap-2 border-b border-[#232833]">
      <button
        type="button"
        class="relative px-4 py-2.5 text-sm transition-colors"
        :class="tab === 'comments' ? 'font-semibold text-[#4b7bff]' : 'text-[#7d8798]'"
        @click="tab = 'comments'"
      >
        Commentaires
        <span
          v-if="store.pendingComments.length"
          class="ml-1.5 rounded-full bg-[#ffc83d] px-1.5 text-[0.65rem] font-bold text-black"
        >
          {{ store.pendingComments.length }}
        </span>
        <span v-if="tab === 'comments'" class="absolute inset-x-0 -bottom-px h-0.5 bg-[#4b7bff]" />
      </button>

      <button
        type="button"
        class="relative px-4 py-2.5 text-sm transition-colors"
        :class="tab === 'messages' ? 'font-semibold text-[#4b7bff]' : 'text-[#7d8798]'"
        @click="tab = 'messages'"
      >
        Messages de contact
        <span
          v-if="store.unreadMessages.length"
          class="ml-1.5 rounded-full bg-[#4b7bff] px-1.5 text-[0.65rem] font-bold text-white"
        >
          {{ store.unreadMessages.length }}
        </span>
        <span v-if="tab === 'messages'" class="absolute inset-x-0 -bottom-px h-0.5 bg-[#4b7bff]" />
      </button>
    </div>

    <!-- ---------------- Commentaires ---------------- -->
    <template v-if="tab === 'comments'">
      <div class="mb-5 flex flex-wrap gap-2">
        <button
          v-for="option in (['all', 'pending', 'approved', 'rejected'] as const)"
          :key="option"
          type="button"
          class="rounded-full border px-3.5 py-1.5 text-xs transition-colors"
          :class="
            filter === option
              ? 'border-[#4b7bff] bg-[#182238] text-[#4b7bff]'
              : 'border-[#2a3040] text-[#7d8798]'
          "
          @click="filter = option"
        >
          {{ option === 'all' ? 'Tous' : STATUS_LABEL[option] }}
        </button>
      </div>

      <ul v-if="filtered.length" class="space-y-3">
        <li v-for="comment in filtered" :key="comment.id" class="adm-card p-5">
          <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold">
                {{ comment.author }}
                <span v-if="comment.email" class="font-normal text-[#5c6577]">
                  · {{ comment.email }}
                </span>
              </p>
              <p class="text-xs text-[#5c6577]">{{ formatDate(comment.created_at) }}</p>
            </div>

            <span class="rounded-full px-2.5 py-1 text-[0.65rem] font-semibold" :class="STATUS_CLASS[comment.status]">
              {{ STATUS_LABEL[comment.status] }}
            </span>
          </div>

          <p class="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-[#c2c8d4]">
            {{ comment.body }}
          </p>

          <div class="flex flex-wrap gap-2">
            <button
              v-if="comment.status !== 'approved'"
              type="button"
              class="adm-btn-ghost text-xs !border-[#245c38] !text-[#5fd18b]"
              @click="store.moderateComment(comment.id, 'approved')"
            >
              Approuver
            </button>
            <button
              v-if="comment.status !== 'rejected'"
              type="button"
              class="adm-btn-ghost text-xs"
              @click="store.moderateComment(comment.id, 'rejected')"
            >
              Rejeter
            </button>
            <button
              type="button"
              class="adm-btn-ghost text-xs !border-[#5c2b2b] !text-[#ff8080]"
              @click="store.deleteComment(comment.id)"
            >
              Supprimer
            </button>
          </div>
        </li>
      </ul>

      <p v-else class="rounded-xl border border-dashed border-[#2a3040] py-14 text-center text-sm text-[#5c6577]">
        Aucun commentaire dans cette catégorie.
      </p>
    </template>

    <!-- ---------------- Messages ---------------- -->
    <template v-else>
      <ul v-if="store.messages.length" class="space-y-3">
        <li
          v-for="message in store.messages"
          :key="message.id"
          class="adm-card overflow-hidden"
          :class="{ 'border-l-2 !border-l-[#4b7bff]': !message.read }"
        >
          <button
            type="button"
            class="flex w-full items-start justify-between gap-4 p-5 text-left"
            :aria-expanded="expanded === message.id"
            @click="openMessage(message.id, message.read)"
          >
            <span class="min-w-0">
              <span class="block text-sm font-semibold">
                {{ message.subject || '(sans sujet)' }}
              </span>
              <span class="block truncate text-xs text-[#7d8798]">
                {{ message.name }} · {{ message.email }}
              </span>
            </span>
            <span class="shrink-0 text-xs text-[#5c6577]">{{ formatDate(message.created_at) }}</span>
          </button>

          <div v-if="expanded === message.id" class="border-t border-[#232833] p-5">
            <p class="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-[#c2c8d4]">
              {{ message.body }}
            </p>
            <div class="flex flex-wrap gap-2">
              <a
                :href="`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject || 'Votre message')}`"
                class="adm-btn-primary text-xs"
              >
                Répondre
              </a>
              <button
                type="button"
                class="adm-btn-ghost text-xs !border-[#5c2b2b] !text-[#ff8080]"
                @click="store.deleteMessage(message.id)"
              >
                Supprimer
              </button>
            </div>
          </div>
        </li>
      </ul>

      <p v-else class="rounded-xl border border-dashed border-[#2a3040] py-14 text-center text-sm text-[#5c6577]">
        Aucun message reçu.
      </p>
    </template>
  </section>
</template>
