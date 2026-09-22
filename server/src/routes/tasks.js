import { Router } from 'express'
import { ObjectId } from 'mongodb'
import { col, docOf, withTx } from '../db.js'
import { requireAuth, requireMember } from '../auth.js'
import { AppError, LIMITS, coordinate, int, optionalDate, str } from '../validate.js'
import { postTx } from '../services/points.js'
import { memberNames, nextFreePosition, shapeTask, BOARD, NOTE } from '../services/shape.js'
import { broadcast } from '../realtime.js'

const router = Router({ mergeParams: true })
router.use(requireAuth, requireMember)

const isMe = (a, b) => String(a) === String(b)

async function loadTask (req) {
  let taskId
  try {
    taskId = new ObjectId(req.params.taskId)
  } catch {
    throw new AppError('NOT_FOUND', '找不到這個任務', 404)
  }
  const task = await col('tasks').findOne({ _id: taskId, groupId: req.groupId })
  if (!task) throw new AppError('NOT_FOUND', '找不到這個任務', 404)
  return task
}

async function emitTask (groupId, task) {
  const names = await memberNames(groupId)
  broadcast(groupId, 'task:upsert', shapeTask(task, names))
}

router.get('/', async (req, res, next) => {
  try {
    const [tasks, names] = await Promise.all([
      col('tasks').find({ groupId: req.groupId }).sort({ createdAt: 1 }).toArray(),
      memberNames(req.groupId)
    ])
    res.json({ data: { board: BOARD, note: NOTE, tasks: tasks.map((t) => shapeTask(t, names)) } })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const existing = await col('tasks').find({ groupId: req.groupId }).toArray()
    const position = nextFreePosition(existing)

    const task = {
      groupId: req.groupId,
      title: str(req.body.title, '標題', LIMITS.taskTitle),
      description: str(req.body.description, '說明', LIMITS.taskDescription, { optional: true }),
      points: int(req.body.points, '點數', LIMITS.points),
      dueDate: optionalDate(req.body.dueDate, '截止日期'),
      status: 'open',
      authorId: req.user._id,
      assigneeId: null,
      submittedAt: null,
      completedAt: null,
      x: position.x,
      y: position.y,
      createdAt: new Date()
    }
    const { insertedId } = await col('tasks').insertOne(task)
    const saved = { ...task, _id: insertedId }

    await emitTask(req.groupId, saved)
    res.json({ data: shapeTask(saved, await memberNames(req.groupId)) })
  } catch (error) {
    next(error)
  }
})

/** 只有「待認領」時發布者可以修改或刪除（規格 §5）。 */
router.patch('/:taskId', async (req, res, next) => {
  try {
    const task = await loadTask(req)
    if (!isMe(task.authorId, req.user._id)) throw new AppError('FORBIDDEN', '只有發布者可以修改', 403)
    if (task.status !== 'open') throw new AppError('TASK_NOT_OPEN', '任務已被認領，不能修改')

    const update = {
      title: str(req.body.title, '標題', LIMITS.taskTitle),
      description: str(req.body.description, '說明', LIMITS.taskDescription, { optional: true }),
      points: int(req.body.points, '點數', LIMITS.points),
      dueDate: optionalDate(req.body.dueDate, '截止日期')
    }
    const updated = docOf(await col('tasks').findOneAndUpdate(
      { _id: task._id, status: 'open' },
      { $set: update },
      { returnDocument: 'after' }
    ))
    if (!updated) throw new AppError('TASK_NOT_OPEN', '任務已被認領，不能修改')

    await emitTask(req.groupId, updated)
    res.json({ data: shapeTask(updated, await memberNames(req.groupId)) })
  } catch (error) {
    next(error)
  }
})

router.delete('/:taskId', async (req, res, next) => {
  try {
    const task = await loadTask(req)
    if (!isMe(task.authorId, req.user._id)) throw new AppError('FORBIDDEN', '只有發布者可以刪除', 403)

    const { deletedCount } = await col('tasks').deleteOne({ _id: task._id, status: 'open' })
    if (!deletedCount) throw new AppError('TASK_NOT_OPEN', '任務已被認領，不能刪除')

    await col('reminders').deleteMany({ taskId: task._id })
    broadcast(req.groupId, 'task:remove', { id: String(task._id) })
    res.json({ data: { id: String(task._id) } })
  } catch (error) {
    next(error)
  }
})

/** 先認領者得：用一次條件更新決定勝負，不依賴前端狀態（規格 §5、§10）。 */
router.post('/:taskId/claim', async (req, res, next) => {
  try {
    const task = await loadTask(req)
    if (isMe(task.authorId, req.user._id)) {
      throw new AppError('FORBIDDEN', '不能認領自己發布的任務', 403)
    }

    const claimed = docOf(await col('tasks').findOneAndUpdate(
      { _id: task._id, status: 'open' },
      { $set: { status: 'claimed', assigneeId: req.user._id } },
      { returnDocument: 'after' }
    ))
    if (!claimed) throw new AppError('TASK_ALREADY_CLAIMED', '這個任務已被認領', 409)

    await emitTask(req.groupId, claimed)
    res.json({ data: shapeTask(claimed, await memberNames(req.groupId)) })
  } catch (error) {
    next(error)
  }
})

