import { defineStore } from 'pinia'
import { ref } from 'vue'
import { rewardsApi } from '../api/rewards.js'

export const usePointsStore = defineStore('points', () => {
  const groupId = ref('')
  const balances = ref([])
  const transactions = ref([])
  const loading = ref(true)

  async function load (id) {
    if (id !== groupId.value) {
      groupId.value = id
      balances.value = []
      transactions.value = []
      loading.value = true
    }
    try {
      const data = await rewardsApi.points(id)
      balances.value = data.balances
      transactions.value = data.transactions
    } finally {
      loading.value = false
    }
  }

  const reload = () => load(groupId.value)

  return { balances, transactions, loading, load, reload }
})
