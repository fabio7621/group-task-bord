<script setup>
import { ref } from 'vue'
import ModalSheet from '../common/ModalSheet.vue'

const props = defineProps({
  reward: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['submit', 'close'])

const stock = ref(props.reward.stock)
</script>

<template>
  <ModalSheet title="調整庫存" width="360px" @close="emit('close')">
    <form class="form" style="margin-top: 16px" @submit.prevent="emit('submit', Number(stock))">
      <label class="field field--num">
        <span class="field__label">庫存 <span class="req">*</span></span>
        <input v-model="stock" type="number" min="0" max="999" step="1" required autofocus />
        <span class="hint">歸零後顯示為「已換完」</span>
      </label>
      <p v-if="error" class="alert">{{ error }}</p>
      <div class="sheet__foot">
        <button type="button" class="btn btn--sm" @click="emit('close')">取消</button>
        <button type="submit" class="btn btn--primary btn--sm" :disabled="busy">儲存</button>
      </div>
    </form>
  </ModalSheet>
</template>
