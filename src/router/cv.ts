import { type RouteRecordRaw } from 'vue-router'

const CVDisplay = () => import('@site/components/CVDisplay.vue')

export const cvPublicRoutes: RouteRecordRaw[] = [
  { path: '/cv/:slug', name: 'cv-public', component: CVDisplay, props: true },
]
