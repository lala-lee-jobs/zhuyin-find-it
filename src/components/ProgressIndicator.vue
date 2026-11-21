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
const done = computed(() => props.total > 0 && props.found >= props.total)
</script>

<template>
  <div class="progress" :class="{ done }" :style="style" role="status" aria-live="polite">
    <div class="stars" aria-hidden="true">
      <AppIcon
        v-for="i in total"
        :key="i"
        name="star"
        class="star"
        :class="{ on: i <= found }"
        :size="Math.max(10, 36 * scale)"
      />
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
  color: #ffc43d;
  transform: scale(1.08);
}
.text {
  font-size: 0.8em;
  line-height: 1.1;
}
.done .text {
  color: #c27a00;
}
</style>
