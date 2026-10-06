<script setup>
import { ref } from 'vue'
import ModalSheet from '../common/ModalSheet.vue'

defineProps({
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['submit', 'close'])

const form = ref({ name: '', description: '', cost: 20, stock: 1 })

function submit () {
  emit('submit', {
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    cost: Number(form.value.cost),
    stock: Number(form.value.stock)
  })
}
</script>

<template>
  <ModalSheet title="上架獎品" width="440px" @close="emit('close')">
    <form class="form" style="margin-top: 16px" @submit.prevent="submit">
      <label class="field">
        <span class="field__label">獎品名稱 <span class="req">*</span></span>
        <input v-model="form.name" required maxlength="30" autofocus />
      </label>
      <label class="field">
        <span class="field__label">說明</span>
        <textarea v-model="form.description" maxlength="200" placeholder="最多 200 字" />
      </label>
      <div class="form-row">
        <label class="field field--num">
          <span class="field__label">兌換點數 <span class="req">*</span></span>
          <input v-model="form.cost" type="number" min="1" max="100" step="1" required />
          <span class="hint">1～100，上架後不可修改</span>
        </label>
        <label class="field field--num">
          <span class="field__label">庫存 <span class="req">*</span></span>
          <input v-model="form.stock" type="number" min="1" max="999" step="1" required />
        </label>
      </div>
      <p v-if="error" class="alert">{{ error }}</p>
      <div class="sheet__foot">
        <button type="button" class="btn btn--sm" @click="emit('close')">取消</button>
        <button type="submit" class="btn btn--primary btn--sm" :disabled="busy">上架</button>
      </div>
    </form>
  </ModalSheet>
</template>
