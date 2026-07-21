<script setup lang="ts">
import { computed } from 'vue'
import DynamicIcon from '../../shared/components/DynamicIcon.vue'
import SectionHeader from './SectionHeader.vue'
import type { SkillCategory, Skill } from '@shared/types/portfolio.types'

const props = defineProps<{
  title: string
  subtitle?: string
  categories: SkillCategory[]
  index?: number
}>()

/**
 * Normalise les compétences d'une catégorie.
 * L'admin stocke les compétences en JSON ou au format texte (Nom | Niveau | Score),
 * on les convertit en tableau d'objets Skill pour le template.
 */
function parseSkills(raw: unknown): Skill[] {
  if (Array.isArray(raw)) return raw as Skill[]
  if (typeof raw !== 'string' || !raw.trim()) return []

  try {
    return JSON.parse(raw) as Skill[]
  } catch {
    return raw.split('\n').filter(Boolean).map((line, i) => {
      const parts = line.split('|').map((s) => s.trim())
      return {
        id: `skill-${i}`,
        name: parts[0] || '',
        level: (parts[1] as Skill['level']) || 'Mid',
        score: Number(parts[2]) || 0,
        icon: '',
        order: i,
      }
    })
  }
}

const normalized = computed(() =>
  props.categories.map((cat) => ({
    ...cat,
    skills: parseSkills(cat.skills),
  })),
)

const LEVEL_SCORE: Record<string, number> = {
  Junior: 45,
  Mid: 65,
  Senior: 85,
  Expert: 97,
}
</script>

<template>
  <section id="skills" class="section-pf" :style="{ background: 'var(--c-surface-alt)' }">
    <div class="container-pf">
      <SectionHeader :title="title" :subtitle="subtitle" :index="index" />

      <div class="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(category, i) in normalized"
          :key="category.id"
          v-reveal="i * 80"
          class="card-pf p-7"
        >
          <h3 class="mb-6 flex items-center gap-3 text-lg">
            <span v-if="category.icon" aria-hidden="true">
              <DynamicIcon :name="category.icon" :size="24" />
            </span>
            {{ category.name }}
          </h3>

          <ul class="space-y-5">
            <li v-for="skill in category.skills" :key="skill.id">
              <div class="mb-2 flex items-baseline justify-between gap-3">
                <span class="text-sm font-medium">{{ skill.name }}</span>
                <span class="font-mono text-xs" :style="{ color: 'var(--c-text-muted)' }">
                  {{ skill.level }}
                </span>
              </div>

              <!--
                role="meter" plutôt qu'une simple <div> décorative : un lecteur
                d'écran annonce alors la valeur, au lieu d'ignorer complètement
                l'information de niveau.
              -->
              <div
                class="h-1.5 w-full overflow-hidden rounded-full"
                :style="{ background: 'var(--c-border)' }"
                role="meter"
                :aria-valuenow="skill.score || LEVEL_SCORE[skill.level] || 50"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Niveau en ${skill.name} : ${skill.level}`"
              >
                <div
                  class="h-full rounded-full transition-[width] duration-1000 ease-out"
                  :style="{
                    width: `${skill.score || LEVEL_SCORE[skill.level] || 50}%`,
                    background: 'var(--c-gradient)',
                  }"
                />
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
