<script setup>
import { onMounted, ref } from 'vue'
import { useRewardsStore } from '../stores/rewards.js'
import { useGroup } from '../composables/useGroup.js'
import { useSubmit } from '../composables/useSubmit.js'
import TopBar from '../components/common/TopBar.vue'
import RewardFormDialog from '../components/rewards/RewardFormDialog.vue'
import StockDialog from '../components/rewards/StockDialog.vue'
import RedeemDialog from '../components/rewards/RedeemDialog.vue'

const rewards = useRewardsStore()
const { busy, error, run, reset } = useSubmit()

const notice = ref('')
const dialog = ref('')
const activeReward = ref(null)

const { groupId, group } = useGroup({
  'rewards:changed': rewards.reload,
  'points:changed': rewards.reload,
  reconnect: rewards.reload
})

onMounted(() => rewards.load(groupId.value))

function openDialog (name, reward = null) {
  reset()
  activeReward.value = reward
  dialog.value = name
}

const closeDialog = () => { dialog.value = '' }

const createReward = (payload) => run(async () => {
  await rewards.create(payload)
  closeDialog()
})

const saveStock = (stock) => run(async () => {
  await rewards.setStock(activeReward.value.id, stock)
  closeDialog()
})

const confirmRedeem = () => run(async () => {
  await rewards.redeem(activeReward.value.id)
  closeDialog()
  notice.value = `已兌換「${activeReward.value.name}」，等提供者兌現。`
})

async function removeReward (reward) {
  notice.value = ''
  try {
    await rewards.remove(reward.id)
  } catch (apiError) {
    notice.value = apiError.message
  }
}
</script>

<template>
  <TopBar :group-id="groupId" :group-name="group?.name || '獎品'" />

  <main class="page">
    <div class="page-head">
      <span class="faint">我持有的點數</span>
      <div style="display: flex; gap: 10px; flex-wrap: wrap">
        <span
          v-for="balance in rewards.myBalances"
          :key="balance.issuerId"
          class="card"
          style="border-radius: 999px; padding: 7px 14px; font-size: 14px"
        >
          {{ balance.issuerName }} <b class="num" style="font-size: 17px">{{ balance.amount }}</b>
        </span>
        <span v-if="!rewards.myBalances.length" class="faint">還沒有任何點數</span>
      </div>
      <button class="btn btn--primary btn--sm spacer" @click="openDialog('create')">＋ 上架獎品</button>
    </div>

    <p v-if="notice" class="alert" style="margin-top: 14px">{{ notice }}</p>
    <p v-if="rewards.loading" class="faint" style="margin-top: 26px">載入中…</p>

    <div v-else-if="!rewards.rewards.length" class="empty">
      <div class="empty__ghosts"><i /><i /><i /></div>
      <p>組別裡還沒有任何獎品。<br />上架一個，讓組員有東西可以換。</p>
      <button class="btn btn--primary" @click="openDialog('create')">＋ 上架獎品</button>
    </div>

    <div v-else style="margin-top: 26px; display: flex; flex-direction: column; gap: 22px">
      <section v-for="owner in rewards.rewardsByOwner" :key="owner.ownerId">
        <div style="font-size: 15px; font-weight: 700; color: var(--muted)">
          {{ owner.ownerName }} 提供
          <span style="font-weight: 400; color: var(--fainter)">· 你有 {{ rewards.balanceWith(owner.ownerId) }} 點</span>
        </div>

        <div style="margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px">
          <div
            v-for="reward in owner.items"
            :key="reward.id"
            class="card"
            :style="{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', opacity: reward.stock ? 1 : 0.6 }"
          >
            <div style="flex: 1">
              <div style="font-size: 17px; font-weight: 700">{{ reward.name }}</div>
              <div v-if="reward.description" style="margin-top: 4px; font-size: 13px; color: var(--sub)">
                {{ reward.description }}
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: var(--fainter)">
                {{ reward.stock ? `剩 ${reward.stock} 個` : '已換完' }}
              </div>
            </div>
            <div style="text-align: right">
              <div class="num" style="font-size: 24px" :style="{ color: reward.stock ? 'var(--brick)' : 'inherit' }">
                {{ reward.cost }}
              </div>
              <button
                class="btn btn--sm"
                :class="{ 'btn--primary': !rewards.redeemState(reward).disabled }"
                style="margin-top: 8px"
                :disabled="rewards.redeemState(reward).disabled"
                @click="openDialog('redeem', reward)"
              >
                {{ rewards.redeemState(reward).label }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="rewards.myRewards.length">
        <div style="font-size: 15px; font-weight: 700; color: var(--muted)">我上架的獎品</div>
        <div style="margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px">
          <div
            v-for="reward in rewards.myRewards"
            :key="reward.id"
            class="card card--own"
            style="padding: 16px; display: flex; align-items: center; gap: 16px"
          >
            <div style="flex: 1">
              <div style="font-size: 17px; font-weight: 700">{{ reward.name }}</div>
              <div style="margin-top: 8px; font-size: 12px; color: var(--faint)">
                {{ reward.cost }} 點 · 庫存 {{ reward.stock }}
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap">
              <button class="btn btn--sm" @click="openDialog('stock', reward)">調整庫存</button>
              <button class="btn btn--sm btn--danger" @click="removeReward(reward)">下架</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>

  <RewardFormDialog v-if="dialog === 'create'" :busy="busy" :error="error" @submit="createReward" @close="closeDialog" />

  <StockDialog
    v-if="dialog === 'stock'"
    :reward="activeReward"
    :busy="busy"
    :error="error"
    @submit="saveStock"
    @close="closeDialog"
  />

  <RedeemDialog
    v-if="dialog === 'redeem'"
    :reward="activeReward"
    :balance="rewards.balanceWith(activeReward.ownerId)"
    :busy="busy"
    :error="error"
    @confirm="confirmRedeem"
    @close="closeDialog"
  />
</template>
