import { Router } from 'express'
import { col } from '../db.js'
import { hashPassword, checkPassword, signToken, requireAuth, publicUser } from '../auth.js'
import { AppError, LIMITS, email as parseEmail, password as parsePassword, str } from '../validate.js'
import { rateLimit } from '../rateLimit.js'

const router = Router()

// 擋暴力嘗試密碼。容器裡大家共用同一個來源 IP，所以連 email 一起當 key
router.use(rateLimit({
  windowMs: 60_000,
  max: 20,
  keyOf: (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`
}))

router.post('/register', async (req, res, next) => {
  try {
    const email = parseEmail(req.body.email)
    const password = parsePassword(req.body.password)
    const displayName = str(req.body.displayName, '顯示名稱', LIMITS.displayName)

    if (req.body.confirmPassword !== password) {
      throw new AppError('PASSWORD_MISMATCH', '兩次輸入的密碼不一致')
    }
    if (await col('users').findOne({ email })) {
      throw new AppError('EMAIL_TAKEN', '這個 email 已經註冊過')
    }

    const user = {
      email,
      displayName,
      passwordHash: await hashPassword(password),
      createdAt: new Date()
    }
    const { insertedId } = await col('users').insertOne(user)

    res.json({ data: { token: signToken(insertedId), user: publicUser({ ...user, _id: insertedId }) } })
  } catch (error) {
    // email 唯一索引擋下的同時註冊
    if (error?.code === 11000) return next(new AppError('EMAIL_TAKEN', '這個 email 已經註冊過'))
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    const user = await col('users').findOne({ email })

    // 不區分是 email 不存在還是密碼錯（design.md §1）
    const ok = user && (await checkPassword(password, user.passwordHash))
    if (!ok) throw new AppError('BAD_CREDENTIALS', '帳號或密碼錯誤', 401)

    res.json({ data: { token: signToken(user._id), user: publicUser(user) } })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ data: { user: publicUser(req.user) } })
})

export default router
