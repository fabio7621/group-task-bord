<script setup>
import ModalSheet from '../common/ModalSheet.vue'
import { dateTime } from '../../lib/format.js'

defineProps({
  reminders: { type: Array, required: true }
})
const emit = defineEmits(['go', 'close'])
</script>

<template>
  <ModalSheet title="有人提醒你確認任務" width="440px" @close="emit('close')">
    <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 10px">
      <div
        v-for="reminder in reminders"
        :key="reminder.id"
        style="display: flex; align-items: center; gap: 12px; background: var(--note-submitted); padding: 12px; border-radius: 3px"
      >
        <div>
          <div style="font-size: 15px; font-weight: 700">{{ reminder.taskTitle }}</div>
          <div style="margin-top: 3px; font-size: 12px; color: #6b5748">
            {{ reminder.groupName }} · {{ reminder.fromName }} · {{ dateTime(reminder.at) }}
          </div>
        </div>
        <button class="btn btn--primary btn--sm" style="margin-left: auto" @click="emit('go', reminder)">
          前往
        </button>
      </div>
    </div>
    <template #foot>
      <button class="btn btn--sm" @click="emit('close')">稍後再看</button>
    </template>
  </ModalSheet>
</template>
