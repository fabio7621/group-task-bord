import { defineStore } from 'pinia'
import { ref } from 'vue'
import { rewardsApi } from '../api/rewards.js'

export const useRedemptionsStore = defineStore('redemptions', () => {
  const groupId = ref('')
  const mine = ref([])
  const received = ref([])
  const loading = ref(true)

  async function load (id) {
    if (id !== groupId.value) {
      groupId.value = id
      mine.value = []
      received.value = []
      loading.value = true
    }
    try {
      const data = await rewardsApi.redemptions(id)
      mine.value = data.mine
      received.value = data.received
    } finally {
      loading.value = false
    }
  }

  const reload = () => load(groupId.value)

  async function fulfill (redemptionId) {
    await rewardsApi.fulfill(groupId.value, redemptionId)
    await reload()
  }

  return { mine, received, loading, load, reload, fulfill }
})
