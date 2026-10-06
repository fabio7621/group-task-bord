<script setup>
import { useAuthStore } from '../../stores/auth.js'

const props = defineProps({
  groupId: { type: String, default: '' },
  groupName: { type: String, default: '冰箱便利貼任務板' }
})

const auth = useAuthStore()

const tabs = [
  { name: 'board', label: '任務版' },
  { name: 'rewards', label: '獎品' },
  { name: 'points', label: '我的點數' },
  { name: 'redemptions', label: '兌換紀錄' },
  { name: 'members', label: '成員' }
]

</script>

<template>
  <header class="topbar">
    <RouterLink class="topbar__brand" :to="{ name: 'groups' }">{{ groupName }}</RouterLink>

    <nav v-if="props.groupId" class="topbar__tabs">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name, params: { id: props.groupId } }"
        active-class="is-active"
      >
        {{ tab.label }}
      </RouterLink>
    </nav>

    <div class="topbar__user">
      <span style="color: var(--ink)">{{ auth.user?.displayName }}</span>
      <button class="btn btn--sm" @click="auth.clearSession()">登出</button>
    </div>
  </header>
</template>
