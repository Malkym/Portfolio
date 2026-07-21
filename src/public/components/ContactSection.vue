<script setup lang="ts">
import { ref, computed } from 'vue'
import { Mail, Phone, MapPin } from '@lucide/vue'
import DynamicIcon from '../../shared/components/DynamicIcon.vue'
import SectionHeader from './SectionHeader.vue'
import { api } from '@shared/utils/api'
import type { PortfolioData } from '@shared/types/portfolio.types'

defineProps<{ contact: PortfolioData['contact']; index?: number }>()

const form = ref({ name: '', email: '', subject: '', body: '', website: '' })
const sending = ref(false)
const result = ref<{ type: 'ok' | 'error'; text: string } | null>(null)

const errors = ref<Record<string, string>>({})

/** Validation locale, miroir de celle du serveur — qui reste l'autorité. */
function validate(): boolean {
  const next: Record<string, string> = {}
  if (form.value.name.trim().length < 2) next.name = 'Indiquez votre nom.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) next.email = 'Email invalide.'
  if (form.value.body.trim().length < 10) next.body = 'Message trop court (10 caractères min).'
  errors.value = next
  return Object.keys(next).length === 0
}

const canSubmit = computed(
  () => !sending.value && form.value.name && form.value.email && form.value.body,
)

async function submit() {
  if (!validate()) return

  sending.value = true
  result.value = null

  try {
    const res = await api.post<{ message: string }>('/contact', form.value)
    result.value = { type: 'ok', text: res.message }
    form.value = { name: '', email: '', subject: '', body: '', website: '' }
  } catch (e) {
    result.value = { type: 'error', text: (e as Error).message }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section id="contact" class="section-pf" :style="{ background: 'var(--c-surface-alt)' }">
    <div class="container-pf">
      <SectionHeader :title="contact.title" :subtitle="contact.subtitle" :index="index" />

      <div class="grid gap-10 lg:grid-cols-[1fr,1.25fr]">
        <!-- ---------------- Coordonnées ---------------- -->
        <div v-reveal class="space-y-4">
          <a
            v-if="contact.email"
            :href="`mailto:${contact.email}`"
            class="card-pf flex items-center gap-4 p-5"
          >
            <Mail aria-hidden="true" :size="24" :style="{ color: 'var(--c-primary)' }" />
            <span class="min-w-0">
              <span class="block text-xs uppercase tracking-wider" :style="{ color: 'var(--c-text-muted)' }">
                Email
              </span>
              <span class="block truncate font-medium">{{ contact.email }}</span>
            </span>
          </a>

          <a
            v-if="contact.phone"
            :href="`tel:${contact.phone.replace(/\s/g, '')}`"
            class="card-pf flex items-center gap-4 p-5"
          >
            <Phone aria-hidden="true" :size="24" :style="{ color: 'var(--c-primary)' }" />
            <span>
              <span class="block text-xs uppercase tracking-wider" :style="{ color: 'var(--c-text-muted)' }">
                Téléphone
              </span>
              <span class="block font-medium">{{ contact.phone }}</span>
            </span>
          </a>

          <div v-if="contact.address" class="card-pf flex items-center gap-4 p-5">
            <MapPin aria-hidden="true" :size="24" :style="{ color: 'var(--c-primary)' }" />
            <span>
              <span class="block text-xs uppercase tracking-wider" :style="{ color: 'var(--c-text-muted)' }">
                Localisation
              </span>
              <span class="block font-medium">{{ contact.address }}</span>
            </span>
          </div>

          <ul v-if="contact.socialLinks?.length" class="flex flex-wrap gap-3 pt-2">
            <li v-for="link in contact.socialLinks" :key="link.id">
              <a
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-pf btn-ghost !px-4 !py-2.5"
                :aria-label="link.platform"
              >
                <DynamicIcon :name="link.icon || 'link'" :size="18" />
                <span class="text-sm">{{ link.platform }}</span>
              </a>
            </li>
          </ul>

          <div v-if="contact.mapEmbed" class="overflow-hidden rounded-theme">
            <iframe
              :src="contact.mapEmbed"
              title="Carte de localisation"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              class="h-56 w-full border-0"
            />
          </div>
        </div>

        <!-- ---------------- Formulaire ---------------- -->
        <form v-if="contact.formEnabled" v-reveal="100" class="card-pf p-8" novalidate @submit.prevent="submit">
          <div class="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label for="f-name" class="mb-1.5 block text-sm font-medium">Nom *</label>
              <input
                id="f-name"
                v-model="form.name"
                class="input-pf"
                autocomplete="name"
                :aria-invalid="!!errors.name"
                :aria-describedby="errors.name ? 'err-name' : undefined"
              />
              <p v-if="errors.name" id="err-name" class="mt-1 text-xs text-red-400">{{ errors.name }}</p>
            </div>

            <div>
              <label for="f-email" class="mb-1.5 block text-sm font-medium">Email *</label>
              <input
                id="f-email"
                v-model="form.email"
                type="email"
                class="input-pf"
                autocomplete="email"
                :aria-invalid="!!errors.email"
                :aria-describedby="errors.email ? 'err-email' : undefined"
              />
              <p v-if="errors.email" id="err-email" class="mt-1 text-xs text-red-400">{{ errors.email }}</p>
            </div>
          </div>

          <div class="mb-4">
            <label for="f-subject" class="mb-1.5 block text-sm font-medium">Sujet</label>
            <input id="f-subject" v-model="form.subject" class="input-pf" />
          </div>

          <div class="mb-5">
            <label for="f-body" class="mb-1.5 block text-sm font-medium">Message *</label>
            <textarea
              id="f-body"
              v-model="form.body"
              rows="5"
              class="input-pf resize-y"
              :aria-invalid="!!errors.body"
              :aria-describedby="errors.body ? 'err-body' : undefined"
            />
            <p v-if="errors.body" id="err-body" class="mt-1 text-xs text-red-400">{{ errors.body }}</p>
          </div>

          <!--
            Piège à robots. Invisible et retiré du parcours clavier et vocal :
            un humain ne peut pas le remplir par accident, un robot le remplit
            presque toujours.
          -->
          <div aria-hidden="true" class="absolute h-0 w-0 overflow-hidden">
            <label for="f-website">Ne pas remplir</label>
            <input id="f-website" v-model="form.website" tabindex="-1" autocomplete="off" />
          </div>

          <button type="submit" class="btn-pf btn-primary w-full" :disabled="!canSubmit">
            {{ sending ? 'Envoi en cours…' : 'Envoyer le message' }}
          </button>

          <p
            v-if="result"
            class="mt-4 text-center text-sm"
            role="status"
            aria-live="polite"
            :style="{ color: result.type === 'ok' ? 'var(--c-primary)' : '#ef4444' }"
          >
            {{ result.text }}
          </p>
        </form>
      </div>
    </div>
  </section>
</template>
