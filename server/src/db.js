import { MongoClient } from 'mongodb'

let client = null
let database = null

export async function connect (uri) {
  client = new MongoClient(uri)
  await client.connect()
  database = client.db()
  await ensureIndexes()
  return database
}

export function db () {
  if (!database) throw new Error('database not connected')
  return database
}

export const col = (name) => db().collection(name)

/** 驅動 v6 的 findOneAndUpdate 直接回傳文件，舊版包在 value 裡，兩種都接。 */
export const docOf = (res) => (res && typeof res === 'object' && 'value' in res ? res.value : res)

async function ensureIndexes () {
  await col('users').createIndex({ email: 1 }, { unique: true })
  await col('groups').createIndex({ inviteCode: 1 }, { unique: true })
  await col('members').createIndex({ groupId: 1, userId: 1 }, { unique: true })
  await col('tasks').createIndex({ groupId: 1 })
  await col('rewards').createIndex({ groupId: 1, ownerId: 1 })
  await col('redemptions').createIndex({ groupId: 1, buyerId: 1 })
  await col('redemptions').createIndex({ groupId: 1, ownerId: 1 })
  await col('pointTx').createIndex({ groupId: 1, holderId: 1, at: -1 })
  await col('balances').createIndex(
    { groupId: 1, holderId: 1, issuerId: 1 },
    { unique: true }
  )
  await col('reminders').createIndex({ toUserId: 1 })
  await col('reminders').createIndex({ taskId: 1 })
}

/**
 * 在一個資料庫交易裡執行 fn(session)。規格第 5、7、8 節要求的原子性都走這裡。
 * 需要 MongoDB 以 replica set 啟動。
 */
export async function withTx (fn) {
  const session = client.startSession()
  let result
  try {
    await session.withTransaction(async () => {
      result = await fn(session)
    })
    return result
  } finally {
    await session.endSession()
  }
}

export async function close () {
  if (client) await client.close()
  client = null
  database = null
}
