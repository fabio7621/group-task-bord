import { defineStore } from 'pinia'
import { ref } from 'vue'
import { groupsApi } from '../api/groups.js'

export const useGroupsStore = defineStore('groups', () => {
  const list = ref([])
  const reminders = ref([])
  const loading = ref(true)
  /** 目前所在組別（含成員、邀請碼） */
  const current = ref(null)

  async function loadList () {
    try {
      const [groups, pending] = await Promise.all([groupsApi.list(), groupsApi.reminders()])
      list.value = groups
      reminders.value = pending
    } finally {
      loading.value = false
    }
  }

  async function loadCurrent (groupId) {
    // 換組別時先清掉，免得畫面閃過上一組的資料
    if (String(current.value?.id) !== groupId) current.value = null
    current.value = await groupsApi.get(groupId)
  }

  const create = (name) => groupsApi.create(name)
  const join = (code) => groupsApi.join(code)
  const leavePreview = (groupId) => groupsApi.leavePreview(groupId)

  async function leave (groupId) {
    await groupsApi.leave(groupId)
    list.value = list.value.filter((group) => String(group.id) !== groupId)
    current.value = null
  }

  return { list, reminders, loading, current, loadList, loadCurrent, create, join, leavePreview, leave }
})
