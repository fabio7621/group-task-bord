<script setup>
import { ref } from 'vue'
import ModalSheet from '../common/ModalSheet.vue'

defineProps({
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['submit', 'close'])

const name = ref('')
</script>

<template>
  <ModalSheet title="建立組別" width="400px" @close="emit('close')">
    <form class="form" style="margin-top: 16px" @submit.prevent="emit('submit', name.trim())">
      <label class="field">
        <span class="field__label">組別名稱 <span class="req">*</span></span>
        <input v-model="name" required maxlength="30" autofocus />
        <span class="hint">1～30 字</span>
      </label>
      <p v-if="error" class="alert">{{ error }}</p>
      <div class="sheet__foot">
        <button type="button" class="btn btn--sm" @click="emit('close')">取消</button>
        <button type="submit" class="btn btn--primary btn--sm" :disabled="busy">建立</button>
      </div>
    </form>
  </ModalSheet>
</template>
