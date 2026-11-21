<script setup lang="ts">
/** 學習單標題區右半部的進度：星星（給還不識字的孩子）＋短文字（給陪伴的大人） */
import { computed } from 'vue'
import { PROGRESS_BAND, WORKSHEET_HEIGHT, WORKSHEET_WIDTH } from '../canvas/layout'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ found: number; total: number; symbol: string; scale: number }>()

const style = computed(() => ({
  left: `${(PROGRESS_BAND.x / WORKSHEET_WIDTH) * 100}%`,
  top: `${(PROGRESS_BAND.y / WORKSHEET_HEIGHT) * 100}%`,
  width: `${(PROGRESS_BAND.w / WORKSHEET_WIDTH) * 100}%`,
  height: `${(PROGRESS_BAND.h / WORKSHEET_HEIGHT) * 100}%`,
  fontSize: `${Math.max(10, 28 * props.scale)}px`,
}))
/** 星星分兩排：上排 ⌈total / 2⌉ 顆、下排其餘 */
const starRows = computed(() => {
  const all = Array.from({ length: props.total }, (_, i) => i + 1)
  const top = Math.ceil(all.length / 2)
  return [all.slice(0, top), all.slice(top)].filter((row) => row.length > 0)
})
/** 星星大小：最多 32，一排星星多時縮小，讓整排塞得進進度區（星星間距約 0.12 倍） */
const starSize = computed(() => {
  const perRow = Math.max(1, starRows.value[0]?.length ?? 1)
  const fit = PROGRESS_BAND.w / perRow / 1.14
  return Math.max(9, Math.min(32, fit) * props.scale)
})
const done = computed(() => props.total > 0 && props.found >= props.total)
</script>

<template>
  <div class="progress" :class="{ done }" :style="style" role="status" aria-live="polite">
    <div class="stars" aria-hidden="true">
      <div v-for="(row, r) in starRows" :key="r" class="star-row">
        <AppIcon
          v-for="i in row"
          :key="i"
          name="star"
          class="star"
          :class="{ on: i <= found }"
          :size="starSize"
        />
      </div>
    </div>
    <div class="text">
      <template v-if="done">全部找到了！</template>
      <template v-else>已找到 {{ found }} / {{ total }} 個 {{ symbol }}</template>
    </div>
  </div>
</template>

<style scoped>
.progress {
  position: absolute;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15em;
  pointer-events: none;
  font-weight: 800;
  color: var(--ink);
}
.stars {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.08em;
}
.star-row {
  display: flex;
  gap: 0.12em;
}
.star {
  color: #fff;
  stroke: var(--ink);
  transition:
    color 0.3s ease,
    transform 0.3s ease;
}
.star.on {
  color: var(--accent);
  transform: scale(1.08);
}
.text {
  font-size: 1.1em;
  line-height: 1.1;
  white-space: nowrap;
}
.done .text {
  color: var(--accent-deep);
}
</style>
