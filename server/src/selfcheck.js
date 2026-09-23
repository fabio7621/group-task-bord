import 'dotenv/config'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { close, col, connect, withTx } from './db.js'
import { postTx, balanceOf } from './services/points.js'
import { redeemReward } from './services/rewards.js'
import { leaveGroup } from './services/membership.js'

/**
 * 規格 §5、§7 的兩個驗收條件，以及 §6「餘額＝交易紀錄加總」。
 * 用一個臨時組別跑完就解散，不會動到展示資料。
 * 執行：npm run check
 */

const settled = (promise) => promise.then(() => null, (error) => error)

async function main () {
  await connect(process.env.MONGO_URI)

  const suffix = new ObjectId().toString()
  const users = {}
  for (const name of ['author', 'racerA', 'racerB']) {
    const { insertedId } = await col('users').insertOne({
      email: `check-${name}-${suffix}@example.invalid`,
      displayName: `check-${name}`,
      passwordHash: 'x',
      createdAt: new Date()
    })
    users[name] = insertedId
  }

  const { insertedId: groupId } = await col('groups').insertOne({
    name: `自我檢查 ${suffix}`,
    inviteCode: `CHK${suffix.slice(-5).toUpperCase()}`,
    createdBy: users.author,
    createdAt: new Date()
  })
  await col('members').insertMany(
    Object.values(users).map((userId) => ({ groupId, userId, joinedAt: new Date() }))
  )

  try {
    // 1. 兩個帳號同時認領同一個任務，只有一個成功
    const { insertedId: taskId } = await col('tasks').insertOne({
      groupId,
      title: '搶同一張便利貼',
      description: '',
      points: 10,
      dueDate: null,
      status: 'open',
      authorId: users.author,
      assigneeId: null,
      submittedAt: null,
      completedAt: null,
      x: 16,
      y: 16,
      createdAt: new Date()
    })

    const claim = (userId) => col('tasks').findOneAndUpdate(
      { _id: taskId, status: 'open' },
      { $set: { status: 'claimed', assigneeId: userId } },
      { returnDocument: 'after' }
    )

    const claims = await Promise.all([claim(users.racerA), claim(users.racerB)])
    const winners = claims.filter(Boolean)
    assert.equal(winners.length, 1, '同時認領應該只有一個人成功')
    console.log('✓ 同時認領：只有一人搶到')

    // 2. 庫存剩 1 時兩人同時兌換，只有一人成功，另一人的點數不被扣除
    await withTx(async (session) => {
      for (const racer of ['racerA', 'racerB']) {
        await postTx(session, {
          groupId,
          holderId: users[racer],
          issuerId: users.author,
          amount: 50,
          kind: 'earn',
          ref: { title: '測試用點數' }
        })
      }
    })

    const { insertedId: rewardId } = await col('rewards').insertOne({
      groupId,
      ownerId: users.author,
      name: '最後一個',
      description: '',
      cost: 50,
      stock: 1,
      active: true,
      createdAt: new Date()
    })

    const redeem = (userId) =>
      settled(withTx((session) => redeemReward(session, { groupId, rewardId, buyerId: userId })))

    const outcomes = await Promise.all([redeem(users.racerA), redeem(users.racerB)])
    const failures = outcomes.filter(Boolean)
    assert.equal(failures.length, 1, '同時兌換應該只有一個人成功')
    assert.equal(failures[0].code, 'OUT_OF_STOCK', `失敗原因應該是庫存不足，實際為 ${failures[0].code}`)

    const loser = outcomes[0] ? users.racerA : users.racerB
    assert.equal(await balanceOf(groupId, loser, users.author), 50, '失敗的一方不可被扣點')
    assert.equal((await col('rewards').findOne({ _id: rewardId })).stock, 0)
    console.log('✓ 同時兌換：只有一人成功，另一人沒被扣點')

    // 3. 餘額必須等於交易紀錄的加總
    for (const userId of Object.values(users)) {
      const ledger = await col('pointTx').aggregate([
        { $match: { groupId, holderId: userId } },
        { $group: { _id: '$issuerId', total: { $sum: '$amount' } } }
      ]).toArray()
      for (const row of ledger) {
        const cached = await balanceOf(groupId, userId, row._id)
        assert.equal(cached, row.total, '餘額與交易紀錄加總不一致')
      }
    }
    console.log('✓ 餘額等於交易紀錄的加總')

    // 4. 點數不足時不會扣成負數
    const overdraw = await settled(withTx((session) => postTx(session, {
      groupId,
      holderId: users.racerA,
      issuerId: users.author,
      amount: -999,
      kind: 'redeem',
      ref: null
    })))
    assert.equal(overdraw?.code, 'INSUFFICIENT_POINTS', '超額扣點應該被擋下')
    console.log('✓ 餘額不可為負數')

    console.log('\n全部通過')
  } finally {
    // 逐一離開，最後一位會解散組別並刪掉所有資料
    for (const userId of Object.values(users)) {
      await withTx((session) => leaveGroup(session, { groupId, userId }))
    }
    await col('users').deleteMany({ _id: { $in: Object.values(users) } })
    await close()
  }
}

main().catch(async (error) => {
  console.error('✗', error.message)
  await close().catch(() => {})
  process.exit(1)
})
