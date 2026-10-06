<script setup>
import { computed, ref } from 'vue'
import ModalSheet from '../common/ModalSheet.vue'
import { TASK_STATUS, dateTime, fullDate } from '../../lib/format.js'

const props = defineProps({
  task: { type: Object, required: true },
  meId: { type: String, required: true }
})
const emit = defineEmits(['act', 'edit', 'close'])

const isAuthor = computed(() => props.task.authorId === props.meId)
const isAssignee = computed(() => props.task.assigneeId === props.meId)
const status = computed(() => props.task.status)

/** 刪除與放棄需要再按一次確認（design.md §6-2） */
const confirming = ref('')

function emitAction (action, needsConfirm = false) {
  if (needsConfirm && confirming.value !== action) {
    confirming.value = action
    return
  }
  confirming.value = ''
  emit('act', action)
}
</script>

<template>
  <ModalSheet width="470px" @close="emit('close')">
    <template #head>
      <span class="pill" :class="`pill--${status}`">{{ TASK_STATUS[status] }}</span>
    </template>

    <h3 style="margin-top: 16px; font-size: 26px; font-weight: 700; line-height: 1.3">{{ task.title }}</h3>
    <div class="num" style="margin-top: 6px; font-size: 26px; color: var(--brick)">
      {{ task.points }}
      <span style="font-family: inherit; font-size: 14px; color: var(--muted)">點</span>
    </div>

    <p
      v-if="task.description"
      style="margin-top: 16px; font-size: 15px; line-height: 1.8; color: #4a443c; background: var(--panel); padding: 14px; border-radius: 4px; white-space: pre-wrap"
    >{{ task.description }}</p>

    <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; font-size: 14px">
      <div>
        <div class="faint" style="font-size: 12px">發布者</div>
        <div style="margin-top: 3px; font-weight: 700">{{ task.authorName }}</div>
      </div>
      <div>
        <div class="faint" style="font-size: 12px">執行者</div>
        <div style="margin-top: 3px; font-weight: 700">{{ task.assigneeName || '—' }}</div>
      </div>
      <div>
        <div class="faint" style="font-size: 12px">截止日期</div>
        <div style="margin-top: 3px; font-weight: 700">{{ task.dueDate ? fullDate(task.dueDate) : '—' }}</div>
      </div>
      <div>
        <div class="faint" style="font-size: 12px">發布時間</div>
        <div style="margin-top: 3px; font-weight: 700">{{ dateTime(task.createdAt) }}</div>
      </div>
    </div>

    <div style="margin-top: 22px; padding-top: 18px; border-top: 1px dashed var(--line-strong); display: flex; gap: 10px; flex-wrap: wrap">
      <!-- 按鈕依「我的身分 × 任務狀態」顯示（design.md §6-2） -->
      <template v-if="status === 'open'">
        <template v-if="isAuthor">
          <button class="btn btn--sm" @click="emit('edit')">修改</button>
          <button class="btn btn--sm btn--danger" @click="emitAction('delete', true)">
            {{ confirming === 'delete' ? '再按一次確認刪除' : '刪除' }}
          </button>
        </template>
        <button v-else class="btn btn--primary" style="flex: 1" @click="emitAction('claim')">認領這張便利貼</button>
      </template>

      <template v-else-if="status === 'claimed' && isAssignee">
        <button class="btn btn--primary" style="flex: 1" @click="emitAction('submit')">回報完成</button>
        <button class="btn btn--danger" @click="emitAction('abandon', true)">
          {{ confirming === 'abandon' ? '再按一次確認放棄' : '放棄' }}
        </button>
      </template>

      <template v-else-if="status === 'submitted'">
        <button v-if="isAuthor" class="btn btn--primary" style="flex: 1" @click="emitAction('confirm')">
          確認完成，發出 {{ task.points }} 點
        </button>
        <template v-if="isAssignee">
          <button class="btn btn--sm" @click="emitAction('remind')">提醒</button>
          <button class="btn btn--sm btn--danger" @click="emitAction('abandon', true)">
            {{ confirming === 'abandon' ? '再按一次確認放棄' : '放棄' }}
          </button>
        </template>
      </template>

      <p v-else class="faint" style="margin: 0">
        {{ status === 'done' ? '這張便利貼已經完成，點數已經發出。' : '目前沒有你可以做的操作。' }}
      </p>
    </div>
  </ModalSheet>
</template>
