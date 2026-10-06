import { del, get, patch, post } from './client.js'

const tasksPath = (groupId) => `/groups/${groupId}/tasks`
const taskPath = (groupId, taskId) => `${tasksPath(groupId)}/${taskId}`

export const tasksApi = {
  /** 回傳 { tasks, board } */
  board: (groupId) => get(tasksPath(groupId)),
  create: (groupId, payload) => post(tasksPath(groupId), payload),
  update: (groupId, taskId, payload) => patch(taskPath(groupId, taskId), payload),
  move: (groupId, taskId, position) => patch(`${taskPath(groupId, taskId)}/position`, position),
  remove: (groupId, taskId) => del(taskPath(groupId, taskId)),
  /** action：claim / submit / confirm / abandon / remind */
  act: (groupId, taskId, action) => post(`${taskPath(groupId, taskId)}/${action}`)
}
