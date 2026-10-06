import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { get } from './api.js'
import { joinGroup } from './socket.js'

/**
 * 組別頁共用：載入組別資訊、加入即時同步房間、不是成員就導回組別列表。
 * handlers 會綁到該組別的 socket 事件上，reconnect 時呼叫 handlers.reconnect。
 */
export function useGroup (handlers = {}) {
  const route = useRoute()
  const router = useRouter()
  const groupId = computed(() => String(route.params.id))
  const group = ref(null)
  let unsubscribe = null

  onMounted(async () => {
    try {
      group.value = await get(`/groups/${groupId.value}`)
    } catch (error) {
      // 進入自己不是成員的組別頁面：導回組別列表（design.md 頁面總覽）
      if (error.code === 'NOT_MEMBER' || error.code === 'NOT_FOUND') {
        return router.replace({ name: 'groups' })
      }
      throw error
    }
    unsubscribe = joinGroup(groupId.value, handlers)
  })

  onUnmounted(() => unsubscribe?.())

  return { groupId, group }
}
