import { col, docOf } from '../db.js'
import { AppError } from '../validate.js'
import { postTx } from './points.js'

/**
 * 扣庫存、扣點、建立兌換紀錄（規格 §7 步驟 3），必須在呼叫端給的交易裡執行。
 * 庫存與餘額都用條件更新決定勝負，所以同時兌換只有一人成功，另一人不被扣點。
 */
export async function redeemReward (session, { groupId, rewardId, buyerId, at = new Date() }) {
  const taken = docOf(await col('rewards').findOneAndUpdate(
    { _id: rewardId, groupId, active: true, stock: { $gt: 0 } },
    { $inc: { stock: -1 } },
    { session, returnDocument: 'after' }
  ))
  if (!taken) throw new AppError('OUT_OF_STOCK', '這個獎品已經換完了', 409)

  // 只能用獎品提供者發行的點數兌換（規格 §7）
  await postTx(session, {
    groupId,
    holderId: buyerId,
    issuerId: taken.ownerId,
    amount: -taken.cost,
    kind: 'redeem',
    ref: { rewardId: taken._id, name: taken.name },
    at
  })

  const record = {
    groupId,
    rewardId: taken._id,
    rewardName: taken.name,
    ownerId: taken.ownerId,
    buyerId,
    cost: taken.cost,
    status: 'pending',
    createdAt: at
  }
  const { insertedId } = await col('redemptions').insertOne(record, { session })
  return { ...record, _id: insertedId }
}
