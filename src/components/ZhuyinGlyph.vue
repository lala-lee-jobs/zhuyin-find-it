<script setup lang="ts">
/** 以骨架路徑畫注音（與 Canvas 使用同一份資料），沒有骨架時退回文字 */
import { computed } from 'vue'
import { GLYPH_SKELETONS } from '../data/zhuyinGlyphs'

const props = withDefaults(
  defineProps<{
    symbol: string
    size?: number
    variant?: 'solid' | 'bubble'
    /** bubble 樣式的內部填色 */
    fill?: string
  }>(),
  { size: 48, variant: 'solid', fill: '#ffffff' },
)

const paths = computed(() => GLYPH_SKELETONS[props.symbol] ?? null)
</script>

<template>
  <svg
    v-if="paths"
    class="zhuyin-glyph"
    :width="size"
    :height="size"
    viewBox="-6 -6 112 112"
    role="img"
    :aria-label="symbol"
  >
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <template v-if="variant === 'bubble'">
        <path v-for="(d, i) in paths" :key="`o${i}`" :d="d" stroke="#1f1f1f" stroke-width="20" />
        <path v-for="(d, i) in paths" :key="`i${i}`" :d="d" :stroke="fill" stroke-width="15" class="glyph-fill" />
      </template>
      <template v-else>
        <path v-for="(d, i) in paths" :key="`s${i}`" :d="d" stroke="#1f1f1f" stroke-width="11" />
      </template>
    </g>
  </svg>
  <span v-else class="zhuyin-text" :style="{ fontSize: `${size * 0.82}px` }" role="img" :aria-label="symbol">
    {{ symbol }}
  </span>
</template>

<style scoped>
.zhuyin-glyph {
  display: block;
  overflow: visible;
}
.glyph-fill {
  transition: stroke 0.45s ease;
}
.zhuyin-text {
  display: inline-block;
  font-weight: 800;
  line-height: 1;
}
</style>
