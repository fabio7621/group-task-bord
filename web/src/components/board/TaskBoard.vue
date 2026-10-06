<script setup>
import { ref } from 'vue'
import StickyNote from './StickyNote.vue'

const props = defineProps({
  tasks: { type: Array, required: true },
  /** 任務板尺寸 { width, height } */
  size: { type: Object, required: true },
  meId: { type: String, required: true }
})
const emit = defineEmits(['open', 'move'])

// 便利貼尺寸，和 styles.css 的 --note-w / --note-h、server 的 shape.js NOTE 一致
const NOTE = { width: 232, height: 150 }
const MOBILE_MAX_WIDTH = 820

const isMobile = () => window.innerWidth <= MOBILE_MAX_WIDTH
const clamp = (value, max) => Math.min(Math.max(value, 0), max)

/* ---------- 拖曳：只有發布者能移動自己的便利貼，放開後才通知父層儲存（規格 §9） ---------- */
/** 拖曳中的暫時座標 { id, offsetX, offsetY, x, y, moved }，放開前不動到 task 本身 */
const dragging = ref(null)
const canDrag = (task) => task.authorId === props.meId

function positionOf (task) {
  const { x, y } = dragging.value?.id === task.id ? dragging.value : task
  return { left: x + 'px', top: y + 'px' }
}

function startDrag (task, event) {
  if (!canDrag(task) || isMobile() || event.button !== 0) return
  dragging.value = {
    id: task.id,
    offsetX: event.clientX - task.x,
    offsetY: event.clientY - task.y,
    x: task.x,
    y: task.y,
    moved: false
  }
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveDrag (task, event) {
  if (dragging.value?.id !== task.id) return
  const { offsetX, offsetY } = dragging.value
  dragging.value = {
    ...dragging.value,
    x: clamp(event.clientX - offsetX, Math.max(0, props.size.width - NOTE.width)),
    y: clamp(event.clientY - offsetY, Math.max(0, props.size.height - NOTE.height)),
    moved: true
  }
}

function endDrag (task, event) {
  if (dragging.value?.id !== task.id) return
  const { moved, x, y } = dragging.value
  event.currentTarget.releasePointerCapture?.(event.pointerId)
  // 先通知父層更新座標再清掉拖曳狀態，避免便利貼閃回原位
  if (moved) emit('move', task, { x, y })
  else emit('open', task)
  dragging.value = null
}

function onNoteClick (task) {
  // 桌機的點擊由 endDrag 判斷（沒有移動才算點擊），手機直接開詳情
  if (isMobile() || !canDrag(task)) emit('open', task)
}
</script>

<template>
  <div class="board" :style="{ height: size.height + 'px' }">
    <!-- 桌機：依儲存的座標擺放 -->
    <div class="board__inner" :style="{ width: size.width + 'px' }">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="board__note"
        :class="{ 'note--draggable': canDrag(task), 'note--dragging': dragging?.id === task.id }"
        :style="positionOf(task)"
        @pointerdown="startDrag(task, $event)"
        @pointermove="moveDrag(task, $event)"
        @pointerup="endDrag(task, $event)"
        @click="onNoteClick(task)"
      >
        <StickyNote :task="task" :me-id="meId" />
      </div>
    </div>

    <!-- 手機：自動排列成清單，不提供拖曳（規格 §9） -->
    <div class="board__list">
      <div v-for="task in tasks" :key="task.id" @click="emit('open', task)">
        <StickyNote :task="task" :me-id="meId" :tilted="false" />
      </div>
    </div>
  </div>
</template>
