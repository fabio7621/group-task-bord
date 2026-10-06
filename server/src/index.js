import 'dotenv/config'
import http from 'node:http'
import express from 'express'
import cors from 'cors'

import { connect } from './db.js'
import { secret } from './auth.js'
import { initRealtime } from './realtime.js'
import { seedIfEmpty } from './seed.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

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

  app.use(notFound)
  app.use(errorHandler)

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
