<script setup>
import { onMounted, onUnmounted } from 'vue'

defineProps({
  title: { type: String, default: '' },
  width: { type: String, default: '470px' }
})
const emit = defineEmits(['close'])

const closeOnEscape = (event) => {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', closeOnEscape))
onUnmounted(() => window.removeEventListener('keydown', closeOnEscape))
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="sheet" :style="{ maxWidth: width }" role="dialog" aria-modal="true">
      <div class="sheet__head">
        <slot name="head">
          <h3>{{ title }}</h3>
        </slot>
        <button class="sheet__close" aria-label="關閉" @click="emit('close')">✕</button>
      </div>
      <slot />
      <div v-if="$slots.foot" class="sheet__foot">
        <slot name="foot" />
      </div>
    </div>
  </div>
</template>
