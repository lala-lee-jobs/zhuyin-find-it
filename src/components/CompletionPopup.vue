<script setup lang="ts">
import { computed } from 'vue'
import { FEEDBACK_TEXT } from '../data/zhuyinAudioMap'
import AppIcon from './AppIcon.vue'
import { displayColor } from '../core/palette'
import ZhuyinGlyph from './ZhuyinGlyph.vue'

const props = defineProps<{
  open: boolean
  /** 空字串時不顯示注音（聽音模式） */
  symbol: string
  epaper: boolean
  /** 只顯示「再玩一次」（聽音模式全部找完時使用） */
  replayOnly?: boolean
}>()
const emit = defineEmits<{
  (e: 'continue'): void
  (e: 'replay'): void
  (e: 'next'): void
}>()

const COLORS = ['#FF8FB1', '#FFD23F', '#5EC2FF', '#62D6A4', '#A98BFF', '#FF9F4A']
// 少量、短暫的彩帶（位置固定，避免每次重繪跳動）
const confetti = computed(() =>
  props.open
    ? Array.from({ length: 22 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 7) * 0.08}s`,
        color: displayColor(COLORS[i % COLORS.length], props.epaper),
        rotate: `${(i * 53) % 360}deg`,
      }))
    : [],
)
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="completion-layer" @pointerdown.stop>
      <div v-if="!epaper" class="confetti" aria-hidden="true">
        <span
          v-for="(c, i) in confetti"
          :key="i"
          :style="{ left: c.left, animationDelay: c.delay, background: c.color, '--r': c.rotate }"
        />
      </div>
      <div class="completion-card" role="dialog" aria-live="polite" :aria-label="FEEDBACK_TEXT.completed">
        <div class="stars" aria-hidden="true">
          <AppIcon name="star" :size="30" class="st st1" />
          <AppIcon name="star" :size="44" class="st st2" />
          <AppIcon name="star" :size="30" class="st st3" />
        </div>
        <ZhuyinGlyph v-if="symbol" :symbol="symbol" :size="92" variant="bubble" :fill="displayColor('#FFEB99', epaper)" class="glyph" />
        <h2>{{ FEEDBACK_TEXT.completed }}</h2>
        <div class="actions">
          <button v-if="!replayOnly" type="button" class="action primary" @click="emit('continue')">
            <AppIcon name="brush" :size="30" />
            <span>繼續塗色</span>
          </button>
          <button type="button" class="action" :class="{ primary: replayOnly }" @click="emit('replay')">
            <AppIcon name="replay" :size="30" />
            <span>再玩一次</span>
          </button>
          <button v-if="!replayOnly" type="button" class="action" @click="emit('next')">
            <AppIcon name="next" :size="30" />
            <span>下一個注音</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.completion-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  background: rgba(255, 252, 240, 0.55);
  overflow: hidden;
}
.completion-card {
  position: relative;
  width: min(88vw, 380px);
  padding: 30px 20px 20px;
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 32px;
  box-shadow: 0 14px 40px rgba(40, 30, 10, 0.2), 0 3px 0 var(--ink);
  text-align: center;
  animation: rise 0.45s cubic-bezier(0.3, 1.3, 0.5, 1);
}
.stars {
  position: absolute;
  top: -26px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 8px;
  color: var(--accent);
}
.st {
  animation: twinkle 1.6s ease-in-out infinite;
}
.st2 {
  animation-delay: 0.2s;
}
.st3 {
  animation-delay: 0.4s;
}
.glyph {
  margin: 0 auto;
}
h2 {
  margin: 10px 0 16px;
  font-size: 28px;
  font-weight: 900;
}
.actions {
  display: grid;
  gap: 10px;
}
.action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 58px;
  font: inherit;
  font-size: 21px;
  font-weight: 800;
  color: var(--ink);
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 20px;
  box-shadow: 0 3px 0 var(--ink);
}
.action:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--ink);
}
.action.primary {
  background: var(--accent-soft);
}
.confetti span {
  position: absolute;
  top: -20px;
  width: 10px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid var(--ink);
  animation: fall 1.9s ease-in forwards;
  transform: rotate(var(--r));
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
@keyframes rise {
  from {
    transform: translateY(30px) scale(0.85);
    opacity: 0;
  }
}
@keyframes twinkle {
  50% {
    transform: scale(1.15) rotate(8deg);
  }
}
@keyframes fall {
  to {
    transform: translateY(110vh) rotate(calc(var(--r) + 360deg));
    opacity: 0.2;
  }
}
@media (prefers-reduced-motion: reduce) {
  .confetti {
    display: none;
  }
  .st,
  .completion-card {
    animation: none;
  }
}
</style>
