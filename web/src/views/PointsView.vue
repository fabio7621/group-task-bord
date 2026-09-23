<script setup>
import { onMounted, ref } from 'vue'
import { get } from '../api.js'
import { useGroup } from '../useGroup.js'
import { TX_KIND, dateTime } from '../format.js'
import TopBar from '../components/TopBar.vue'

const balances = ref([])
const transactions = ref([])
const loading = ref(true)

const STICKY_COLORS = ['', 'sticky--blue', 'sticky--green', 'sticky--orange']
const COLUMNS = '130px 80px 90px 1fr 80px'

const { groupId, group } = useGroup({
  'points:changed': () => loadPoints(),
  reconnect: () => loadPoints()
})

async function loadPoints () {
  const data = await get(`/groups/${groupId.value}/points`)
  balances.value = data.balances
  transactions.value = data.transactions
}

onMounted(async () => {
  try {
    await loadPoints()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <TopBar :group-id="groupId" :group-name="group?.name || '我的點數'" />

  <main class="page">
    <p v-if="loading" class="faint">載入中…</p>

    <template v-else-if="!balances.length && !transactions.length">
      <div class="empty">
        <div class="sticky" style="transform: rotate(-3deg); text-align: center; align-items: center">
          <div class="num" style="font-size: 40px; line-height: 1">0</div>
          <div style="margin-top: 6px; font-size: 13px; color: #6b6355">還沒有任何點數</div>
        </div>
        <p>到任務版認領一張便利貼，<br />完成後就會拿到發布者的點數。</p>
        <RouterLink class="btn btn--primary" :to="{ name: 'board', params: { id: groupId } }">
          去看任務版
        </RouterLink>
      </div>
    </template>

    <template v-else>
      <h2 style="font-size: 20px; font-weight: 700">餘額</h2>
      <div style="margin-top: 14px; display: flex; gap: 18px; flex-wrap: wrap">
        <div
          v-for="(balance, index) in balances"
          :key="balance.issuerId"
          class="sticky"
          :class="STICKY_COLORS[index % STICKY_COLORS.length]"
          :style="{ width: '170px', padding: '16px', transform: `rotate(${index % 2 ? 1.4 : -1.2}deg)` }"
        >
          <div style="font-size: 13px; color: rgba(46, 42, 59, 0.66)">{{ balance.issuerName }} 發行</div>
          <div class="num" style="margin-top: 6px; font-size: 34px; line-height: 1">{{ balance.amount }}</div>
        </div>
        <p v-if="!balances.length" class="faint">目前沒有任何餘額。</p>
      </div>

      <h2 class="section-title">交易紀錄</h2>
      <div class="list" style="margin-top: 12px">
        <div class="table__head" :style="{ gridTemplateColumns: COLUMNS }">
          <span>時間</span><span>類型</span><span>發行者</span><span>相關項目</span>
          <span style="text-align: right">點數</span>
        </div>
        <div
          v-for="tx in transactions"
          :key="tx.id"
          class="table__row"
          :style="{ gridTemplateColumns: COLUMNS }"
        >
          <span style="color: var(--sub)">{{ dateTime(tx.at) }}</span>
          <span>{{ TX_KIND[tx.kind] }}</span>
          <span>{{ tx.issuerName }}</span>
          <span :style="{ color: tx.kind === 'void' ? 'var(--sub)' : 'inherit' }">{{ tx.label }}</span>
          <span class="amount" :class="tx.amount > 0 ? 'amount--plus' : 'amount--minus'">
            {{ tx.amount > 0 ? '+' : '−' }}{{ Math.abs(tx.amount) }}
          </span>
        </div>
        <p v-if="!transactions.length" class="faint" style="padding: 16px">還沒有任何交易紀錄。</p>
      </div>
    </template>
  </main>
</template>
