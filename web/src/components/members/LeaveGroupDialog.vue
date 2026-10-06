<script setup>
import ModalSheet from '../common/ModalSheet.vue'

defineProps({
  groupName: { type: String, required: true },
  /** 後端 leave-preview 的結果 */
  preview: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
const emit = defineEmits(['confirm', 'close'])
</script>

<template>
  <ModalSheet :title="`離開「${groupName}」？`" width="470px" @close="emit('close')">
    <p class="muted" style="margin-top: 10px; font-size: 14px; line-height: 1.7">
      離開後以下資料會一併處理，無法復原。
    </p>

    <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 14px">
      <div style="background: var(--danger-bg); border-radius: 4px; padding: 12px 14px">
        <div style="font-weight: 700; color: var(--danger-ink)">會作廢的點數</div>
        <div style="margin-top: 4px; color: #7a5548; line-height: 1.6">
          你持有：
          <template v-if="preview.heldPoints.length">
            <span v-for="(item, index) in preview.heldPoints" :key="item.issuerName">
              <template v-if="index">、</template>{{ item.issuerName }} {{ item.amount }}
            </span>
          </template>
          <template v-else>無</template>
          <br />別人持有你的點數：共 {{ preview.pointsOthersHold }}
        </div>
      </div>

      <div
        v-for="block in [
          { title: '會下架的獎品', items: preview.rewards },
          { title: '會下架的任務', items: preview.tasksRemoved },
          { title: '會退回任務版的任務', items: preview.tasksReturned }
        ]"
        :key="block.title"
        style="background: var(--panel); border-radius: 4px; padding: 12px 14px"
      >
        <div style="font-weight: 700">{{ block.title }}</div>
        <div style="margin-top: 4px; color: var(--sub)">
          {{ block.items.length ? block.items.join('、') : '無' }}
        </div>
      </div>

      <div style="background: var(--panel); border-radius: 4px; padding: 12px 14px">
        <div style="font-weight: 700">會失效的兌換紀錄</div>
        <div style="margin-top: 4px; color: var(--sub)">
          <template v-if="preview.redemptionsVoided.length">
            <div v-for="item in preview.redemptionsVoided" :key="item.rewardName + item.buyerName">
              {{ item.buyerName }} 向你兌換的「{{ item.rewardName }}」
            </div>
          </template>
          <template v-else>無</template>
        </div>
      </div>

      <div v-if="preview.isLastMember" class="alert">
        你是最後一位成員，離開後組別將被解散，所有資料會被刪除。
      </div>

      <p v-if="error" class="alert">{{ error }}</p>
    </div>

    <template #foot>
      <button class="btn btn--sm" @click="emit('close')">取消</button>
      <button class="btn btn--danger-solid btn--sm" :disabled="busy" @click="emit('confirm')">確認離開</button>
    </template>
  </ModalSheet>
</template>
