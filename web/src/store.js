import { reactive, computed } from 'vue'

const STORAGE_KEY = 'fridge-board-auth'
const INVITE_KEY = 'fridge-board-pending-invite'

const restore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

const saved = restore()

export const auth = reactive({
  token: saved?.token || null,
  user: saved?.user || null
})

export const isLoggedIn = computed(() => Boolean(auth.token))

export function setSession ({ token, user }) {
  auth.token = token
  auth.user = user
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
}

export function clearSession () {
  auth.token = null
  auth.user = null
  localStorage.removeItem(STORAGE_KEY)
}

/** 未登入者點邀請連結：先登入／註冊，完成後自動加入該組（規格 §4）。 */
export const pendingInvite = {
  get: () => localStorage.getItem(INVITE_KEY),
  set: (code) => localStorage.setItem(INVITE_KEY, code),
  clear: () => localStorage.removeItem(INVITE_KEY)
}
