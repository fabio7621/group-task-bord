import { io } from 'socket.io-client'
import { auth } from './store.js'

let socket = null
let joinedGroupId = null

function ensureSocket () {
  if (socket) {
    socket.auth = { token: auth.token }
    return socket
  }
  socket = io({ auth: { token: auth.token }, autoConnect: true })
  // 斷線重連後重新加入房間，呼叫端負責重新取得整個畫面狀態（規格 §10）
  socket.on('connect', () => {
    if (joinedGroupId) socket.emit('group:join', joinedGroupId)
  })
  return socket
}

/**
 * 加入某組別的房間，回傳解除訂閱的函式。
 * handlers: { 'task:upsert': fn, ... , reconnect: fn }
 */
export function joinGroup (groupId, handlers = {}) {
  const active = ensureSocket()
  joinedGroupId = groupId
  active.emit('group:join', groupId)

  const { reconnect, ...events } = handlers
  const bound = Object.entries(events)
  for (const [event, handler] of bound) active.on(event, handler)
  if (reconnect) active.io.on('reconnect', reconnect)

  return () => {
    for (const [event, handler] of bound) active.off(event, handler)
    if (reconnect) active.io.off('reconnect', reconnect)
    if (joinedGroupId === groupId) {
      active.emit('group:leave', groupId)
      joinedGroupId = null
    }
  }
}

export function disconnectSocket () {
  socket?.disconnect()
  socket = null
  joinedGroupId = null
}
