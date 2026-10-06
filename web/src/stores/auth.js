import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '../api/auth.js'
import { groupsApi } from '../api/groups.js'
import { router } from '../router.js'

const STORAGE_KEY = 'fridge-board-auth'
const INVITE_KEY = 'fridge-board-pending-invite'

const restore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const saved = restore()
  const token = ref(saved?.token || null)
  const user = ref(saved?.user || null)
  const isLoggedIn = computed(() => Boolean(token.value))

  function setSession (session) {
    token.value = session.token
    user.value = session.user
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: session.token, user: session.user }))
  }

  /**
   * 登出或 token 失效：清掉登入狀態後整頁重新載入到登入頁。
   * 整頁載入會一併清空所有 store 與即時連線，換帳號登入時不會看到上一個人的資料。
   */
  function clearSession (redirect = '') {
    localStorage.removeItem(STORAGE_KEY)
    const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
    window.location.replace(`/login${query}`)
  }

  const login = async (credentials) => setSession(await authApi.login(credentials))
  const register = async (form) => setSession(await authApi.register(form))

  /** 未登入者點邀請連結：先登入／註冊，完成後自動加入該組（規格 §4）。 */
  const rememberInvite = (code) => localStorage.setItem(INVITE_KEY, code)

  /**
   * 登入／註冊成功後要去哪裡：
   * 有待處理的邀請碼就先加入該組並進任務版，否則回到原本要去的頁面（規格 §4）。
   */
  async function landAfterAuth (redirect) {
    const code = localStorage.getItem(INVITE_KEY)
    if (code) {
      localStorage.removeItem(INVITE_KEY)
      try {
        const group = await groupsApi.join(code)
        if (group?.id) return router.replace({ name: 'board', params: { id: group.id } })
      } catch {
        // 邀請碼失效就當作一般登入處理
      }
    }
    return router.replace(typeof redirect === 'string' && redirect ? redirect : { name: 'groups' })
  }

  return { token, user, isLoggedIn, setSession, clearSession, login, register, rememberInvite, landAfterAuth }
})
