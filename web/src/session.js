import { post } from './api.js'
import { pendingInvite } from './store.js'

/**
 * 登入／註冊成功後要去哪裡：
 * 有待處理的邀請碼就先加入該組並進任務版，否則回到原本要去的頁面（規格 §4）。
 */
export async function landAfterAuth (router, route) {
  const code = pendingInvite.get()
  if (code) {
    pendingInvite.clear()
    try {
      const group = await post('/groups/join', { code })
      if (group?.id) return router.replace({ name: 'board', params: { id: group.id } })
    } catch {
      // 邀請碼失效就當作一般登入處理
    }
  }

  const redirect = route.query.redirect
  return router.replace(typeof redirect === 'string' && redirect ? redirect : { name: 'groups' })
}
