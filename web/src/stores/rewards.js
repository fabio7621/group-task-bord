import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { rewardsApi } from '../api/rewards.js'
import { useAuthStore } from './auth.js'

export const useRewardsStore = defineStore('rewards', () => {
  const auth = useAuthStore()
  const groupId = ref('')
  const rewards = ref([])
  const myBalances = ref([])
  const loading = ref(true)

  async function load (id) {
    if (id !== groupId.value) {
      groupId.value = id
      rewards.value = []
      myBalances.value = []
      loading.value = true
    }
    try {
      const data = await rewardsApi.list(id)
      rewards.value = data.rewards
      myBalances.value = data.myBalances
    } finally {
      loading.value = false
    }
  }

  const reload = () => load(groupId.value)

  const balanceWith = (issuerId) =>
    myBalances.value.find((balance) => balance.issuerId === issuerId)?.amount ?? 0

  const myRewards = computed(() => rewards.value.filter((reward) => reward.ownerId === auth.user?.id))

  /** 別人上架的獎品，依提供者分組（design.md §7） */
  const rewardsByOwner = computed(() => {
    const grouped = new Map()
    for (const reward of rewards.value) {
      if (reward.ownerId === auth.user?.id) continue
      const owner = grouped.get(reward.ownerId) || { ownerId: reward.ownerId, ownerName: reward.ownerName, items: [] }
      grouped.set(reward.ownerId, { ...owner, items: [...owner.items, reward] })
    }
    return [...grouped.values()]
  })

  function redeemState (reward) {
    if (!reward.stock) return { disabled: true, label: '已換完' }
    if (balanceWith(reward.ownerId) < reward.cost) return { disabled: true, label: '點數不足' }
    return { disabled: false, label: '兌換' }
  }

  async function create (payload) {
    await rewardsApi.create(groupId.value, payload)
    await reload()
  }

  async function setStock (rewardId, stock) {
    await rewardsApi.setStock(groupId.value, rewardId, stock)
    await reload()
  }

  async function remove (rewardId) {
    await rewardsApi.remove(groupId.value, rewardId)
    await reload()
  }

  /** 成功或失敗（點數不足、剛好被換完）都重抓，讓畫面反映最新庫存與餘額（design.md §7-3） */
  async function redeem (rewardId) {
    try {
      await rewardsApi.redeem(groupId.value, rewardId)
    } finally {
      await reload()
    }
  }

  return {
    rewards, myBalances, loading, myRewards, rewardsByOwner,
    load, reload, balanceWith, redeemState, create, setStock, remove, redeem
  }
})
