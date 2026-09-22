/** 系統邊界的輸入驗證。前端也擋一次，但以這裡為準。 */

export class AppError extends Error {
  constructor (code, message, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

/** 欄位長度與範圍，對應 design.md 的「待決定」表。 */
export const LIMITS = {
  password: { min: 8, max: 72 },
  displayName: { min: 1, max: 20 },
  groupName: { min: 1, max: 30 },
  taskTitle: { min: 1, max: 30 },
  taskDescription: { min: 0, max: 200 },
  rewardName: { min: 1, max: 30 },
  rewardDescription: { min: 0, max: 200 },
  points: { min: 1, max: 100 }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function str (value, field, { min, max }, { optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional || min === 0) return ''
    throw new AppError('INVALID_INPUT', `請填寫${field}`)
  }
  if (typeof value !== 'string') throw new AppError('INVALID_INPUT', `${field}格式不正確`)
  const trimmed = value.trim()
  if (trimmed.length < min) throw new AppError('INVALID_INPUT', `${field}至少 ${min} 字`)
  if (trimmed.length > max) throw new AppError('INVALID_INPUT', `${field}最多 ${max} 字`)
  return trimmed
}

export function int (value, field, { min, max }) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  if (!Number.isInteger(n)) throw new AppError('INVALID_INPUT', `${field}必須是整數`)
  if (n < min || n > max) throw new AppError('INVALID_INPUT', `${field}必須在 ${min}～${max} 之間`)
  return n
}

export function email (value) {
  const v = str(value, 'email', { min: 3, max: 200 }).toLowerCase()
  if (!EMAIL_RE.test(v)) throw new AppError('INVALID_INPUT', 'email 格式不正確')
  return v
}

export function password (value) {
  if (typeof value !== 'string' || value.length < LIMITS.password.min) {
    throw new AppError('INVALID_INPUT', `密碼至少 ${LIMITS.password.min} 碼`)
  }
  if (value.length > LIMITS.password.max) {
    throw new AppError('INVALID_INPUT', '密碼過長')
  }
  return value
}

/** 截止日期選填，只顯示用，過期不影響規則（規格 §5）。 */
export function optionalDate (value, field) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new AppError('INVALID_INPUT', `${field}格式不正確`)
  return d
}

export function coordinate (value, field) {
  const n = Number(value)
  if (!Number.isFinite(n)) throw new AppError('INVALID_INPUT', `${field}格式不正確`)
  return Math.round(Math.min(Math.max(n, 0), 10000))
}
