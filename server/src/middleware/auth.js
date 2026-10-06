import { ObjectId } from 'mongodb'
import { col } from '../db.js'
import { readToken } from '../auth.js'
import { AppError } from '../validate.js'

// Express 4 不會接 async 的 rejection，DB 出錯時要自己丟給 next，否則 request 會卡住
export async function requireAuth (req, res, next) {
  try {
    const header = req.get('authorization') || ''
    const userId = readToken(header.startsWith('Bearer ') ? header.slice(7) : null)
    if (!userId) return next(new AppError('UNAUTHORIZED', '請先登入', 401))
    const user = await col('users').findOne({ _id: new ObjectId(userId) })
    if (!user) return next(new AppError('UNAUTHORIZED', '請先登入', 401))
    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

/** 組別內沒有角色之分，只需確認是成員（規格 §4）。 */
export async function requireMember (req, res, next) {
  let groupId
  try {
    groupId = new ObjectId(req.params.groupId)
  } catch {
    return next(new AppError('NOT_FOUND', '找不到這個組別', 404))
  }
  try {
    const membership = await col('members').findOne({ groupId, userId: req.user._id })
    if (!membership) return next(new AppError('NOT_MEMBER', '你不是這個組別的成員', 403))
    req.groupId = groupId
    next()
  } catch (error) {
    next(error)
  }
}
