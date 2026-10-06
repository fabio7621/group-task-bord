import { Router } from 'express'

import { col, withTx } from '../db.js'
import { requireAuth, requireMember } from '../middleware/auth.js'
import { AppError, LIMITS, parseText } from '../validate.js'
import { balancesOf } from '../services/points.js'
import { leaveGroup } from '../services/membership.js'
import { memberNames } from '../services/shape.js'
import { broadcast } from '../realtime.js'

const router = Router()
router.use(requireAuth)

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newInviteCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('')

router.get('/', async (req, res, next) => {
  try {
    const memberships = await col('members').find({ userId: req.user._id }).toArray()
    const groupIds = memberships.map((membership) => membership.groupId)
    const groups = await col('groups').find({ _id: { $in: groupIds } }).toArray()

    const cards = await Promise.all(groups.map(async (group) => ({
      id: String(group._id),
      name: group.name,
      memberCount: await col('members').countDocuments({ groupId: group._id }),
      openTaskCount: await col('tasks').countDocuments({ groupId: group._id, status: 'open' }),
      awaitingMyConfirmCount: await col('tasks').countDocuments({
        groupId: group._id,
        status: 'submitted',
        authorId: req.user._id
      })
    })))

    cards.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
    res.json({ data: cards })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const name = parseText(req.body.name, '組別名稱', LIMITS.groupName)
    const now = new Date()

    let group = null
    for (let attempt = 0; attempt < 5 && !group; attempt++) {
      const candidate = { name, inviteCode: newInviteCode(), createdBy: req.user._id, createdAt: now }
      try {
        const { insertedId } = await col('groups').insertOne(candidate)
        group = { ...candidate, _id: insertedId }
      } catch (error) {
        if (error?.code !== 11000) throw error
      }
    }
    if (!group) throw new AppError('SERVER_ERROR', '請再試一次', 500)

    // 建立者自動成為第一位成員（規格 §4）
    await col('members').insertOne({ groupId: group._id, userId: req.user._id, joinedAt: now })

    res.json({ data: { id: String(group._id), name: group.name, inviteCode: group.inviteCode } })
  } catch (error) {
    next(error)
  }
})

/** 邀請碼與邀請連結共用這一套驗證（規格 §4）。 */
router.post('/join', async (req, res, next) => {
  try {
    const code = parseText(req.body.code, '邀請碼', { min: 1, max: 32 }).toUpperCase()
    const group = await col('groups').findOne({ inviteCode: code })
    if (!group) throw new AppError('INVALID_INVITE', '邀請連結已失效', 404)

    const existing = await col('members').findOne({ groupId: group._id, userId: req.user._id })
    if (!existing) {
      await col('members').insertOne({ groupId: group._id, userId: req.user._id, joinedAt: new Date() })
      broadcast(group._id, 'members:changed', { groupId: String(group._id) })
    }

    res.json({ data: { id: String(group._id), name: group.name, alreadyMember: Boolean(existing) } })
  } catch (error) {
    if (error?.code === 11000) return res.json({ data: { alreadyMember: true } })
    next(error)
  }
})

router.get('/:groupId', requireMember, async (req, res, next) => {
  try {
    const group = await col('groups').findOne({ _id: req.groupId })
    const members = await col('members').aggregate([
      { $match: { groupId: req.groupId } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $sort: { joinedAt: 1 } }
    ]).toArray()

    res.json({
      data: {
        id: String(group._id),
        name: group.name,
        inviteCode: group.inviteCode,
        members: members.map((member) => ({
          id: String(member.userId),
          displayName: member.user.displayName,
          joinedAt: member.joinedAt.toISOString(),
          isMe: String(member.userId) === String(req.user._id)
        }))
      }
    })
  } catch (error) {
    next(error)
  }
})

/** 離開前的確認清單，只做提醒（規格 §8）。 */
router.get('/:groupId/leave-preview', requireMember, async (req, res, next) => {
  try {
    const groupId = req.groupId
    const me = req.user._id
    const names = await memberNames(groupId)

    const [held, issuedToOthers, rewards, myTasks, executingTasks, pendingRedemptions, memberCount] =
      await Promise.all([
        balancesOf(groupId, me),
        col('balances').find({ groupId, issuerId: me, amount: { $gt: 0 } }).toArray(),
        col('rewards').find({ groupId, ownerId: me, active: true }).toArray(),
        col('tasks').find({ groupId, authorId: me }).toArray(),
        col('tasks').find({ groupId, assigneeId: me, status: { $in: ['claimed', 'submitted'] } }).toArray(),
        col('redemptions').find({ groupId, ownerId: me, status: 'pending' }).toArray(),
        col('members').countDocuments({ groupId })
      ])

    res.json({
      data: {
        heldPoints: held.map((balance) => ({
          issuerName: names.get(String(balance.issuerId)) || '已離開的成員',
          amount: balance.amount
        })),
        pointsOthersHold: issuedToOthers.reduce((sum, balance) => sum + balance.amount, 0),
        rewards: rewards.map((reward) => reward.name),
        tasksRemoved: myTasks.map((task) => task.title),
        tasksReturned: executingTasks.map((task) => task.title),
        redemptionsVoided: pendingRedemptions.map((redemption) => ({
          rewardName: redemption.rewardName,
          buyerName: names.get(String(redemption.buyerId)) || '已離開的成員'
        })),
        isLastMember: memberCount === 1
      }
    })
  } catch (error) {
    next(error)
  }
})

/** 規格 §8 的表格，全部在同一個資料庫交易中完成。 */
router.post('/:groupId/leave', requireMember, async (req, res, next) => {
  try {
    const groupId = req.groupId
    const me = req.user._id

    const dissolved = await withTx((session) => leaveGroup(session, { groupId, userId: me }))

    if (!dissolved) {
      broadcast(groupId, 'members:changed', { groupId: String(groupId) })
      broadcast(groupId, 'board:changed', { groupId: String(groupId) })
      broadcast(groupId, 'rewards:changed', { groupId: String(groupId) })
      broadcast(groupId, 'points:changed', { groupId: String(groupId) })
    }

    res.json({ data: { dissolved } })
  } catch (error) {
    next(error)
  }
})

export default router
