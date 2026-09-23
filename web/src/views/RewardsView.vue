<script setup>
import { computed, onMounted, ref } from 'vue'
import { del, get, patch, post } from '../api.js'
import { auth } from '../store.js'
import { useGroup } from '../useGroup.js'
import TopBar from '../components/TopBar.vue'
import ModalSheet from '../components/ModalSheet.vue'

const meId = computed(() => auth.user?.id)

const rewards = ref([])
const myBalances = ref([])
const loading = ref(true)
const notice = ref('')

const dialog = ref('')
const activeReward = ref(null)
const error = ref('')
const busy = ref(false)
const form = ref({ name: '', description: '', cost: 20, stock: 1 })
const stockInput = ref(0)

const { groupId, group } = useGroup({
  'rewards:changed': () => loadRewards(),
  'points:changed': () => loadRewards(),
  reconnect: () => loadRewards()
})

async function loadRewards () {
  const data = await get(`/groups/${groupId.value}/rewards`)
  rewards.value = data.rewards
  myBalances.value = data.myBalances
}

onMounted(async () => {
  try {
    await loadRewards()
  } finally {
    loading.value = false
  }
})

const balanceWith = (issuerId) =>
  myBalances.value.find((balance) => balance.issuerId === issuerId)?.amount ?? 0

const myRewards = computed(() => rewards.value.filter((reward) => reward.ownerId === meId.value))

/** 依提供者分組（design.md §7） */
const rewardsByOwner = computed(() => {
  const grouped = new Map()
  for (const reward of rewards.value) {
    if (reward.ownerId === meId.value) continue
    if (!grouped.has(reward.ownerId)) {
      grouped.set(reward.ownerId, { ownerId: reward.ownerId, ownerName: reward.ownerName, items: [] })
    }
    grouped.get(reward.ownerId).items.push(reward)
  }
  return [...grouped.values()]
})

function redeemState (reward) {
  if (!reward.stock) return { disabled: true, label: '已換完' }
  if (balanceWith(reward.ownerId) < reward.cost) return { disabled: true, label: '點數不足' }
  return { disabled: false, label: '兌換' }
}

function openDialog (name, reward = null) {
  error.value = ''
  activeReward.value = reward
  if (name === 'create') form.value = { name: '', description: '', cost: 20, stock: 1 }
  if (name === 'stock') stockInput.value = reward.stock
  dialog.value = name
}

async function createReward () {
  error.value = ''
  busy.value = true
  try {
    await post(`/groups/${groupId.value}/rewards`, {
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      cost: Number(form.value.cost),
      stock: Number(form.value.stock)
    })
    dialog.value = ''
    await loadRewards()
  } catch (apiError) {
    error.value = apiError.message
  } finally {
    busy.value = false
  }
}

async function saveStock () {
  error.value = ''
  busy.value = true
  try {
    await patch(`/groups/${groupId.value}/rewards/${activeReward.value.id}/stock`, { stock: Number(stockInput.value) })
    dialog.value = ''
    await loadRewards()
  } catch (apiError) {
    error.value = apiError.message
  } finally {
    busy.value = false
  }
}

async function removeReward (reward) {
  notice.value = ''
  try {
    await del(`/groups/${groupId.value}/rewards/${reward.id}`)
    await loadRewards()
  } catch (apiError) {
    notice.value = apiError.message
  }
}

