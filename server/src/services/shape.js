import { col } from '../db.js'

/** 便利貼尺寸與任務版大小，和前端 styles.css 的 --note-w / --board-w 一致。 */
export const NOTE = { width: 232, height: 150, gapX: 20, gapY: 20 }
export const BOARD = { width: 1100, height: 660 }

/** 新任務放在左上角第一個沒被佔用的格子（design.md 待決定）。 */
export function nextFreePosition (existing) {
  const stepX = NOTE.width + NOTE.gapX
  const stepY = NOTE.height + NOTE.gapY
  const cols = Math.max(1, Math.floor(BOARD.width / stepX))
  const rows = Math.max(1, Math.floor(BOARD.height / stepY))

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cols; column++) {
      const x = 16 + column * stepX
      const y = 16 + row * stepY
      const taken = existing.some(
        (task) => Math.abs(task.x - x) < stepX / 2 && Math.abs(task.y - y) < stepY / 2
      )
      if (!taken) return { x, y }
    }
  }
  // 版面滿了就疊在左上角，使用者可以再拖開。
  return { x: 16 + (existing.length % 5) * 18, y: 16 + (existing.length % 5) * 18 }
}

export async function memberNames (groupId) {
  const members = await col('members').aggregate([
    { $match: { groupId } },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' }
  ]).toArray()

  const names = new Map()
  for (const member of members) names.set(String(member.userId), member.user.displayName)
  return names
}

/** 交易紀錄與兌換紀錄會提到已經離開組別的人，所以直接查 users。 */
export async function userNames (ids) {
  const unique = [...new Map(ids.filter(Boolean).map((id) => [String(id), id])).values()]
  const users = await col('users').find({ _id: { $in: unique } }).toArray()
  return new Map(users.map((user) => [String(user._id), user.displayName]))
}

export const shapeTask = (task, names) => ({
  id: String(task._id),
  title: task.title,
  description: task.description || '',
  points: task.points,
  dueDate: task.dueDate ? task.dueDate.toISOString() : null,
  status: task.status,
  authorId: String(task.authorId),
  authorName: names.get(String(task.authorId)) || '已離開的成員',
  assigneeId: task.assigneeId ? String(task.assigneeId) : null,
  assigneeName: task.assigneeId ? names.get(String(task.assigneeId)) || '已離開的成員' : null,
  x: task.x,
  y: task.y,
  createdAt: task.createdAt.toISOString(),
  completedAt: task.completedAt ? task.completedAt.toISOString() : null
})

export const shapeReward = (reward, names) => ({
  id: String(reward._id),
  ownerId: String(reward.ownerId),
  ownerName: names.get(String(reward.ownerId)) || '已離開的成員',
  name: reward.name,
  description: reward.description || '',
  cost: reward.cost,
  stock: reward.stock,
  createdAt: reward.createdAt.toISOString()
})

export const shapeRedemption = (redemption, names) => ({
  id: String(redemption._id),
  rewardName: redemption.rewardName,
  ownerId: String(redemption.ownerId),
  ownerName: names.get(String(redemption.ownerId)) || '已離開的成員',
  buyerId: String(redemption.buyerId),
  buyerName: names.get(String(redemption.buyerId)) || '已離開的成員',
  cost: redemption.cost,
  status: redemption.status,
  createdAt: redemption.createdAt.toISOString()
})
