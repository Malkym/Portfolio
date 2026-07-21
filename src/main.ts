import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router, syncAdminPath } from './router'
import { revealDirective } from '@shared/composables/useReveal'
import './assets/styles/main.css'

/**
 * Le chemin d'administration est résolu AVANT `app.use(router)`.
 *
 * Il est configurable côté serveur (`ADMIN_PATH`) et peut donc différer de
 * celui compilé dans le bundle. L'ordre est critique : Vue Router déclenche
 * sa navigation initiale au moment de `app.use(router)`, pas au montage.
 * Toute route ajoutée après coup arrive trop tard — l'URL a déjà été traitée
 * et renvoyée sur l'accueil par la route de repli, rendant l'admin inaccessible.
 *
 * Sans surcoût pour les visiteurs : aucune requête n'est émise quand l'URL
 * correspond déjà à une route connue.
 */
syncAdminPath().finally(() => {
  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  // `v-reveal` : révélation au scroll, disponible partout sans import.
  app.directive('reveal', revealDirective)

  app.mount('#app')
})
