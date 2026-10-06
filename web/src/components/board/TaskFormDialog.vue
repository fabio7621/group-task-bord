<script setup>
import { ref } from 'vue'
import ModalSheet from './ModalSheet.vue'
import { dateInputValue } from '../format.js'

const props = defineProps({
  /** null 表示發布新任務，有值表示修改 */
  task: { type: Object, default: null },
  /** 非同步函式，失敗時丟出的訊息直接顯示在彈窗裡 */
  save: { type: Function, required: true }
})
const emit = defineEmits(['close'])

const form = ref({
  title: props.task?.title || '',
  description: props.task?.description || '',
  points: props.task?.points ?? 10,
  dueDate: dateInputValue(props.task?.dueDate)
})
const error = ref('')
const busy = ref(false)

async function submit () {
  error.value = ''
  const points = Number(form.value.points)
  if (!Number.isInteger(points) || points < 1 || points > 100) {
    error.value = '點數必須是 1～100 的整數'
    return
  }

  busy.value = true
  try {
    await props.save({
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      points,
      dueDate: form.value.dueDate || null
    })
  } catch (apiError) {
    error.value = apiError.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalSheet :title="props.task ? '修改任務' : '發布任務'" width="470px" @close="emit('close')">
    <form class="form" style="margin-top: 20px" @submit.prevent="submit">
      <label class="field">
        <span class="field__label">標題 <span class="req">*</span></span>
        <input v-model="form.title" required maxlength="30" autofocus />
        <span class="hint">1～30 字，便利貼放得下</span>
      </label>

      <label class="field">
        <span class="field__label">說明</span>
        <textarea v-model="form.description" maxlength="200" placeholder="最多 200 字" />
      </label>

      <div class="form-row">
        <label class="field field--num">
          <span class="field__label">點數 <span class="req">*</span></span>
          <input v-model="form.points" type="number" min="1" max="100" step="1" required />
          <span class="hint">1～100 的整數</span>
        </label>

        <label class="field">
          <span class="field__label">截止日期</span>
          <input v-model="form.dueDate" type="date" />
        </label>
      </div>

      <p v-if="error" class="alert">{{ error }}</p>

      <div class="sheet__foot">
        <button type="button" class="btn btn--sm" @click="emit('close')">取消</button>
        <button type="submit" class="btn btn--primary btn--sm" :disabled="busy">
          {{ props.task ? '儲存' : '貼上任務版' }}
        </button>
      </div>
    </form>
  </ModalSheet>
</template>
