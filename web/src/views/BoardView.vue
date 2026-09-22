<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { del, get, patch, post } from '../api.js'
import { auth } from '../store.js'
import { useGroup } from '../useGroup.js'
import TopBar from '../components/TopBar.vue'
import StickyNote from '../components/StickyNote.vue'
import TaskFormDialog from '../components/TaskFormDialog.vue'
import TaskDetailDialog from '../components/TaskDetailDialog.vue'

const route = useRoute()
const meId = computed(() => auth.user?.id)

const tasks = ref([])
const board = ref({ width: 1100, height: 660 })
const loading = ref(true)
const notice = ref('')

const formTask = ref(null)
const formOpen = ref(false)
const detailId = ref('')
const detail = computed(() => tasks.value.find((task) => task.id === detailId.value) || null)

const { groupId, group } = useGroup({
  'task:upsert': (task) => upsert(task),
  'task:remove': ({ id }) => { tasks.value = tasks.value.filter((task) => task.id !== id) },
  'task:moved': ({ id, x, y }) => {
    const task = tasks.value.find((t) => t.id === id)
    if (task && !dragging.value?.id) Object.assign(task, { x, y })
  },
  // 斷線重連後重新取得整個任務板的最新狀態（規格 §10）
  reconnect: () => load()
})

function upsert (task) {
  const index = tasks.value.findIndex((t) => t.id === task.id)
  if (index === -1) tasks.value.push(task)
  else tasks.value[index] = task
}

async function load () {
  const data = await get(`/groups/${groupId.value}/tasks`)
  tasks.value = data.tasks
  board.value = data.board
}

onMounted(async () => {
  try {
    await load()
    const wanted = route.query.task
    if (typeof wanted === 'string' && tasks.value.some((task) => task.id === wanted)) detailId.value = wanted
  } finally {
    loading.value = false
  }
})

/* ---------- 拖曳：只有發布者能移動自己的便利貼，放開後才儲存（規格 §9） ---------- */
const dragging = ref(null)
const canDrag = (task) => task.authorId === meId.value

function startDrag (task, event) {
  if (!canDrag(task) || window.innerWidth <= 820 || event.button !== 0) return
  dragging.value = {
    id: task.id,
    offsetX: event.clientX - task.x,
    offsetY: event.clientY - task.y,
    moved: false
  }
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function onDrag (task, event) {
  if (dragging.value?.id !== task.id) return
  const maxX = Math.max(0, board.value.width - 232)
  const maxY = Math.max(0, board.value.height - 150)
  task.x = Math.min(Math.max(event.clientX - dragging.value.offsetX, 0), maxX)
  task.y = Math.min(Math.max(event.clientY - dragging.value.offsetY, 0), maxY)
  dragging.value.moved = true
}

async function endDrag (task, event) {
  if (dragging.value?.id !== task.id) return
  const moved = dragging.value.moved
  dragging.value = null
  event.currentTarget.releasePointerCapture?.(event.pointerId)

  if (!moved) return openDetail(task)
  try {
    await patch(`/groups/${groupId.value}/tasks/${task.id}/position`, { x: task.x, y: task.y })
  } catch (error) {
    notice.value = error.message
    await load()
  }
}

function onNoteClick (task) {
  // 桌機的點擊由 endDrag 判斷（沒有移動才算點擊），手機直接開詳情
  if (window.innerWidth <= 820 || !canDrag(task)) openDetail(task)
}

const openDetail = (task) => { detailId.value = task.id }

/* ---------- 任務操作 ---------- */
function openCreate () {
  formTask.value = null
  formOpen.value = true
}

function openEdit (task) {
  formTask.value = task
  detailId.value = ''
  formOpen.value = true
}

async function saveTask (payload) {
  const base = `/groups/${groupId.value}/tasks`
  const saved = formTask.value
    ? await patch(`${base}/${formTask.value.id}`, payload)
    : await post(base, payload)
  upsert(saved)
  formOpen.value = false
}

async function act (task, action) {
  notice.value = ''
  try {
    if (action === 'delete') {
      await del(`/groups/${groupId.value}/tasks/${task.id}`)
      tasks.value = tasks.value.filter((t) => t.id !== task.id)
      detailId.value = ''
      return
    }
    if (action === 'remind') {
      await post(`/groups/${groupId.value}/tasks/${task.id}/remind`)
      notice.value = '已經提醒發布者了'
      return
    }
    upsert(await post(`/groups/${groupId.value}/tasks/${task.id}/${action}`))
  } catch (error) {
    notice.value = error.message
    // 認領失敗（已被別人搶先）時要更新畫面（design.md §6-2）
    if (error.code === 'TASK_ALREADY_CLAIMED' || error.code === 'TASK_STATE_CHANGED') {
      await load()
      detailId.value = ''
    }
  }
}
</script>

<template>
  <TopBar :group-id="groupId" :group-name="group?.name || '任務版'" />

  <main style="flex: 1; display: flex; flex-direction: column">
    <div class="page-head" style="padding: 18px 28px 10px">
      <span class="faint">
        {{ tasks.length }} 張任務
        <template v-if="tasks.length"> · 拖曳可移動自己發布的便利貼</template>
      </span>
      <button v-if="tasks.length" class="btn btn--primary btn--sm spacer" @click="openCreate">＋ 發布任務</button>
    </div>

    <p v-if="notice" class="alert" style="margin: 0 28px 10px">{{ notice }}</p>
    <p v-if="loading" class="faint" style="padding: 0 28px">載入中…</p>

    <div v-else-if="!tasks.length" class="board" style="min-height: 380px">
      <div class="empty">
        <div class="empty__ghosts"><i /><i /><i /></div>
        <p>任務版上還沒有便利貼。<br />貼上第一張，讓組員來認領。</p>
        <button class="btn btn--primary" @click="openCreate">＋ 發布任務</button>
      </div>
    </div>

    <div v-else class="board" :style="{ height: board.height + 'px' }">
      <!-- 桌機：依儲存的座標擺放 -->
      <div class="board__inner">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="board__note"
          :class="{ 'note--draggable': canDrag(task), 'note--dragging': dragging?.id === task.id }"
          :style="{ left: task.x + 'px', top: task.y + 'px' }"
          @pointerdown="startDrag(task, $event)"
          @pointermove="onDrag(task, $event)"
          @pointerup="endDrag(task, $event)"
          @click="onNoteClick(task)"
        >
          <StickyNote :task="task" :me-id="meId" />
        </div>
      </div>

      <!-- 手機：自動排列成清單，不提供拖曳（規格 §9） -->
      <div class="board__list">
        <div v-for="task in tasks" :key="task.id" @click="openDetail(task)">
          <StickyNote :task="task" :me-id="meId" />
        </div>
      </div>
    </div>
  </main>

  <TaskFormDialog v-if="formOpen" :task="formTask" :save="saveTask" @close="formOpen = false" />

  <TaskDetailDialog
    v-if="detail"
    :task="detail"
    :me-id="meId"
    @act="act(detail, $event)"
    @edit="openEdit(detail)"
    @close="detailId = ''"
  />
</template>
