import 'dotenv/config'
import { close, col, connect, db, withTx } from './db.js'
import { hashPassword } from './auth.js'
import { postTx } from './services/points.js'
import { leaveGroup } from './services/membership.js'
import { redeemReward } from './services/rewards.js'
import { nextFreePosition } from './services/shape.js'

/** 展示帳號密碼，同樣雜湊後儲存。帳密只寫在 README，登入頁不列出（規格 §11）。 */
const DEMO_PASSWORD = 'demo1234'

const ACCOUNTS = [
  { key: 'hsien', email: 'hsien@example.com', displayName: '阿賢' },
  { key: 'mom', email: 'mom@example.com', displayName: '媽媽' },
  { key: 'kuei', email: 'kuei@example.com', displayName: '小葵' },
  { key: 'ray', email: 'ray@example.com', displayName: 'Ray' },
  // 這位待會兒就離開，用來產生「作廢的點數」與「已失效的兌換紀錄」
  { key: 'ming', email: 'ming@example.com', displayName: '小明' }
]

const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)

/** 涵蓋所有狀態的任務（規格 §11）。done 的任務會轉成一筆賺取交易。 */
const TASKS = [
  { title: '倒廚餘＋洗碗', author: 'mom', points: 15, status: 'open', due: 2, description: '廚餘桶拿去倒，水槽的碗一起洗完。' },
  { title: '彙整這週的專案週報', author: 'ray', points: 40, status: 'open', due: 4 },
  { title: '補充辦公室咖啡豆', author: 'hsien', points: 10, status: 'open' },
  { title: '買貓砂與飼料', author: 'kuei', points: 20, status: 'claimed', assignee: 'hsien', due: 3 },
  { title: '整理陽台工具箱', author: 'ray', points: 30, status: 'submitted', assignee: 'kuei', description: '把工具依類型放回箱子，壞掉的螺絲刀丟掉。梯子折好靠牆。' },
  { title: '客廳掃地拖地', author: 'mom', points: 45, status: 'done', assignee: 'hsien', doneDaysAgo: 2 },
  { title: '更新專案時程表', author: 'ray', points: 40, status: 'done', assignee: 'hsien', doneDaysAgo: 4 },
  { title: '幫忙搬電腦桌', author: 'kuei', points: 15, status: 'done', assignee: 'hsien', doneDaysAgo: 6 },
  { title: '修好客廳檯燈', author: 'hsien', points: 60, status: 'done', assignee: 'ray', doneDaysAgo: 8 },
  { title: '擦窗戶', author: 'ming', points: 30, status: 'done', assignee: 'hsien', doneDaysAgo: 12 }
]

const REWARDS = [
  { owner: 'mom', name: '週末免洗碗券', cost: 60, stock: 2, description: '整個週末的碗都歸我洗，可指定日期' },
  { owner: 'mom', name: '宵夜一次', cost: 40, stock: 1 },
  { owner: 'ray', name: '代打一次值班', cost: 80, stock: 1, description: '平日晚上，需提前一天說' },
  { owner: 'hsien', name: '電腦疑難雜症代處理', cost: 50, stock: 3 },
  { owner: 'kuei', name: '手沖咖啡一杯', cost: 15, stock: 5 },
  { owner: 'ming', name: '咖啡一杯', cost: 20, stock: 3 }
]

