import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tasksApi } from '../api/tasks.js'

/** 認領失敗（已被別人搶先）這類錯誤代表畫面過期，要重新整理（design.md §6-2） */
export const STALE_TASK_CODES = ['TASK_ALREADY_CLAIMED', 'TASK_STATE_CHANGED']

export const useBoardStore = defineStore('board', () => {
  const groupId = ref('')
  const tasks = ref([])
  const size = ref({ width: 1100, height: 660 })
  const loading = ref(true)

  async function load (id) {
    if (id !== groupId.value) {
      groupId.value = id
      tasks.value = []
      loading.value = true
    }
    try {
      const data = await tasksApi.board(id)
      tasks.value = data.tasks
      size.value = data.board
    } finally {
      loading.value = false
    }
  }

  const reload = () => load(groupId.value)

  function upsert (task) {
    const exists = tasks.value.some((existing) => existing.id === task.id)
    tasks.value = exists
      ? tasks.value.map((existing) => (existing.id === task.id ? task : existing))
      : [...tasks.value, task]
  }

  function drop (taskId) {
    tasks.value = tasks.value.filter((task) => task.id !== taskId)
  }

  function place ({ id, x, y }) {
    tasks.value = tasks.value.map((task) => (task.id === id ? { ...task, x, y } : task))
  }

  /** taskId 為空表示發布新任務 */
  async function save (taskId, payload) {
    upsert(taskId
      ? await tasksApi.update(groupId.value, taskId, payload)
      : await tasksApi.create(groupId.value, payload))
  }

  /** 先更新畫面再存，失敗就重抓整個任務板 */
  async function move (taskId, position) {
    place({ id: taskId, ...position })
    try {
      await tasksApi.move(groupId.value, taskId, position)
    } catch (error) {
      await reload()
      throw error
    }
  }

  /** action：delete / claim / submit / confirm / abandon / remind */
  async function act (taskId, action) {
    try {
      if (action === 'delete') {
        await tasksApi.remove(groupId.value, taskId)
        return drop(taskId)
      }
      const task = await tasksApi.act(groupId.value, taskId, action)
      if (action !== 'remind') upsert(task)
    } catch (error) {
      if (STALE_TASK_CODES.includes(error.code)) await reload()
      throw error
    }
  }

  return { tasks, size, loading, load, reload, upsert, drop, place, save, move, act }
})
