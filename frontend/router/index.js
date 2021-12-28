import { createRouter, createWebHistory } from '@ionic/vue-router'

const routes = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    component: () => import('@/views/Dashboard.vue'),
  },
  {
    name: 'Help',
    path: '/help',
    component: () => import('@/views/Help.vue'),
  },
  {
    name: 'Settings',
    path: '/settings',
    component: () => import('@/views/Settings.vue'),
  },
  {
    name: 'NotFound',
    path: '/:catchAll(.*)',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

export default router
