<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { STALE_TASK_CODES, useBoardStore } from '../stores/board.js'
import { useGroup } from '../composables/useGroup.js'
import { useSubmit } from '../composables/useSubmit.js'
import TopBar from '../components/common/TopBar.vue'
import TaskBoard from '../components/board/TaskBoard.vue'
import TaskFormDialog from '../components/board/TaskFormDialog.vue'
import TaskDetailDialog from '../components/board/TaskDetailDialog.vue'

const route = useRoute()
const auth = useAuthStore()
const board = useBoardStore()
const meId = computed(() => auth.user?.id)
const notice = ref('')

const formOpen = ref(false)
const formTask = ref(null)
const { busy, error, run, reset } = useSubmit()

const detailId = ref('')
const detail = computed(() => board.tasks.find((task) => task.id === detailId.value) || null)

const { groupId, group } = useGroup({
  'task:upsert': board.upsert,
  'task:remove': ({ id }) => board.drop(id),
  'task:moved': board.place,
  // 斷線重連後重新取得整個任務板的最新狀態（規格 §10）
  reconnect: board.reload
})

onMounted(async () => {
  await board.load(groupId.value)
  const wantedTaskId = route.query.task
  if (typeof wantedTaskId === 'string' && board.tasks.some((task) => task.id === wantedTaskId)) detailId.value = wantedTaskId
})

const openDetail = (task) => { detailId.value = task.id }

function openForm (task = null) {
  reset()
  formTask.value = task
  detailId.value = ''
  formOpen.value = true
}

const saveTask = (payload) => run(async () => {
  await board.save(formTask.value?.id, payload)
  formOpen.value = false
})

async function moveTask (task, position) {
  notice.value = ''
  try {
    await board.move(task.id, position)
  } catch (apiError) {
    notice.value = apiError.message
  }
}

async function runTaskAction (action) {
  notice.value = ''
  try {
    await board.act(detailId.value, action)
    if (action === 'delete') detailId.value = ''
    if (action === 'remind') notice.value = '已經提醒發布者了'
  } catch (apiError) {
    notice.value = apiError.message
    if (STALE_TASK_CODES.includes(apiError.code)) detailId.value = ''
  }
}
</script>

<template>
  <TopBar :group-id="groupId" :group-name="group?.name || '任務版'" />

  <main style="flex: 1; display: flex; flex-direction: column">
    <div class="page-head board-gutter" style="padding-top: 18px; padding-bottom: 10px">
      <span class="faint">
        {{ board.tasks.length }} 張任務
        <template v-if="board.tasks.length"> · 拖曳可移動自己發布的便利貼</template>
      </span>
      <button v-if="board.tasks.length" class="btn btn--primary btn--sm spacer" @click="openForm()">＋ 發布任務</button>
    </div>

    <p v-if="notice" class="alert board-gutter-m" style="margin-bottom: 10px">{{ notice }}</p>
    <p v-if="board.loading" class="faint board-gutter">載入中…</p>

    <div v-else-if="!board.tasks.length" class="board" style="min-height: 380px">
      <div class="empty">
        <div class="empty__ghosts"><i /><i /><i /></div>
        <p>任務版上還沒有便利貼。<br />貼上第一張，讓組員來認領。</p>
        <button class="btn btn--primary" @click="openForm()">＋ 發布任務</button>
      </div>
    </div>

    <TaskBoard v-else :tasks="board.tasks" :size="board.size" :me-id="meId" @open="openDetail" @move="moveTask" />
  </main>

  <TaskFormDialog
    v-if="formOpen"
    :task="formTask"
    :busy="busy"
    :error="error"
    @submit="saveTask"
    @close="formOpen = false"
  />

  <TaskDetailDialog
    v-if="detail"
    :task="detail"
    :me-id="meId"
    @act="runTaskAction"
    @edit="openForm(detail)"
    @close="detailId = ''"
  />
</template>
