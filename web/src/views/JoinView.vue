<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { post } from '../api.js'
import { isLoggedIn, pendingInvite } from '../store.js'

const route = useRoute()
const router = useRouter()
const failedCode = ref('')

onMounted(async () => {
  const code = String(route.params.code || '').toUpperCase()

  // 未登入：記住邀請碼，登入或註冊完成後自動加入（規格 §4）
  if (!isLoggedIn.value) {
    pendingInvite.set(code)
    return router.replace({ name: 'login', query: { redirect: route.fullPath } })
  }

  try {
    const group = await post('/groups/join', { code })
    router.replace({ name: 'board', params: { id: group.id } })
  } catch {
    failedCode.value = code
  }
})
</script>

<template>
  <div v-if="failedCode" class="center-page">
    <div class="sticky sticky--orange" style="transform: rotate(-3.5deg); text-align: center">
      <div style="font-size: 22px; font-weight: 900">邀請連結已失效</div>
      <div class="num" style="margin-top: 6px; font-size: 14px; color: #6b5748">{{ failedCode }}</div>
    </div>
    <p class="muted" style="max-width: 340px; line-height: 1.8">
      邀請碼可能已經被更換，或這個組別已經解散。請向組員索取新的邀請連結。
    </p>
    <RouterLink class="btn btn--primary" :to="{ name: 'groups' }">回到組別列表</RouterLink>
  </div>

  <div v-else class="center-page muted">處理邀請中…</div>
</template>
