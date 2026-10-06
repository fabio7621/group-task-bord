<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGroupsStore } from '../stores/groups.js'
import { useGroup } from '../composables/useGroup.js'
import { useSubmit } from '../composables/useSubmit.js'
import { fullDate } from '../lib/format.js'
import TopBar from '../components/common/TopBar.vue'
import InviteCard from '../components/members/InviteCard.vue'
import LeaveGroupDialog from '../components/members/LeaveGroupDialog.vue'

const router = useRouter()
const groups = useGroupsStore()
const { busy, error, run, reset } = useSubmit()

const leavePreview = ref(null)
const notice = ref('')

const { groupId, group } = useGroup({
  'members:changed': () => reloadMembers(),
  reconnect: () => reloadMembers()
})

const reloadMembers = () => groups.loadCurrent(groupId.value)

async function openLeave () {
  notice.value = ''
  reset()
  try {
    leavePreview.value = await groups.leavePreview(groupId.value)
  } catch (apiError) {
    notice.value = apiError.message
  }
}

const confirmLeave = () => run(async () => {
  await groups.leave(groupId.value)
  router.push({ name: 'groups' })
})
</script>

<template>
  <TopBar :group-id="groupId" :group-name="group?.name || '成員'" />

  <main v-if="group" class="page" style="display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap">
    <InviteCard :invite-code="group.inviteCode" @copy-failed="notice = '瀏覽器不允許複製，請手動選取。'" />

    <div style="flex: 1; min-width: 280px">
      <div style="display: flex; align-items: center; gap: 10px">
        <h2 style="font-size: 20px; font-weight: 700">成員</h2>
        <span class="faint">{{ group.members.length }} 位</span>
      </div>

      <div class="list" style="margin-top: 14px">
        <div v-for="member in group.members" :key="member.id" class="list__row">
          <span :style="{ fontWeight: member.isMe ? 700 : 400 }">
            {{ member.displayName }}<template v-if="member.isMe">（你）</template>
          </span>
          <span class="spacer faint">{{ fullDate(member.joinedAt) }} 加入</span>
        </div>
      </div>

      <p v-if="notice" class="alert" style="margin-top: 14px">{{ notice }}</p>

      <div style="margin-top: 22px; display: flex; justify-content: flex-end">
        <button class="btn btn--danger" @click="openLeave">離開組別</button>
      </div>
    </div>
  </main>

  <LeaveGroupDialog
    v-if="leavePreview && group"
    :group-name="group.name"
    :preview="leavePreview"
    :busy="busy"
    :error="error"
    @confirm="confirmLeave"
    @close="leavePreview = null"
  />
</template>