async function confirmRedeem () {
  error.value = ''
  busy.value = true
  try {
    await post(`/groups/${groupId.value}/rewards/${activeReward.value.id}/redeem`)
    dialog.value = ''
    notice.value = `已兌換「${activeReward.value.name}」，等提供者兌現。`
    await loadRewards()
  } catch (apiError) {
    // 失敗（點數不足或剛好被換完）顯示原因，不扣點（design.md §7-3）
    error.value = apiError.message
    await loadRewards()
  } finally {
    busy.value = false
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
          v-for="balance in myBalances"
          :key="balance.issuerId"
          class="card"
          style="border-radius: 999px; padding: 7px 14px; font-size: 14px"
        >
          {{ balance.issuerName }} <b class="num" style="font-size: 17px">{{ balance.amount }}</b>
        </span>
        <span v-if="!myBalances.length" class="faint">還沒有任何點數</span>
      </div>
      <button class="btn btn--primary btn--sm spacer" @click="openDialog('create')">＋ 上架獎品</button>
    </div>

    <p v-if="notice" class="alert" style="margin-top: 14px">{{ notice }}</p>
    <p v-if="loading" class="faint" style="margin-top: 26px">載入中…</p>

    <div v-else-if="!rewards.length" class="empty">
      <div class="empty__ghosts"><i /><i /><i /></div>
      <p>組別裡還沒有任何獎品。<br />上架一個，讓組員有東西可以換。</p>
      <button class="btn btn--primary" @click="openDialog('create')">＋ 上架獎品</button>
    </div>

    <div v-else style="margin-top: 26px; display: flex; flex-direction: column; gap: 22px">
      <section v-for="owner in rewardsByOwner" :key="owner.ownerId">
        <div style="font-size: 15px; font-weight: 700; color: var(--muted)">
          {{ owner.ownerName }} 提供
          <span style="font-weight: 400; color: var(--fainter)">· 你有 {{ balanceWith(owner.ownerId) }} 點</span>
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
                :class="{ 'btn--primary': !redeemState(reward).disabled }"
                style="margin-top: 8px"
                :disabled="redeemState(reward).disabled"
                @click="openDialog('redeem', reward)"
              >
                {{ redeemState(reward).label }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="myRewards.length">
        <div style="font-size: 15px; font-weight: 700; color: var(--muted)">我上架的獎品</div>
        <div style="margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px">
          <div
            v-for="reward in myRewards"
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

  <ModalSheet v-if="dialog === 'create'" title="上架獎品" width="440px" @close="dialog = ''">
    <form class="form" style="margin-top: 16px" @submit.prevent="createReward">
      <label class="field">
        <span class="field__label">獎品名稱 <span class="req">*</span></span>
        <input v-model="form.name" required maxlength="30" autofocus />
      </label>
      <label class="field">
        <span class="field__label">說明</span>
        <textarea v-model="form.description" maxlength="200" placeholder="最多 200 字" />
      </label>
      <div class="form-row">
        <label class="field field--num">
          <span class="field__label">兌換點數 <span class="req">*</span></span>
          <input v-model="form.cost" type="number" min="1" max="100" step="1" required />
          <span class="hint">1～100，上架後不可修改</span>
        </label>
        <label class="field field--num">
          <span class="field__label">庫存 <span class="req">*</span></span>
          <input v-model="form.stock" type="number" min="1" max="999" step="1" required />
        </label>
      </div>
      <p v-if="error" class="alert">{{ error }}</p>
      <div class="sheet__foot">
        <button type="button" class="btn btn--sm" @click="dialog = ''">取消</button>
        <button type="submit" class="btn btn--primary btn--sm" :disabled="busy">上架</button>
      </div>
    </form>
  </ModalSheet>

  <ModalSheet v-if="dialog === 'stock'" title="調整庫存" width="360px" @close="dialog = ''">
    <form class="form" style="margin-top: 16px" @submit.prevent="saveStock">
      <label class="field field--num">
        <span class="field__label">庫存 <span class="req">*</span></span>
        <input v-model="stockInput" type="number" min="0" max="999" step="1" required autofocus />
        <span class="hint">歸零後顯示為「已換完」</span>
      </label>
      <p v-if="error" class="alert">{{ error }}</p>
      <div class="sheet__foot">
        <button type="button" class="btn btn--sm" @click="dialog = ''">取消</button>
        <button type="submit" class="btn btn--primary btn--sm" :disabled="busy">儲存</button>
      </div>
    </form>
  </ModalSheet>

  <ModalSheet v-if="dialog === 'redeem'" title="確認兌換" width="420px" @close="dialog = ''">
    <div style="margin-top: 16px; background: var(--panel); border-radius: 4px; padding: 16px">
      <div style="font-size: 17px; font-weight: 700">{{ activeReward.name }}</div>
      <div style="margin-top: 4px; font-size: 13px; color: var(--sub)">{{ activeReward.ownerName }} 提供</div>
    </div>

    <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 14px">
      <div style="display: flex; justify-content: space-between">
        <span class="muted">需要點數</span><span class="num" style="font-size: 17px">{{ activeReward.cost }}</span>
      </div>
      <div style="display: flex; justify-content: space-between">
        <span class="muted">目前餘額</span>
        <span class="num" style="font-size: 17px">{{ balanceWith(activeReward.ownerId) }}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px dashed var(--line-strong)">
        <span class="muted">兌換後餘額</span>
        <span class="num" style="font-size: 17px; color: var(--brick)">
          {{ balanceWith(activeReward.ownerId) - activeReward.cost }}
        </span>
      </div>
    </div>

    <p v-if="error" class="alert" style="margin-top: 14px">{{ error }}</p>

    <template #foot>
      <button class="btn btn--sm" @click="dialog = ''">取消</button>
      <button class="btn btn--primary btn--sm" :disabled="busy" @click="confirmRedeem">確認兌換</button>
    </template>
  </ModalSheet>
</template>
