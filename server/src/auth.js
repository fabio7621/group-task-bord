import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { col } from './db.js'
import { AppError } from './validate.js'

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

export async function requireAuth (req, res, next) {
  const header = req.get('authorization') || ''
  const userId = readToken(header.startsWith('Bearer ') ? header.slice(7) : null)
  if (!userId) return next(new AppError('UNAUTHORIZED', '請先登入', 401))
  const user = await col('users').findOne({ _id: new ObjectId(userId) })
  if (!user) return next(new AppError('UNAUTHORIZED', '請先登入', 401))
  req.user = user
  next()
}

/** 組別內沒有角色之分，只需確認是成員（規格 §4）。 */
export async function requireMember (req, res, next) {
  let groupId
  try {
    groupId = new ObjectId(req.params.groupId)
  } catch {
    return next(new AppError('NOT_FOUND', '找不到這個組別', 404))
  }
  const membership = await col('members').findOne({ groupId, userId: req.user._id })
  if (!membership) return next(new AppError('NOT_MEMBER', '你不是這個組別的成員', 403))
  req.groupId = groupId
  next()
}

export const publicUser = (user) => ({
  id: String(user._id),
  email: user.email,
  displayName: user.displayName
})
