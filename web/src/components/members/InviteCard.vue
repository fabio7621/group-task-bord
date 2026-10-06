<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  inviteCode: { type: String, required: true }
})
const emit = defineEmits(['copy-failed'])

const inviteLink = computed(() => `${window.location.origin}/join/${props.inviteCode}`)
/** 剛複製的是哪一個：'code' / 'link' */
const copied = ref('')

async function copyToClipboard (text, sourceKey) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = sourceKey
    setTimeout(() => { copied.value = '' }, 1600)
  } catch {
    emit('copy-failed')
  }
}
</script>

<template>
  <div class="sticky" style="width: 330px; padding: 22px; transform: rotate(-1.3deg)">
    <div style="font-size: 18px; font-weight: 700">邀請新成員</div>

    <div style="margin-top: 16px; font-size: 12px; color: #6b6355">邀請碼</div>
    <div style="margin-top: 6px; display: flex; align-items: center; gap: 10px">
      <div class="num" style="font-size: 30px; letter-spacing: 0.18em">{{ inviteCode }}</div>
      <button
        class="btn btn--sm"
        style="margin-left: auto; border: none; background: rgba(46, 42, 59, 0.12); font-weight: 700"
        @click="copyToClipboard(inviteCode, 'code')"
      >
        {{ copied === 'code' ? '已複製' : '複製' }}
      </button>
    </div>

    <div style="margin-top: 18px; font-size: 12px; color: #6b6355">邀請連結</div>
    <div style="margin-top: 6px; font-size: 13px; word-break: break-all; color: #4a443c">{{ inviteLink }}</div>
    <button class="btn btn--primary btn--sm" style="margin-top: 12px; width: 100%" @click="copyToClipboard(inviteLink, 'link')">
      {{ copied === 'link' ? '已複製連結' : '複製連結' }}
    </button>
  </div>
</template>
