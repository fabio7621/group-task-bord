<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { get, post } from '../api.js'
import { dateTime } from '../format.js'
import TopBar from '../components/TopBar.vue'
import ModalSheet from '../components/ModalSheet.vue'

const router = useRouter()

const groups = ref([])
const reminders = ref([])
const loading = ref(true)

const dialog = ref('')
const groupName = ref('')
const inviteCode = ref('')
const error = ref('')
const busy = ref(false)

const STICKY_COLORS = ['', 'sticky--blue', 'sticky--green', 'sticky--orange']

onMounted(async () => {
  try {
    groups.value = await get('/groups')
    reminders.value = await get('/reminders')
    // 有人提醒我確認任務時，登入後自動跳出（規格 §5）
    if (reminders.value.length) dialog.value = 'reminders'
  } finally {
    loading.value = false
  }
})

function openDialog (name) {
  error.value = ''
  groupName.value = ''
  inviteCode.value = ''
  dialog.value = name
}

async function createGroup () {
  error.value = ''
  busy.value = true
  try {
    const group = await post('/groups', { name: groupName.value })
    router.push({ name: 'board', params: { id: group.id } })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function joinGroupByCode () {
  error.value = ''
  busy.value = true
  try {
    const group = await post('/groups/join', { code: inviteCode.value })
    router.push({ name: 'board', params: { id: group.id } })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

function goToReminder (reminder) {
  dialog.value = ''
  router.push({ name: 'board', params: { id: reminder.groupId }, query: { task: reminder.taskId } })
}
</script>

<template>
  <TopBar />

  <main class="page">
    <div class="page-head">
      <h2>我的組別</h2>
      <div class="spacer" style="display: flex; gap: 10px; flex-wrap: wrap">
        <button class="btn btn--sm" @click="openDialog('join')">輸入邀請碼</button>
        <button class="btn btn--primary btn--sm" @click="openDialog('create')">＋ 建立組別</button>
      </div>
    </div>

    <p v-if="loading" class="faint" style="margin-top: 26px">載入中…</p>

    <div v-else-if="!groups.length" class="empty">
      <div class="empty__ghosts"><i /><i /><i /></div>
      <p>你還沒有加入任何組別。<br />建立一個新的組別，或用邀請碼加入朋友的組。</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center">
        <button class="btn" @click="openDialog('join')">輸入邀請碼</button>
        <button class="btn btn--primary" @click="openDialog('create')">＋ 建立組別</button>
      </div>
    </div>

    <div v-else style="margin-top: 26px; display: flex; gap: 22px; flex-wrap: wrap">
      <RouterLink
        v-for="(group, index) in groups"
        :key="group.id"
        class="sticky"
        :class="STICKY_COLORS[index % STICKY_COLORS.length]"
        :style="{ width: '240px', minHeight: '180px', transform: `rotate(${index % 2 ? 1.6 : -1.4}deg)` }"
        :to="{ name: 'board', params: { id: group.id } }"
      >
        <div style="font-size: 21px; font-weight: 700; line-height: 1.35">{{ group.name }}</div>
        <div style="margin-top: 8px; font-size: 13px; color: rgba(46, 42, 59, 0.66)">
          {{ group.memberCount }} 位成員
        </div>
        <div class="num" style="margin-top: auto; font-size: 13px; color: rgba(46, 42, 59, 0.66)">
          <template v-if="group.awaitingMyConfirmCount">{{ group.awaitingMyConfirmCount }} 張待你確認 →</template>
          <template v-else-if="group.openTaskCount">{{ group.openTaskCount }} 張待認領 →</template>
          <template v-else>看看任務版 →</template>
        </div>
      </RouterLink>

      <button
        class="dashed"
        style="width: 240px; min-height: 180px; transform: rotate(-0.5deg)"
        @click="openDialog('create')"
      >
        <span style="font-size: 26px">＋</span>
        <span style="font-size: 14px">建立或加入組別</span>
      </button>
    </div>
  </main>

  <ModalSheet v-if="dialog === 'create'" title="建立組別" width="400px" @close="dialog = ''">
    <form class="form" style="margin-top: 16px" @submit.prevent="createGroup">
      <label class="field">
        <span class="field__label">組別名稱 <span class="req">*</span></span>
        <input v-model="groupName" required maxlength="30" autofocus />
        <span class="hint">1～30 字</span>
      </label>
      <p v-if="error" class="alert">{{ error }}</p>
      <div class="sheet__foot">
        <button type="button" class="btn btn--sm" @click="dialog = ''">取消</button>
        <button type="submit" class="btn btn--primary btn--sm" :disabled="busy">建立</button>
      </div>
    </form>
  </ModalSheet>

  <ModalSheet v-if="dialog === 'join'" title="輸入邀請碼" width="400px" @close="dialog = ''">
    <form class="form" style="margin-top: 16px" @submit.prevent="joinGroupByCode">
      <label class="field field--num">
        <span class="field__label">邀請碼 <span class="req">*</span></span>
        <input
          v-model="inviteCode"
          required
          style="letter-spacing: 0.22em; text-transform: uppercase"
          placeholder="K7QX2A"
          autofocus
        />
      </label>
      <p v-if="error" class="hint hint--error">{{ error }}</p>
      <div class="sheet__foot">
        <button type="button" class="btn btn--sm" @click="dialog = ''">取消</button>
        <button type="submit" class="btn btn--primary btn--sm" :disabled="busy">加入</button>
      </div>
    </form>
  </ModalSheet>

  <ModalSheet v-if="dialog === 'reminders'" title="有人提醒你確認任務" width="440px" @close="dialog = ''">
    <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 10px">
      <div
        v-for="reminder in reminders"
        :key="reminder.id"
        style="display: flex; align-items: center; gap: 12px; background: var(--note-submitted); padding: 12px; border-radius: 3px"
      >
        <div>
          <div style="font-size: 15px; font-weight: 700">{{ reminder.taskTitle }}</div>
          <div style="margin-top: 3px; font-size: 12px; color: #6b5748">
            {{ reminder.groupName }} · {{ reminder.fromName }} · {{ dateTime(reminder.at) }}
          </div>
        </div>
        <button class="btn btn--primary btn--sm" style="margin-left: auto" @click="goToReminder(reminder)">
          前往
        </button>
      </div>
    </div>
    <template #foot>
      <button class="btn btn--sm" @click="dialog = ''">稍後再看</button>
    </template>
  </ModalSheet>
</template>
