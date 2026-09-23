<script setup>
import { computed } from 'vue'
import { TASK_STATUS, shortDate } from '../format.js'

const props = defineProps({
  task: { type: Object, required: true },
  meId: { type: String, required: true },
  /** 桌機任務版用，清單模式不傾斜 */
  tilted: { type: Boolean, default: true }
})

// 顏色依狀態（設計稿：待認領黃、進行中藍、待確認橘、已完成綠）
const statusClass = computed(() => `note--${props.task.status}`)

// 每張便利貼有固定的小角度，用 id 決定，重整後位置不會跳動
const tilt = computed(() => {
  if (!props.tilted) return 'none'
  const seed = [...props.task.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return `rotate(${(((seed % 9) - 4) * 0.55).toFixed(2)}deg)`
})

const nameWithYou = (userId, displayName) =>
  (userId === props.meId ? `${displayName}（你）` : displayName)
</script>

<template>
  <div class="note" :class="statusClass" :style="{ transform: tilt }">
    <div class="note__head">
      <span class="note__status">{{ TASK_STATUS[task.status] }}</span>
      <span class="note__points">{{ task.points }}<span>點</span></span>
    </div>

    <div class="note__title">{{ task.title }}</div>

    <div v-if="task.assigneeName" class="note__assignee">
      執行者：{{ nameWithYou(task.assigneeId, task.assigneeName) }}
    </div>

    <div class="note__foot">
      <span>{{ nameWithYou(task.authorId, task.authorName) }} 發布</span>
      <span v-if="task.status === 'submitted'">已回報完成</span>
      <span v-else-if="task.dueDate">{{ shortDate(task.dueDate) }} 到期</span>
    </div>
  </div>
</template>
