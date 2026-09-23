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

/** label 會直接出現在錯誤訊息裡，例如「標題至少 1 字」。 */
export function parseText (value, label, { min, max }) {
  if (value === undefined || value === null || value === '') {
    if (min === 0) return ''
    throw new AppError('INVALID_INPUT', `請填寫${label}`)
  }
  if (typeof value !== 'string') throw new AppError('INVALID_INPUT', `${label}格式不正確`)
  const trimmed = value.trim()
  if (trimmed.length < min) throw new AppError('INVALID_INPUT', `${label}至少 ${min} 字`)
  if (trimmed.length > max) throw new AppError('INVALID_INPUT', `${label}最多 ${max} 字`)
  return trimmed
}

export function parseInteger (value, label, { min, max }) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  if (!Number.isInteger(parsed)) throw new AppError('INVALID_INPUT', `${label}必須是整數`)
  if (parsed < min || parsed > max) {
    throw new AppError('INVALID_INPUT', `${label}必須在 ${min}～${max} 之間`)
  }
  return parsed
}

export function parseEmail (value) {
  const normalized = parseText(value, 'email', { min: 3, max: 200 }).toLowerCase()
  if (!EMAIL_RE.test(normalized)) throw new AppError('INVALID_INPUT', 'email 格式不正確')
  return normalized
}

export function parsePassword (value) {
  if (typeof value !== 'string' || value.length < LIMITS.password.min) {
    throw new AppError('INVALID_INPUT', `密碼至少 ${LIMITS.password.min} 碼`)
  }
  if (value.length > LIMITS.password.max) {
    throw new AppError('INVALID_INPUT', '密碼過長')
  }
  return value
}

/** 截止日期選填，只顯示用，過期不影響規則（規格 §5）。 */
export function parseOptionalDate (value, label) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new AppError('INVALID_INPUT', `${label}格式不正確`)
  return parsed
}

export function parseCoordinate (value, label) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new AppError('INVALID_INPUT', `${label}格式不正確`)
  return Math.round(Math.min(Math.max(parsed, 0), 10000))
}
