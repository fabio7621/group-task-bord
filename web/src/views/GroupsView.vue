<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGroupsStore } from '../stores/groups.js'
import { useSubmit } from '../composables/useSubmit.js'
import TopBar from '../components/common/TopBar.vue'
import CreateGroupDialog from '../components/groups/CreateGroupDialog.vue'
import JoinGroupDialog from '../components/groups/JoinGroupDialog.vue'
import RemindersDialog from '../components/groups/RemindersDialog.vue'

const router = useRouter()
const groups = useGroupsStore()
const { busy, error, run, reset } = useSubmit()

const dialog = ref('')

const STICKY_COLORS = ['', 'sticky--blue', 'sticky--green', 'sticky--orange']

onMounted(async () => {
  await groups.loadList()
  // 有人提醒我確認任務時，登入後自動跳出（規格 §5）
  if (groups.reminders.length) dialog.value = 'reminders'
})

function openDialog (name) {
  reset()
  dialog.value = name
}

const enterBoard = (group) => router.push({ name: 'board', params: { id: group.id } })
const createGroup = (name) => run(async () => enterBoard(await groups.create(name)))
const joinGroupByCode = (code) => run(async () => enterBoard(await groups.join(code)))

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

    <p v-if="groups.loading" class="faint" style="margin-top: 26px">載入中…</p>

    <div v-else-if="!groups.list.length" class="empty">
      <div class="empty__ghosts"><i /><i /><i /></div>
      <p>你還沒有加入任何組別。<br />建立一個新的組別，或用邀請碼加入朋友的組。</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center">
        <button class="btn" @click="openDialog('join')">輸入邀請碼</button>
        <button class="btn btn--primary" @click="openDialog('create')">＋ 建立組別</button>
      </div>
    </div>

    <div v-else style="margin-top: 26px; display: flex; gap: 22px; flex-wrap: wrap">
      <RouterLink
        v-for="(group, index) in groups.list"
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

  <CreateGroupDialog v-if="dialog === 'create'" :busy="busy" :error="error" @submit="createGroup" @close="dialog = ''" />
  <JoinGroupDialog v-if="dialog === 'join'" :busy="busy" :error="error" @submit="joinGroupByCode" @close="dialog = ''" />
  <RemindersDialog v-if="dialog === 'reminders'" :reminders="groups.reminders" @go="goToReminder" @close="dialog = ''" />
</template>
