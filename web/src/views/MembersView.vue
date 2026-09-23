<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { get, post } from '../api.js'
import { useGroup } from '../useGroup.js'
import { fullDate } from '../format.js'
import TopBar from '../components/TopBar.vue'
import ModalSheet from '../components/ModalSheet.vue'

const router = useRouter()

const leavePreview = ref(null)
const leaving = ref(false)
const notice = ref('')
const copied = ref('')

const { groupId, group } = useGroup({
  'members:changed': () => reloadMembers(),
  reconnect: () => reloadMembers()
})

const inviteLink = computed(() =>
  group.value ? `${window.location.origin}/join/${group.value.inviteCode}` : ''
)

async function reloadMembers () {
  group.value = await get(`/groups/${groupId.value}`)
}

async function copyToClipboard (text, sourceKey) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = sourceKey
    setTimeout(() => { copied.value = '' }, 1600)
  } catch {
    notice.value = '瀏覽器不允許複製，請手動選取。'
  }
}

async function openLeave () {
  notice.value = ''
  leavePreview.value = await get(`/groups/${groupId.value}/leave-preview`)
}

async function confirmLeave () {
  leaving.value = true
  try {
    await post(`/groups/${groupId.value}/leave`)
    router.push({ name: 'groups' })
  } catch (error) {
    notice.value = error.message
    leaving.value = false
  }
}
</script>

<template>
  <TopBar :group-id="groupId" :group-name="group?.name || '成員'" />

  <main v-if="group" class="page" style="display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap">
    <div class="sticky" style="width: 330px; padding: 22px; transform: rotate(-1.3deg)">
      <div style="font-size: 18px; font-weight: 700">邀請新成員</div>

      <div style="margin-top: 16px; font-size: 12px; color: #6b6355">邀請碼</div>
      <div style="margin-top: 6px; display: flex; align-items: center; gap: 10px">
        <div class="num" style="font-size: 30px; letter-spacing: 0.18em">{{ group.inviteCode }}</div>
        <button
          class="btn btn--sm"
          style="margin-left: auto; border: none; background: rgba(46, 42, 59, 0.12); font-weight: 700"
          @click="copyToClipboard(group.inviteCode, 'code')"
        >
          {{ copied === 'code' ? '已複製' : '複製' }}
        </button>
      </div>

      <div style="margin-top: 18px; font-size: 12px; color: #6b6355">邀請連結</div>
      <div style="margin-top: 6px; font-size: 13px; word-break: break-all; color: #4a443c">{{ inviteLink }}</div>
      <button class="btn btn--primary btn--sm" style="margin-top: 12px; width: 100%" @click="copyToClipboard(inviteLink, 'link')">
        {{ copied === 'link' ? '已複製連結' : '複製連結' }}
      </button>
    </div>

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

  <ModalSheet
    v-if="leavePreview"
    :title="`離開「${group.name}」？`"
    width="470px"
    @close="leavePreview = null"
  >
    <p class="muted" style="margin-top: 10px; font-size: 14px; line-height: 1.7">
      離開後以下資料會一併處理，無法復原。
    </p>

    <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 14px">
      <div style="background: var(--danger-bg); border-radius: 4px; padding: 12px 14px">
        <div style="font-weight: 700; color: var(--danger-ink)">會作廢的點數</div>
        <div style="margin-top: 4px; color: #7a5548; line-height: 1.6">
          你持有：
          <template v-if="leavePreview.heldPoints.length">
            <span v-for="(item, index) in leavePreview.heldPoints" :key="item.issuerName">
              <template v-if="index">、</template>{{ item.issuerName }} {{ item.amount }}
            </span>
          </template>
          <template v-else>無</template>
          <br />別人持有你的點數：共 {{ leavePreview.pointsOthersHold }}
        </div>
      </div>

      <div
        v-for="block in [
          { title: '會下架的獎品', items: leavePreview.rewards },
          { title: '會下架的任務', items: leavePreview.tasksRemoved },
          { title: '會退回任務版的任務', items: leavePreview.tasksReturned }
        ]"
        :key="block.title"
        style="background: var(--panel); border-radius: 4px; padding: 12px 14px"
      >
        <div style="font-weight: 700">{{ block.title }}</div>
        <div style="margin-top: 4px; color: var(--sub)">
          {{ block.items.length ? block.items.join('、') : '無' }}
        </div>
      </div>

      <div style="background: var(--panel); border-radius: 4px; padding: 12px 14px">
        <div style="font-weight: 700">會失效的兌換紀錄</div>
        <div style="margin-top: 4px; color: var(--sub)">
          <template v-if="leavePreview.redemptionsVoided.length">
            <div v-for="item in leavePreview.redemptionsVoided" :key="item.rewardName + item.buyerName">
              {{ item.buyerName }} 向你兌換的「{{ item.rewardName }}」
            </div>
          </template>
          <template v-else>無</template>
        </div>
      </div>

      <div v-if="leavePreview.isLastMember" class="alert">
        你是最後一位成員，離開後組別將被解散，所有資料會被刪除。
      </div>
    </div>

    <template #foot>
      <button class="btn btn--sm" @click="leavePreview = null">取消</button>
      <button class="btn btn--danger-solid btn--sm" :disabled="leaving" @click="confirmLeave">確認離開</button>
    </template>
  </ModalSheet>
</template>
