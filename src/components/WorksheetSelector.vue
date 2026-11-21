<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ZhuyinWorksheet } from '../types/worksheet'
import AppIcon from './AppIcon.vue'
import ZhuyinGlyph from './ZhuyinGlyph.vue'

const props = defineProps<{
  worksheets: readonly ZhuyinWorksheet[]
  currentId: string
  completedIds: readonly string[]
  hasPrev: boolean
  hasNext: boolean
}>()
const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'prev'): void
  (e: 'next'): void
}>()

// ───────── 目前題目不在可視範圍時，自動捲到看得見 ─────────
const chips = ref<HTMLDivElement | null>(null)
const EDGE_PAD = 8

function prefersInstant(): boolean {
  if (typeof document === 'undefined') return true
  // 電子紙模式、系統設定「減少動態效果」：直接跳過去，不做捲動動畫
  if (document.documentElement.dataset.display === 'epaper') return true
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ensureCurrentVisible(smooth: boolean): void {
  const box = chips.value
  if (!box) return
  const el = box.querySelector<HTMLElement>(`[data-id="${CSS.escape(props.currentId)}"]`)
  if (!el) return
  const c = box.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  let delta = 0
  if (r.left < c.left + EDGE_PAD) delta = r.left - c.left - EDGE_PAD
  else if (r.right > c.right - EDGE_PAD) delta = r.right - c.right + EDGE_PAD
  if (delta === 0) return
  const behavior = smooth && !prefersInstant() ? 'smooth' : 'auto'
  box.scrollBy({ left: delta, behavior })
}

// 換題（上一題／下一題／完成後下一個注音）、開放題目改變：捲過去
watch(
  () => [props.currentId, props.worksheets.length] as const,
  () => nextTick(() => ensureCurrentVisible(true)),
)

// 第一次顯示、螢幕旋轉或寬度改變：直接跳過去
let observer: ResizeObserver | null = null
onMounted(() => {
  ensureCurrentVisible(false)
  if (typeof ResizeObserver !== 'undefined' && chips.value) {
    observer = new ResizeObserver(() => ensureCurrentVisible(false))
    observer.observe(chips.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="selector">
    <button type="button" class="nav" :disabled="!hasPrev" aria-label="上一題" @click="emit('prev')">
      <AppIcon name="prev" />
    </button>
    <div ref="chips" class="chips" role="tablist" aria-label="選擇注音">
      <button
        v-for="ws in worksheets"
        :key="ws.id"
        :data-id="ws.id"
        type="button"
        role="tab"
        class="chip"
        :class="{ active: ws.id === currentId, done: completedIds.includes(ws.id) }"
        :aria-selected="ws.id === currentId"
        :aria-label="`${ws.title}${completedIds.includes(ws.id) ? '（已完成）' : ''}`"
        @click="emit('select', ws.id)"
      >
        <ZhuyinGlyph :symbol="ws.targetSymbol" :size="28" />
        <AppIcon v-if="completedIds.includes(ws.id)" name="star" :size="14" class="badge" />
      </button>
    </div>
    <button type="button" class="nav" :disabled="!hasNext" aria-label="下一題" @click="emit('next')">
      <AppIcon name="next" />
    </button>
  </div>
</template>

<style scoped>
.selector {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 4px 2px 6px;
  min-width: 0;
}
.chips::-webkit-scrollbar {
  display: none;
}
.chip,
.nav {
  position: relative;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0;
  border-radius: 14px;
  border: 3px solid var(--ink);
  background: #fff;
  color: var(--ink);
  box-shadow: 0 3px 0 var(--ink);
}
.nav {
  border-radius: 50%;
}
.nav:disabled {
  opacity: 0.3;
  box-shadow: none;
}
.chip.active {
  background: var(--accent-soft);
  transform: translateY(-2px);
}
.chip:active,
.nav:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--ink);
}
.badge {
  position: absolute;
  top: -7px;
  right: -7px;
  color: var(--accent);
  stroke: var(--ink);
  stroke-width: 2;
}
</style>
