import { col } from '../db.js'
import { AppError } from '../validate.js'

/**
 * 每一次點數變動都寫成一筆交易（規格 §6）。
 * balances 是交易紀錄的加總快取，兩者一定在同一個交易裡一起更新，
 * 扣點時用條件更新擋住負數與同時兌換的競爭。
 */
export async function postTx (session, { groupId, holderId, issuerId, amount, kind, ref = null, at = new Date() }) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new AppError('INVALID_INPUT', '點數變動必須是非零整數')
  }

  if (amount < 0) {
    const updated = await col('balances').findOneAndUpdate(
      { groupId, holderId, issuerId, amount: { $gte: -amount } },
      { $inc: { amount } },
      { session, returnDocument: 'after' }
    )
    if (!updated) throw new AppError('INSUFFICIENT_POINTS', '點數不足')
  } else {
    await col('balances').updateOne(
      { groupId, holderId, issuerId },
      { $inc: { amount }, $setOnInsert: { groupId, holderId, issuerId } },
      { session, upsert: true }
    )
  }

  await col('pointTx').insertOne({ groupId, holderId, issuerId, amount, kind, ref, at }, { session })
}

/** 作廢某人相關的所有點數：他持有的、以及別人持有他發行的（規格 §8）。 */
export async function voidAllPointsFor (session, { groupId, userId, reason }) {
  const affected = await col('balances')
    .find({
      groupId,
      amount: { $gt: 0 },
      $or: [{ holderId: userId }, { issuerId: userId }]
    }, { session })
    .toArray()

  for (const balance of affected) {
    await postTx(session, {
      groupId,
      holderId: balance.holderId,
      issuerId: balance.issuerId,
      amount: -balance.amount,
      kind: 'void',
      ref: { reason }
    })
  }
}

export async function balancesOf (groupId, holderId) {
  return col('balances')
    .find({ groupId, holderId, amount: { $gt: 0 } })
    .toArray()
}

export async function balanceOf (groupId, holderId, issuerId) {
  const doc = await col('balances').findOne({ groupId, holderId, issuerId })
  return doc?.amount ?? 0
}
