import { useAuthStore } from '../stores/auth.js'
import { router } from '../router.js'

export class ApiError extends Error {
  constructor (code, message) {
    super(message)
    this.code = code
  }
}

export async function api (path, { method = 'GET', body } = {}) {
  const auth = useAuthStore()
  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new ApiError('NETWORK', '連不上伺服器，請確認服務是否啟動')
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const { code = 'SERVER_ERROR', message = '發生錯誤，請稍後再試' } = payload.error || {}
    // 帶著 token 還 401 = token 過期或無效：回登入頁並記住原本要去的頁面
    // （登入時密碼錯誤也是 401，但那時沒有 token，只要顯示錯誤訊息）
    if (response.status === 401 && auth.token) {
      auth.clearSession(router.currentRoute.value.fullPath)
    }
    throw new ApiError(code, message)
  }

  return payload.data
}

export const get = (path) => api(path)
export const post = (path, body) => api(path, { method: 'POST', body })
export const patch = (path, body) => api(path, { method: 'PATCH', body })
export const del = (path) => api(path, { method: 'DELETE' })