async function build () {
  const now = new Date()
  const passwordHash = await hashPassword(DEMO_PASSWORD)

  const users = {}
  for (const account of ACCOUNTS) {
    const { insertedId } = await col('users').insertOne({
      email: account.email,
      displayName: account.displayName,
      passwordHash,
      createdAt: now
    })
    users[account.key] = insertedId
  }

  const { insertedId: groupId } = await col('groups').insertOne({
    name: '林家大小事',
    inviteCode: 'K7QX2A',
    createdBy: users.hsien,
    createdAt: days(-40)
  })
  await col('members').insertMany(
    ACCOUNTS.map((account, index) => ({
      groupId,
      userId: users[account.key],
      joinedAt: days(-40 + index * 2)
    }))
  )

  const placed = []
  const tasks = {}
  for (const spec of TASKS) {
    const position = nextFreePosition(placed)
    const task = {
      groupId,
      title: spec.title,
      description: spec.description || '',
      points: spec.points,
      dueDate: spec.due ? days(spec.due) : null,
      status: spec.status,
      authorId: users[spec.author],
      assigneeId: spec.assignee ? users[spec.assignee] : null,
      submittedAt: spec.status === 'submitted' ? days(-1) : null,
      completedAt: spec.status === 'done' ? days(-spec.doneDaysAgo) : null,
      x: position.x,
      y: position.y,
      createdAt: days(-7)
    }
    const { insertedId } = await col('tasks').insertOne(task)
    tasks[spec.title] = { ...task, _id: insertedId }
    placed.push(position)
  }

  const rewards = {}
  for (const spec of REWARDS) {
    const { insertedId } = await col('rewards').insertOne({
      groupId,
      ownerId: users[spec.owner],
      name: spec.name,
      description: spec.description || '',
      cost: spec.cost,
      stock: spec.stock,
      active: true,
      createdAt: days(-20)
    })
    rewards[spec.name] = insertedId
  }

  // 點數餘額全部由交易紀錄產生，不直接寫入數字（規格 §11）
  await withTx(async (session) => {
    for (const spec of TASKS.filter((t) => t.status === 'done')) {
      const task = tasks[spec.title]
      await postTx(session, {
        groupId,
        holderId: users[spec.assignee],
        issuerId: users[spec.author],
        amount: spec.points,
        kind: 'earn',
        ref: { taskId: task._id, title: task.title },
        at: task.completedAt
      })
    }
  })

  // 兌換紀錄：已兌現、待兌現，以及等一下會失效的那筆
  const fulfilled = await withTx((session) => redeemReward(session, {
    groupId, rewardId: rewards['宵夜一次'], buyerId: users.hsien, at: days(-1.5)
  }))
  await col('redemptions').updateOne(
    { _id: fulfilled._id },
    { $set: { status: 'fulfilled', fulfilledAt: days(-1) } }
  )
  await withTx((session) => redeemReward(session, {
    groupId, rewardId: rewards['電腦疑難雜症代處理'], buyerId: users.ray, at: days(-5)
  }))
  await withTx((session) => redeemReward(session, {
    groupId, rewardId: rewards['咖啡一杯'], buyerId: users.hsien, at: days(-11)
  }))

  // 小明離開：他發行的點數作廢、他的獎品下架、向他兌換的待兌現紀錄失效（規格 §8）
  await withTx((session) => leaveGroup(session, { groupId, userId: users.ming }))

  // 待確認的任務有一筆提醒，登入後會跳出提醒列表
  const submitted = tasks['整理陽台工具箱']
  await col('reminders').insertOne({
    taskId: submitted._id,
    groupId,
    fromUserId: submitted.assigneeId,
    toUserId: submitted.authorId,
    at: days(-0.2)
  })
}

export async function seedIfEmpty () {
  // 只在資料庫為空時執行，不覆蓋既有資料（規格 §11）
  if (await col('users').countDocuments()) return false
  await build()
  console.log('已寫入展示用預設資料')
  return true
}

export async function resetAndSeed () {
  const collections = await db().listCollections().toArray()
  for (const { name } of collections) await col(name).deleteMany({})
  await build()
  console.log('已清空資料庫並重新寫入展示用預設資料')
}

const runDirectly = process.argv[1] && process.argv[1].endsWith('seed.js')
if (runDirectly) {
  connect(process.env.MONGO_URI)
    .then(() => (process.argv.includes('--reset') ? resetAndSeed() : seedIfEmpty()))
    .then(close)
    .catch(async (error) => {
      console.error(error)
      await close()
      process.exit(1)
    })
}
