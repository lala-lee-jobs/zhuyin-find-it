<script setup lang="ts">
/** 學習單標題區右半部的進度：星星（給還不識字的孩子）＋短文字（給陪伴的大人） */
import { computed } from 'vue'
import type { SheetLayout } from '../canvas/layout'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ found: number; total: number; symbol: string; scale: number; layout: SheetLayout }>()

const done = computed(() => props.total > 0 && props.found >= props.total)

/** 星星間距與字的行高（相對大小） */
const STAR_GAP = 0.12
const LINE = 1.2

/**
 * 星星：小版（手機）排 2 排，其他版面排 1 排。
 * 星星與「已找到」文字的大小都以版面（邏輯座標）算好，再乘上畫面縮放倍率，
 * 所以會跟著螢幕大小一起縮放，並且永遠塞得進進度區。
 */
const starRows = computed(() => {
  const all = Array.from({ length: props.total }, (_, i) => i + 1)
  if (props.layout.progress.starRows === 1) return [all]
  const top = Math.ceil(all.length / 2)
  return [all.slice(0, top), all.slice(top)].filter((row) => row.length > 0)
})

/** 「已找到」文字字級（邏輯單位）：最大 fontSize，太長時縮小到放得下 */
const textSize = computed(() => {
  const b = props.layout.progress
  const text = done.value ? '全部找到了！' : `已找到 ${props.found} / ${props.total} 個 ${props.symbol}`
  // 估算寬度（em）：中文、注音 1，數字 0.6，空白與符號 0.35
  let em = 0
  for (const ch of text) em += /[\u3100-\u312f\u4e00-\u9fff\uff01]/.test(ch) ? 1 : /\d/.test(ch) ? 0.6 : 0.35
  return Math.min(b.fontSize, (b.w * 0.96) / em)
})

/** 星星大小（邏輯單位）：一排要塞得進寬度，所有排加上文字要塞得進高度，最大 52 */
const starSize = computed(() => {
  const b = props.layout.progress
  const rows = starRows.value.length || 1
  const perRow = Math.max(1, starRows.value[0]?.length ?? 1)
  const byWidth = b.w / (perRow + (perRow - 1) * STAR_GAP)
  const byHeight = (b.h - textSize.value * LINE - 4) / (rows + (rows - 1) * STAR_GAP)
  return Math.min(52, byWidth, byHeight)
})

const style = computed(() => {
  const { width: W, height: H, progress: b } = props.layout
  return {
    left: `${(b.x / W) * 100}%`,
    top: `${(b.y / H) * 100}%`,
    width: `${(b.w / W) * 100}%`,
    height: `${(b.h / H) * 100}%`,
    fontSize: `${Math.max(9, textSize.value * props.scale)}px`,
    '--star-gap': `${starSize.value * STAR_GAP * props.scale}px`,
  }
})
const starPx = computed(() => Math.max(8, starSize.value * props.scale))
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
          :size="starPx"
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
  gap: 2px;
  pointer-events: none;
  font-weight: 800;
  color: var(--ink);
}
.stars {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--star-gap);
}
.star-row {
  display: flex;
  gap: var(--star-gap);
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
  line-height: 1.2;
  white-space: nowrap;
}
.done .text {
  color: var(--accent-deep);
}
</style>
