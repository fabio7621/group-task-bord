<script setup>
import ModalSheet from '../common/ModalSheet.vue'

defineProps({
  reward: { type: Object, required: true },
  /** 我持有該提供者的點數 */
  balance: { type: Number, required: true },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['confirm', 'close'])
</script>

<template>
  <ModalSheet title="確認兌換" width="420px" @close="emit('close')">
    <div style="margin-top: 16px; background: var(--panel); border-radius: 4px; padding: 16px">
      <div style="font-size: 17px; font-weight: 700">{{ reward.name }}</div>
      <div style="margin-top: 4px; font-size: 13px; color: var(--sub)">{{ reward.ownerName }} 提供</div>
    </div>

    <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 14px">
      <div style="display: flex; justify-content: space-between">
        <span class="muted">需要點數</span><span class="num" style="font-size: 17px">{{ reward.cost }}</span>
      </div>
      <div style="display: flex; justify-content: space-between">
        <span class="muted">目前餘額</span>
        <span class="num" style="font-size: 17px">{{ balance }}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px dashed var(--line-strong)">
        <span class="muted">兌換後餘額</span>
        <span class="num" style="font-size: 17px; color: var(--brick)">{{ balance - reward.cost }}</span>
      </div>
    </div>

    <p v-if="error" class="alert" style="margin-top: 14px">{{ error }}</p>

    <template #foot>
      <button class="btn btn--sm" @click="emit('close')">取消</button>
      <button class="btn btn--primary btn--sm" :disabled="busy" @click="emit('confirm')">確認兌換</button>
    </template>
  </ModalSheet>
</template>
