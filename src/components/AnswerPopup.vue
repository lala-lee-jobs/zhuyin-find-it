<script setup lang="ts">
/**
 * 點擊圓圈後的 Popup（HTML，不畫在 Canvas 裡）。
 * pronouncing：只顯示注音與聲波動畫 → feedback：顯示「找到了！」或「再找找看！」
 */
import { computed } from 'vue'
import type { PopupState } from '../core/CircleInteractionController'
import { FEEDBACK_TEXT } from '../data/zhuyinAudioMap'
import ZhuyinGlyph from './ZhuyinGlyph.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  popup: PopupState | null
  fillColor?: string
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const message = computed(() => {
  const r = props.popup?.result
  if (r === 'correct') return FEEDBACK_TEXT.found
  if (r === 'wrong') return FEEDBACK_TEXT['try-again']
  if (r === 'already') return '這個找到過囉！'
  return ''
})

const glyphFill = computed(() =>
  props.popup?.result === 'correct' || props.popup?.result === 'already' ? (props.fillColor ?? '#FFEB99') : '#ffffff',
)
</script>

<template>
  <Transition name="pop">
    <div v-if="popup" class="answer-layer" @pointerdown.stop>
      <div
        class="answer-card"
        :class="[`phase-${popup.phase}`, popup.result ? `result-${popup.result}` : '']"
        role="dialog"
        aria-live="polite"
        :aria-label="`注音 ${popup.symbol}`"
      >
        <button class="close-btn" type="button" aria-label="關閉" @click="emit('close')">
          <AppIcon name="close" :size="24" />
        </button>

        <span class="deco-star s1" aria-hidden="true"><AppIcon name="star" :size="18" /></span>
        <span class="deco-star s2" aria-hidden="true"><AppIcon name="star" :size="14" /></span>

        <div class="glyph-wrap">
          <ZhuyinGlyph :symbol="popup.symbol" :size="132" variant="bubble" :fill="glyphFill" />
          <div v-if="popup.phase === 'pronouncing' && !popup.symbolAudioMissing" class="sound-waves" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div v-if="popup.result === 'correct'" class="burst" aria-hidden="true">
            <span v-for="i in 8" :key="i" :style="{ '--i': i }"><AppIcon name="star" :size="16" /></span>
          </div>
        </div>

        <p class="message" :class="{ show: !!message }">{{ message || ' ' }}</p>
        <p v-if="popup.symbolAudioMissing" class="audio-note">（尚未加入「{{ popup.symbol }}」的發音音檔）</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.answer-layer {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.12);
  touch-action: none;
}
.answer-card {
  position: relative;
  width: min(76vw, 300px);
  padding: 22px 18px 18px;
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 28px;
  box-shadow: 0 10px 30px rgba(40, 30, 10, 0.18), 0 2px 0 var(--ink);
  text-align: center;
}
.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--ink);
  display: grid;
  place-items: center;
}
.deco-star {
  position: absolute;
  color: var(--accent-bright);
  filter: drop-shadow(0 0 0 var(--ink));
}
.deco-star.s1 {
  top: 14px;
  left: 18px;
}
.deco-star.s2 {
  top: 42px;
  left: 40px;
}
.glyph-wrap {
  position: relative;
  width: 132px;
  height: 132px;
  margin: 6px auto 4px;
}
.phase-pronouncing .glyph-wrap {
  animation: breathe 0.9s ease-in-out infinite;
}
.result-correct .glyph-wrap {
  animation: hop 0.5s ease-out;
}
.result-wrong .glyph-wrap {
  animation: tilt 0.6s ease-in-out;
}
.sound-waves {
  position: absolute;
  right: -26px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
  align-items: center;
}
.sound-waves span {
  width: 6px;
  border-radius: 3px;
  background: var(--ink);
  animation: wave 0.8s ease-in-out infinite;
}
.sound-waves span:nth-child(1) {
  height: 12px;
}
.sound-waves span:nth-child(2) {
  height: 22px;
  animation-delay: 0.15s;
}
.sound-waves span:nth-child(3) {
  height: 14px;
  animation-delay: 0.3s;
}
.burst span {
  position: absolute;
  left: 50%;
  top: 50%;
  color: var(--accent);
  transform: translate(-50%, -50%);
  animation: burst 0.8s ease-out forwards;
  --angle: calc(var(--i) * 45deg);
}
.message {
  margin: 4px 0 0;
  min-height: 1.4em;
  font-size: 30px;
  font-weight: 900;
  color: var(--ink);
  opacity: 0;
  transform: scale(0.8);
  transition:
    opacity 0.2s ease,
    transform 0.25s ease;
}
.message.show {
  opacity: 1;
  transform: scale(1);
}
.audio-note {
  margin: 6px 0 0;
  font-size: 13px;
  color: #8a8172;
}
.phase-closing {
  opacity: 0.4;
  transform: scale(0.94);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.pop-enter-active {
  transition: opacity 0.18s ease;
}
.pop-enter-active .answer-card {
  animation: pop-in 0.28s cubic-bezier(0.3, 1.4, 0.5, 1);
}
.pop-leave-active {
  transition: opacity 0.2s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
}

@keyframes pop-in {
  from {
    transform: scale(0.6);
  }
  to {
    transform: scale(1);
  }
}
@keyframes breathe {
  50% {
    transform: scale(1.05);
  }
}
@keyframes hop {
  40% {
    transform: translateY(-10px) scale(1.06);
  }
}
@keyframes tilt {
  25% {
    transform: rotate(-5deg);
  }
  75% {
    transform: rotate(5deg);
  }
}
@keyframes wave {
  50% {
    transform: scaleY(0.4);
  }
}
@keyframes burst {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(0.4);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-86px) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .glyph-wrap,
  .burst span,
  .sound-waves span {
    animation: none !important;
  }
}
</style>
