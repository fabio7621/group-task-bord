import 'dotenv/config'
import http from 'node:http'
import express from 'express'
import cors from 'cors'

import { connect } from './db.js'
import { secret } from './auth.js'
import { initRealtime } from './realtime.js'
import { seedIfEmpty } from './seed.js'
import { AppError } from './validate.js'

import authRoutes from './routes/auth.js'
import groupRoutes from './routes/groups.js'
import taskRoutes from './routes/tasks.js'
import rewardRoutes from './routes/rewards.js'
import ledgerRoutes from './routes/ledger.js'
import reminderRoutes from './routes/reminders.js'

const PORT = Number(process.env.PORT || 4000)
const ORIGIN = process.env.CORS_ORIGIN || '*'

function requireEnv () {
  if (!process.env.MONGO_URI) throw new Error('缺少 MONGO_URI，請參考 .env.example 設定')
  secret() // JWT_SECRET 缺少時在啟動就失敗，不要等到第一次登入
}

export function createApp () {
  const app = express()
  app.use(cors({ origin: ORIGIN }))
  app.use(express.json({ limit: '64kb' }))

  app.get('/api/health', (req, res) => res.json({ data: { ok: true } }))
  app.use('/api/auth', authRoutes)
  app.use('/api/reminders', reminderRoutes)
  app.use('/api/groups/:groupId/tasks', taskRoutes)
  app.use('/api/groups/:groupId/rewards', rewardRoutes)
  // groupRoutes 必須在前：否則 /api/groups/join 會被當成 :groupId = 'join' 擋下
  app.use('/api/groups', groupRoutes)
  app.use('/api/groups/:groupId', ledgerRoutes)

  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: '找不到這個路徑' } }))

  // 統一的錯誤格式：預期內的錯誤回代碼，其餘只記在伺服器端，不外流細節
  app.use((error, req, res, next) => {
    if (error instanceof AppError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } })
    }
    console.error('[unhandled]', req.method, req.originalUrl, error)
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: '伺服器發生錯誤，請稍後再試' } })
  })

  return app
}

async function main () {
  requireEnv()
  await connect(process.env.MONGO_URI)
  await seedIfEmpty()

  const server = http.createServer(createApp())
  initRealtime(server, ORIGIN)
  server.listen(PORT, () => console.log(`API listening on :${PORT}`))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
