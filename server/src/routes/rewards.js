import { Router } from 'express'
import { ObjectId } from 'mongodb'
import { col, withTx } from '../db.js'
import { requireAuth, requireMember } from '../auth.js'
import { AppError, LIMITS, parseInteger, parseText } from '../validate.js'
import { balancesOf } from '../services/points.js'
import { redeemReward } from '../services/rewards.js'
import { memberNames, shapeReward } from '../services/shape.js'
import { broadcast } from '../realtime.js'

const router = Router({ mergeParams: true })
router.use(requireAuth, requireMember)

async function loadReward (req) {
  let rewardId
  try {
    rewardId = new ObjectId(req.params.rewardId)
  } catch {
    throw new AppError('NOT_FOUND', '找不到這個獎品', 404)
  }
  const reward = await col('rewards').findOne({ _id: rewardId, groupId: req.groupId, active: true })
  if (!reward) throw new AppError('NOT_FOUND', '找不到這個獎品', 404)
  return reward
}

router.get('/', async (req, res, next) => {
  try {
    const [rewards, names, balances] = await Promise.all([
      col('rewards').find({ groupId: req.groupId, active: true }).sort({ createdAt: 1 }).toArray(),
      memberNames(req.groupId),
      balancesOf(req.groupId, req.user._id)
    ])

    res.json({
      data: {
        rewards: rewards.map((reward) => shapeReward(reward, names)),
        myBalances: balances.map((balance) => ({
          issuerId: String(balance.issuerId),
          issuerName: names.get(String(balance.issuerId)) || '已離開的成員',
          amount: balance.amount
        }))
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const reward = {
      groupId: req.groupId,
      ownerId: req.user._id,
      name: parseText(req.body.name, '獎品名稱', LIMITS.rewardName),
      description: parseText(req.body.description, '說明', LIMITS.rewardDescription),
      cost: parseInteger(req.body.cost, '兌換點數', LIMITS.points),
      stock: parseInteger(req.body.stock, '庫存', { min: 1, max: 999 }),
      active: true,
      createdAt: new Date()
    }
    const { insertedId } = await col('rewards').insertOne(reward)

    broadcast(req.groupId, 'rewards:changed', { groupId: String(req.groupId) })
    res.json({ data: shapeReward({ ...reward, _id: insertedId }, await memberNames(req.groupId)) })
  } catch (error) {
    next(error)
  }
})

/** 上架後只能調整庫存或下架，兌換點數不可修改（規格 §7）。 */
router.patch('/:rewardId/stock', async (req, res, next) => {
  try {
    const reward = await loadReward(req)
    if (String(reward.ownerId) !== String(req.user._id)) {
      throw new AppError('FORBIDDEN', '只能調整自己上架的獎品', 403)
    }
    const stock = parseInteger(req.body.stock, '庫存', { min: 0, max: 999 })
    await col('rewards').updateOne({ _id: reward._id }, { $set: { stock } })

    broadcast(req.groupId, 'rewards:changed', { groupId: String(req.groupId) })
    res.json({ data: { id: String(reward._id), stock } })
  } catch (error) {
    next(error)
  }
})

router.delete('/:rewardId', async (req, res, next) => {
  try {
    const reward = await loadReward(req)
    if (String(reward.ownerId) !== String(req.user._id)) {
      throw new AppError('FORBIDDEN', '只能下架自己上架的獎品', 403)
    }
    await col('rewards').updateOne({ _id: reward._id }, { $set: { active: false } })

    broadcast(req.groupId, 'rewards:changed', { groupId: String(req.groupId) })
    res.json({ data: { id: String(reward._id) } })
  } catch (error) {
    next(error)
  }
})

/**
 * 扣點、扣庫存、建立兌換紀錄在同一個資料庫交易裡，任一步失敗就全部不生效（規格 §7）。
 * 庫存與餘額都用條件更新決定勝負，同時兌換只有一人成功。
 */
router.post('/:rewardId/redeem', async (req, res, next) => {
  try {
    const reward = await loadReward(req)
    if (String(reward.ownerId) === String(req.user._id)) {
      throw new AppError('FORBIDDEN', '不能兌換自己上架的獎品', 403)
    }

    const redemption = await withTx((session) => redeemReward(session, {
      groupId: req.groupId,
      rewardId: reward._id,
      buyerId: req.user._id
    }))

    broadcast(req.groupId, 'rewards:changed', { groupId: String(req.groupId) })
    broadcast(req.groupId, 'points:changed', { groupId: String(req.groupId) })
    res.json({ data: { id: String(redemption._id) } })
  } catch (error) {
    next(error)
  }
})

export default router
