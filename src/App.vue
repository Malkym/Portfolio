<script setup lang="ts">
import { useRoute } from 'vue-router'

// La résolution du chemin admin se fait dans main.ts, avant le montage :
// ici, elle interviendrait après la première navigation, donc trop tard.
const route = useRoute()
</script>

<template>
  <!--
    Un seul point de montage pour le site public et l'admin.
    L'admin n'a ni layout ni navigation commune : rien dans le DOM public
    ne trahit son existence.
  -->
  <a v-if="!route.meta.admin" href="#main" class="sr-only-focusable btn-pf btn-primary fixed left-4 top-4 z-[100]">
    Aller au contenu
  </a>

  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 220ms var(--t-ease);
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