router.post('/:taskId/submit', async (req, res, next) => {
  try {
    const task = await loadTask(req)
    if (!isMe(task.assigneeId, req.user._id)) throw new AppError('FORBIDDEN', '只有執行者可以回報完成', 403)

    const submitted = docOf(await col('tasks').findOneAndUpdate(
      { _id: task._id, status: 'claimed', assigneeId: req.user._id },
      { $set: { status: 'submitted', submittedAt: new Date() } },
      { returnDocument: 'after' }
    ))
    if (!submitted) throw new AppError('TASK_STATE_CHANGED', '任務狀態已改變', 409)

    await emitTask(req.groupId, submitted)
    res.json({ data: shapeTask(submitted, await memberNames(req.groupId)) })
  } catch (error) {
    next(error)
  }
})

/** 進行中或待確認都可以放棄，任務退回待認領（規格 §5）。 */
router.post('/:taskId/abandon', async (req, res, next) => {
  try {
    const task = await loadTask(req)
    if (!isMe(task.assigneeId, req.user._id)) throw new AppError('FORBIDDEN', '只有執行者可以放棄', 403)

    const released = docOf(await col('tasks').findOneAndUpdate(
      { _id: task._id, assigneeId: req.user._id, status: { $in: ['claimed', 'submitted'] } },
      { $set: { status: 'open', assigneeId: null, submittedAt: null } },
      { returnDocument: 'after' }
    ))
    if (!released) throw new AppError('TASK_STATE_CHANGED', '任務狀態已改變', 409)

    await col('reminders').deleteMany({ taskId: task._id })
    await emitTask(req.groupId, released)
    res.json({ data: shapeTask(released, await memberNames(req.groupId)) })
  } catch (error) {
    next(error)
  }
})

/** 發布者確認 → 發出發布者的個人點數給執行者（規格 §5、§6）。 */
router.post('/:taskId/confirm', async (req, res, next) => {
  try {
    const task = await loadTask(req)
    if (!isMe(task.authorId, req.user._id)) throw new AppError('FORBIDDEN', '只有發布者可以確認', 403)

    const completed = await withTx(async (session) => {
      const done = docOf(await col('tasks').findOneAndUpdate(
        { _id: task._id, status: 'submitted' },
        { $set: { status: 'done', completedAt: new Date() } },
        { session, returnDocument: 'after' }
      ))
      if (!done) throw new AppError('TASK_STATE_CHANGED', '任務狀態已改變', 409)

      await postTx(session, {
        groupId: req.groupId,
        holderId: done.assigneeId,
        issuerId: done.authorId,
        amount: done.points,
        kind: 'earn',
        ref: { taskId: done._id, title: done.title }
      })
      await col('reminders').deleteMany({ taskId: task._id }, { session })
      return done
    })

    await emitTask(req.groupId, completed)
    broadcast(req.groupId, 'points:changed', { groupId: String(req.groupId) })
    res.json({ data: shapeTask(completed, await memberNames(req.groupId)) })
  } catch (error) {
    next(error)
  }
})

/** 只有發布者能拖曳自己的便利貼，放開後才儲存並廣播（規格 §9、§10）。 */
router.patch('/:taskId/position', async (req, res, next) => {
  try {
    const task = await loadTask(req)
    if (!isMe(task.authorId, req.user._id)) {
      throw new AppError('FORBIDDEN', '只能移動自己發布的便利貼', 403)
    }

    const x = coordinate(req.body.x, 'x')
    const y = coordinate(req.body.y, 'y')
    await col('tasks').updateOne({ _id: task._id }, { $set: { x, y } })

    broadcast(req.groupId, 'task:moved', { id: String(task._id), x, y })
    res.json({ data: { id: String(task._id), x, y } })
  } catch (error) {
    next(error)
  }
})

/** 待確認時執行者可以發出提醒，每個任務每天一次（design.md 待決定）。 */
router.post('/:taskId/remind', async (req, res, next) => {
  try {
    const task = await loadTask(req)
    if (!isMe(task.assigneeId, req.user._id)) throw new AppError('FORBIDDEN', '只有執行者可以提醒', 403)
    if (task.status !== 'submitted') throw new AppError('TASK_STATE_CHANGED', '任務不在待確認狀態', 409)

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recent = await col('reminders').findOne({ taskId: task._id, fromUserId: req.user._id, at: { $gt: since } })
    if (recent) throw new AppError('REMINDER_TOO_SOON', '同一個任務每天只能提醒一次')

    await col('reminders').insertOne({
      taskId: task._id,
      groupId: req.groupId,
      fromUserId: req.user._id,
      toUserId: task.authorId,
      at: new Date()
    })

    res.json({ data: { ok: true } })
  } catch (error) {
    next(error)
  }
})

export default router
