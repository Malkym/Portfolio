import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '@site/views/HomePage.vue'

/**
 * Chemin d'accès à l'administration.
 *
 * Il est configurable et n'apparaît nulle part dans l'interface publique.
 * La valeur de build sert de défaut ; le serveur peut en imposer une autre
 * au démarrage (voir `syncAdminPath`). Ce n'est pas un mécanisme de sécurité —
 * la vraie barrière est l'authentification serveur — mais ça évite que
 * l'admin soit trouvable par simple curiosité.
 */
export const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || '/admin-secret'

/**
 * Bases admin actives. Il peut y en avoir deux : celle compilée dans le bundle
 * et celle imposée par le serveur. On les garde toutes pour que la garde de
 * navigation sache reconnaître les deux.
 */
const adminBases = new Set<string>([ADMIN_PATH])

/** Retrouve la base admin d'une URL, ou `null` si ce n'est pas une route admin. */
function adminBaseOf(path: string): string | null {
  for (const base of adminBases) {
    if (path === base || path.startsWith(`${base}/`)) return base
  }
  return null
}

/** L'admin est en import dynamique : son code ne pèse jamais sur le site public. */
const AdminPanel = () => import('@admin/views/AdminPanel.vue')
const AdminLogin = () => import('@admin/views/AdminLogin.vue')

function adminRoutes(base: string): RouteRecordRaw[] {
  return [
    {
      path: `${base}/login`,
      name: 'admin-login',
      component: AdminLogin,
      meta: { admin: true },
    },
    {
      path: `${base}/:tab?`,
      name: 'admin',
      component: AdminPanel,
      meta: { admin: true, requiresAuth: true },
    },
  ]
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    ...adminRoutes(ADMIN_PATH),
    // Toute URL inconnue retombe sur le portfolio plutôt que sur une 404 :
    // un lien mort partagé il y a dix ans mène quand même quelque part.
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved

    // On ne vise une ancre que si elle est déjà dans le DOM. Au premier
    // chargement les sections n'existent pas encore (données asynchrones) :
    // Vue Router émettrait un avertissement pour rien. C'est HomePage qui
    // rejoue le saut une fois le contenu monté.
    if (to.hash && document.querySelector(to.hash)) {
      return { el: to.hash, behavior: 'smooth', top: 88 }
    }

    return { top: 0 }
  },
})

/** URL demandée au tout premier chargement, capturée avant que le routeur n'agisse. */
const INITIAL_PATH =
  typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'

/** La route de repli attrape tout : c'est le signe qu'aucune vraie route ne correspond. */
function isUnmatched(path: string): boolean {
  return router.resolve(path).matched.some((r) => r.path.includes('pathMatch'))
}

/**
 * Aligne le routeur sur le chemin admin réellement configuré côté serveur,
 * pour qu'on puisse changer `ADMIN_PATH` sans reconstruire le front.
 *
 * Doit être appelé AVANT le montage de l'application : les routes ajoutées
 * après la première navigation arrivent trop tard, l'URL a déjà été traitée
 * et renvoyée sur l'accueil par la route de repli.
 *
 * Aucune requête n'est émise quand l'URL correspond déjà à une route connue —
 * un visiteur normal ne paie donc jamais cet aller-retour.
 */
export async function syncAdminPath(): Promise<void> {
  // Deux cas justifient d'interroger le serveur :
  //  - l'URL ne correspond à rien : c'est peut-être un chemin admin personnalisé ;
  //  - l'URL vise le chemin admin compilé : il faut vérifier qu'il est toujours
  //    d'actualité, sinon l'ancien chemin resterait accessible et personnaliser
  //    `ADMIN_PATH` ne servirait à rien.
  // Une URL publique ordinaire ne déclenche aucune requête.
  if (!isUnmatched(INITIAL_PATH) && adminBaseOf(INITIAL_PATH) === null) return

  try {
    const res = await fetch('/api/config')
    const { adminPath } = (await res.json()) as { adminPath: string }

    if (adminPath && !adminBases.has(adminPath)) {
      // `addRoute` remplace toute route portant le même nom : les routes
      // compilées disparaissent donc, et l'ancien chemin cesse de répondre.
      for (const route of adminRoutes(adminPath)) router.addRoute(route)

      adminBases.clear()
      adminBases.add(adminPath)
    }
  } catch {
    // Sans réponse du serveur, le chemin de build reste valable.
  }
}

router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true

  // Garde côté client : confort d'UX uniquement. Toute route API admin
  // revérifie le jeton côté serveur, qui est la seule autorité.
  const token = localStorage.getItem('pf_token')
  if (!token) {
    const base = adminBaseOf(to.path) ?? ADMIN_PATH
    return { path: `${base}/login`, query: { redirect: to.fullPath } }
  }

  return true
})
