<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; index?: number }>()
</script>

<template>
  <header v-reveal class="mb-14 text-center">
    <p
      v-if="index !== undefined"
      class="mb-3 font-mono text-sm tracking-[0.3em]"
      :style="{ color: 'var(--c-primary)' }"
    >
      {{ String(index).padStart(2, '0') }}
    </p>

    <h2 class="text-[clamp(1.9rem,4.5vw,3rem)]">{{ title }}</h2>

    <p
      v-if="subtitle"
      class="mx-auto mt-4 max-w-2xl text-lg"
      :style="{ color: 'var(--c-text-muted)' }"
    >
      {{ subtitle }}
    </p>

    <div
      aria-hidden="true"
      class="mx-auto mt-6 h-1 w-20 rounded-full"
      :style="{ background: 'var(--c-gradient)' }"
    />
  </header>
</template>
