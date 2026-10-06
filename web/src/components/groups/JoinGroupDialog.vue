<script setup>
import { ref } from 'vue'
import ModalSheet from '../common/ModalSheet.vue'

defineProps({
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['submit', 'close'])

const code = ref('')
</script>

<template>
  <ModalSheet title="輸入邀請碼" width="400px" @close="emit('close')">
    <form class="form" style="margin-top: 16px" @submit.prevent="emit('submit', code.trim())">
      <label class="field field--num">
        <span class="field__label">邀請碼 <span class="req">*</span></span>
        <input
          v-model="code"
          required
          style="letter-spacing: 0.22em; text-transform: uppercase"
          placeholder="K7QX2A"
          autofocus
        />
      </label>
      <p v-if="error" class="hint hint--error">{{ error }}</p>
      <div class="sheet__foot">
        <button type="button" class="btn btn--sm" @click="emit('close')">取消</button>
        <button type="submit" class="btn btn--primary btn--sm" :disabled="busy">加入</button>
      </div>
    </form>
  </ModalSheet>
</template>
