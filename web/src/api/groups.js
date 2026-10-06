import { get, post } from './client.js'

export const groupsApi = {
  list: () => get('/groups'),
  get: (groupId) => get(`/groups/${groupId}`),
  create: (name) => post('/groups', { name }),
  join: (code) => post('/groups/join', { code }),
  leavePreview: (groupId) => get(`/groups/${groupId}/leave-preview`),
  leave: (groupId) => post(`/groups/${groupId}/leave`),
  reminders: () => get('/reminders')
}
