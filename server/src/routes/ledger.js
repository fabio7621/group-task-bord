import { Router } from 'express'
import { ObjectId } from 'mongodb'
import { col } from '../db.js'
import { requireAuth, requireMember } from '../auth.js'
import { AppError } from '../validate.js'
import { balancesOf } from '../services/points.js'
import { memberNames, shapeRedemption, userNames } from '../services/shape.js'
import { broadcast } from '../realtime.js'

const router = Router({ mergeParams: true })
router.use(requireAuth, requireMember)

const REF_LABEL = {
  earn: (ref) => ref?.title || '任務',
  redeem: (ref) => ref?.name || '獎品',
  void: (ref) => ref?.reason || '作廢'
}

/** 餘額由交易紀錄加總（規格 §6、design.md §8）。 */
router.get('/points', async (req, res, next) => {
  try {
    const [balances, transactions] = await Promise.all([
      balancesOf(req.groupId, req.user._id),
      col('pointTx').find({ groupId: req.groupId, holderId: req.user._id }).sort({ at: -1 }).limit(200).toArray()
    ])
    const names = await userNames([
      ...balances.map((b) => b.issuerId),
      ...transactions.map((tx) => tx.issuerId)
    ])

    res.json({
      data: {
        balances: balances.map((b) => ({
          issuerId: String(b.issuerId),
          issuerName: names.get(String(b.issuerId)) || '已離開的成員',
          amount: b.amount
        })),
        transactions: transactions.map((tx) => ({
          id: String(tx._id),
          at: tx.at.toISOString(),
          kind: tx.kind,
          issuerName: names.get(String(tx.issuerId)) || '已離開的成員',
          amount: tx.amount,
          label: REF_LABEL[tx.kind]?.(tx.ref) ?? ''
        }))
      }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/redemptions', async (req, res, next) => {
  try {
    const [mine, received] = await Promise.all([
      col('redemptions').find({ groupId: req.groupId, buyerId: req.user._id }).sort({ createdAt: -1 }).toArray(),
      col('redemptions').find({ groupId: req.groupId, ownerId: req.user._id }).sort({ createdAt: -1 }).toArray()
    ])

    const all = [...mine, ...received]
    const [names, current] = await Promise.all([
      userNames(all.flatMap((r) => [r.ownerId, r.buyerId])),
      memberNames(req.groupId)
    ])
    const withOwnerLeft = (r) => ({
      ...shapeRedemption(r, names),
      ownerLeft: !current.has(String(r.ownerId))
    })

    res.json({ data: { mine: mine.map(withOwnerLeft), received: received.map(withOwnerLeft) } })
  } catch (error) {
    next(error)
  }
})

/** 只有提供者能按「已兌現」（design.md §9）。 */
router.post('/redemptions/:redemptionId/fulfill', async (req, res, next) => {
  try {
    let redemptionId
    try {
      redemptionId = new ObjectId(req.params.redemptionId)
    } catch {
      throw new AppError('NOT_FOUND', '找不到這筆兌換紀錄', 404)
    }

    const { matchedCount } = await col('redemptions').updateOne(
      { _id: redemptionId, groupId: req.groupId, ownerId: req.user._id, status: 'pending' },
      { $set: { status: 'fulfilled', fulfilledAt: new Date() } }
    )
    if (!matchedCount) throw new AppError('NOT_FOUND', '這筆紀錄不是待兌現狀態', 404)

    broadcast(req.groupId, 'rewards:changed', { groupId: String(req.groupId) })
    res.json({ data: { id: String(redemptionId), status: 'fulfilled' } })
  } catch (error) {
    next(error)
  }
})

export default router
