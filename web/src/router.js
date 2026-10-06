import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

const routes = [
  { path: '/', redirect: '/groups' },
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
  { path: '/register', name: 'register', component: () => import('./views/RegisterView.vue') },
  { path: '/join/:code', name: 'join', component: () => import('./views/JoinView.vue') },
  {
    path: '/groups',
    name: 'groups',
    component: () => import('./views/GroupsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/groups/:id/board',
    name: 'board',
    component: () => import('./views/BoardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/groups/:id/rewards',
    name: 'rewards',
    component: () => import('./views/RewardsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/groups/:id/points',
    name: 'points',
    component: () => import('./views/PointsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/groups/:id/redemptions',
    name: 'redemptions',
    component: () => import('./views/RedemptionsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/groups/:id/members',
    name: 'members',
    component: () => import('./views/MembersView.vue'),
    meta: { requiresAuth: true }
  },
  { path: '/:pathMatch(.*)*', redirect: '/groups' }
]

export const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const { isLoggedIn } = useAuthStore()
  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if ((to.name === 'login' || to.name === 'register') && isLoggedIn) {
    return { name: 'groups' }
  }
  return true
})
