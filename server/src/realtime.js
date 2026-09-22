import { Server } from 'socket.io'
import { ObjectId } from 'mongodb'
import { col } from './db.js'
import { readToken } from './auth.js'

let io = null

const room = (groupId) => `group:${groupId}`

export function initRealtime (httpServer, origin) {
  io = new Server(httpServer, { cors: { origin, credentials: true } })

  io.use((socket, next) => {
    const userId = readToken(socket.handshake.auth?.token)
    if (!userId) return next(new Error('unauthorized'))
    socket.data.userId = userId
    next()
  })

  io.on('connection', (socket) => {
    // 一個組別一個房間，只廣播給該組成員（規格 §10）。
    socket.on('group:join', async (groupId, ack) => {
      try {
        const membership = await col('members').findOne({
          groupId: new ObjectId(groupId),
          userId: new ObjectId(socket.data.userId)
        })
        if (!membership) return ack?.({ ok: false })
        for (const joined of socket.rooms) {
          if (joined.startsWith('group:')) socket.leave(joined)
        }
        socket.join(room(groupId))
        ack?.({ ok: true })
      } catch {
        ack?.({ ok: false })
      }
    })

    socket.on('group:leave', (groupId) => socket.leave(room(groupId)))
  })

  return io
}

/** 一律先寫入資料庫成功再呼叫這裡（規格 §10）。 */
export function broadcast (groupId, event, payload) {
  io?.to(room(String(groupId))).emit(event, payload)
}
