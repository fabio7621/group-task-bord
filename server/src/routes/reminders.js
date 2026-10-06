import { Router } from 'express'
import { col } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

/** 登入後跳出的提醒列表，跨組別（規格 §5、design.md §4-3）。 */
router.get('/', async (req, res, next) => {
  try {
    const reminders = await col('reminders').aggregate([
      { $match: { toUserId: req.user._id } },
      { $sort: { at: -1 } },
      { $lookup: { from: 'tasks', localField: 'taskId', foreignField: '_id', as: 'task' } },
      { $unwind: '$task' },
      { $match: { 'task.status': 'submitted' } },
      { $lookup: { from: 'groups', localField: 'groupId', foreignField: '_id', as: 'group' } },
      { $unwind: '$group' },
      { $lookup: { from: 'users', localField: 'fromUserId', foreignField: '_id', as: 'from' } },
      { $unwind: '$from' }
    ]).toArray()

    res.json({
      data: reminders.map((reminder) => ({
        id: String(reminder._id),
        groupId: String(reminder.groupId),
        groupName: reminder.group.name,
        taskId: String(reminder.taskId),
        taskTitle: reminder.task.title,
        fromName: reminder.from.displayName,
        at: reminder.at.toISOString()
      }))
    })
  } catch (error) {
    next(error)
  }
})

export default router
