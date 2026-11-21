<script setup lang="ts">
/**
 * 標題區的 HTML overlay：喇叭按鈕（標題文字與雲朵由 Canvas 繪製）。
 * 位置用學習單邏輯座標的百分比，跟著學習單一起縮放。
 */
import { computed } from 'vue'
import type { SheetLayout } from '../canvas/layout'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  symbol: string
  playing: boolean
  muted: boolean
  hint: string | null
  layout: SheetLayout
}>()
const emit = defineEmits<{ (e: 'speak'): void }>()

const style = computed(() => {
  const { width: W, height: H } = props.layout
  const s = props.layout.header.speaker
  return {
    left: `${((s.x - s.size / 2) / W) * 100}%`,
    top: `${((s.y - s.size / 2) / H) * 100}%`,
    width: `${(s.size / W) * 100}%`,
    height: `${(s.size / H) * 100}%`,
  }
})
const label = computed(() => (props.muted ? `已靜音，${props.symbol} 的發音` : `聽 ${props.symbol} 的發音`))
</script>

<template>
  <button
    type="button"
    class="speaker-btn"
    :class="{ playing, muted }"
    :style="style"
    :aria-label="label"
    @click="emit('speak')"
  >
    <AppIcon :name="muted ? 'speaker-off' : 'speaker'" :size="40" class="icon" />
    <span v-if="playing" class="ripple" aria-hidden="true" />
  </button>
  <Transition name="hint">
    <div v-if="hint" class="speaker-hint" role="status" :style="{ left: style.left, top: style.top }">{{ hint }}</div>
  </Transition>
</template>

<style scoped>
.speaker-btn {
  position: absolute;
  z-index: 5;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 50%;
  border: 3px solid var(--ink);
  background: #fff;
  color: var(--ink);
  box-shadow: 0 3px 0 var(--ink);
  touch-action: manipulation;
}
.speaker-btn .icon {
  width: 62%;
  height: 62%;
}
.speaker-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--ink);
}
.speaker-btn.playing {
  background: var(--accent-soft);
  animation: speaker-pulse 0.7s ease-in-out infinite;
}
.speaker-btn.muted {
  color: #9a9286;
}
.ripple {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 3px solid var(--accent);
  animation: ripple 1s ease-out infinite;
}
.speaker-hint {
  position: absolute;
  z-index: 6;
  transform: translate(-60%, 115%);
  width: max-content;
  max-width: 220px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 700;
  background: #fff;
  border: 2px solid var(--ink);
  border-radius: 14px;
}
.hint-enter-active,
.hint-leave-active {
  transition: opacity 0.2s ease;
}
.hint-enter-from,
.hint-leave-to {
  opacity: 0;
}
@keyframes speaker-pulse {
  50% {
    transform: scale(1.07);
  }
}
@keyframes ripple {
  from {
    opacity: 1;
    transform: scale(0.9);
  }
  to {
    opacity: 0;
    transform: scale(1.35);
  }
}
</style>
