<script setup>
import { computed, onMounted, ref } from 'vue'
import { get, post } from '../api.js'
import { useGroup } from '../useGroup.js'
import { REDEMPTION_STATUS, dateTime } from '../format.js'
import TopBar from '../components/TopBar.vue'

const tab = ref('mine')
const mine = ref([])
const received = ref([])
const loading = ref(true)
const notice = ref('')

const rows = computed(() => (tab.value === 'mine' ? mine.value : received.value))

const { groupId, group } = useGroup({
  'rewards:changed': () => loadRedemptions(),
  reconnect: () => loadRedemptions()
})

async function loadRedemptions () {
  const data = await get(`/groups/${groupId.value}/redemptions`)
  mine.value = data.mine
  received.value = data.received
}

onMounted(async () => {
  try {
    await loadRedemptions()
  } finally {
    loading.value = false
  }
})

async function fulfill (redemption) {
  notice.value = ''
  try {
    await post(`/groups/${groupId.value}/redemptions/${redemption.id}/fulfill`)
    await loadRedemptions()
  } catch (error) {
    notice.value = error.message
  }
}
</script>

<template>
  <TopBar :group-id="groupId" :group-name="group?.name || '兌換紀錄'" />

  <main class="page">
    <h2 style="font-size: 20px; font-weight: 700">兌換紀錄</h2>

    <div class="tabs">
      <button :class="{ 'is-active': tab === 'mine' }" @click="tab = 'mine'">我兌換的</button>
      <button :class="{ 'is-active': tab === 'received' }" @click="tab = 'received'">向我兌換的</button>
    </div>

    <p v-if="notice" class="alert" style="margin-top: 14px">{{ notice }}</p>
    <p v-if="loading" class="faint" style="margin-top: 20px">載入中…</p>

    <p v-else-if="!rows.length" class="empty">
      {{ tab === 'mine' ? '你還沒有兌換過任何獎品。' : '還沒有人向你兌換獎品。' }}
    </p>

    <div v-else style="margin-top: 18px; display: flex; flex-direction: column; gap: 12px">
      <div
        v-for="row in rows"
        :key="row.id"
        class="card"
        :style="{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', opacity: row.status === 'void' ? 0.62 : 1 }"
      >
        <div style="flex: 1; min-width: 180px">
          <div style="font-size: 16px; font-weight: 700">{{ row.rewardName }}</div>
          <div style="margin-top: 4px; font-size: 13px; color: var(--sub)">
            <template v-if="tab === 'mine'">{{ row.ownerName }} 提供</template>
            <template v-else>{{ row.buyerName }} 兌換</template>
            · {{ dateTime(row.createdAt) }}
            <template v-if="tab === 'mine' && row.ownerLeft"> · 提供者已離開組別</template>
          </div>
        </div>

        <div class="num" style="font-size: 20px" :class="{ 'amount--minus': tab === 'mine' && row.status !== 'void' }">
          {{ tab === 'mine' ? '−' : '' }}{{ row.cost }}
        </div>

        <span class="pill" :class="`pill--${row.status}`">{{ REDEMPTION_STATUS[row.status] }}</span>

        <!-- 只有提供者看得到「已兌現」（design.md §9） -->
        <button
          v-if="tab === 'received' && row.status === 'pending'"
          class="btn btn--primary btn--sm"
          @click="fulfill(row)"
        >
          標記已兌現
        </button>
      </div>
    </div>
  </main>
</template>
