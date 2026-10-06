import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const TOKEN_TTL = '30d'

export function secret () {
  const value = process.env.JWT_SECRET
  if (!value) throw new Error('缺少 JWT_SECRET，請參考 .env.example 設定')
  return value
}

export const hashPassword = (plain) => bcrypt.hash(plain, 10)
export const checkPassword = (plain, hash) => bcrypt.compare(plain, hash)

export const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, secret(), { expiresIn: TOKEN_TTL })

/** 回傳 userId 字串，失敗回 null。API 與 WebSocket 共用同一套驗證（規格 §3）。 */
export function readToken (token) {
  if (!token) return null
  try {
    return jwt.verify(token, secret()).sub
  } catch {
    return null
  }
}

export const publicUser = (user) => ({
  id: String(user._id),
  email: user.email,
  displayName: user.displayName
})
