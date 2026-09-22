import { col } from '../db.js'
import { voidAllPointsFor } from './points.js'

/**
 * 規格 §8 的處理表，必須在呼叫端給的交易裡執行。
 * 回傳 true 表示最後一位成員離開，組別已解散。
 */
export async function leaveGroup (session, { groupId, userId }) {
  await voidAllPointsFor(session, { groupId, userId, reason: '發行者離開組別' })

  await col('rewards').updateMany(
    { groupId, ownerId: userId },
    { $set: { active: false } },
    { session }
  )
  await col('redemptions').updateMany(
    { groupId, ownerId: userId, status: 'pending' },
    { $set: { status: 'void' } },
    { session }
  )
  await col('tasks').updateMany(
    { groupId, assigneeId: userId, status: { $in: ['claimed', 'submitted'] } },
    { $set: { status: 'open', assigneeId: null, submittedAt: null } },
    { session }
  )

  const authored = await col('tasks').find({ groupId, authorId: userId }, { session }).toArray()
  await col('tasks').deleteMany({ groupId, authorId: userId }, { session })
  await col('reminders').deleteMany({
    $or: [
      { toUserId: userId },
      { fromUserId: userId },
      { taskId: { $in: authored.map((task) => task._id) } }
    ]
  }, { session })
  await col('members').deleteOne({ groupId, userId }, { session })

  const remaining = await col('members').countDocuments({ groupId }, { session })
  if (remaining > 0) return false

  // 最後一位成員離開，組別解散，所有資料刪除（規格 §4）
  for (const name of ['tasks', 'rewards', 'redemptions', 'pointTx', 'balances', 'reminders']) {
    await col(name).deleteMany({ groupId }, { session })
  }
  await col('groups').deleteOne({ _id: groupId }, { session })
  return true
}
