<script setup lang="ts">
/**
 * 聽音模式：一個注音全部找到後，提示小朋友「我們來找下一個注音吧！」。
 * 不自動消失，按「找下一個！」才換題（並在按下時播出下一個注音的發音）。
 */
import { FEEDBACK_TEXT } from '../data/zhuyinAudioMap'
import AppIcon from './AppIcon.vue'

defineProps<{ open: boolean; remaining: number; muted: boolean }>()
const emit = defineEmits<{ (e: 'next'): void; (e: 'replay'): void }>()
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="next-layer" @pointerdown.stop>
      <div class="next-card" role="dialog" aria-modal="true" aria-labelledby="next-title">
        <div class="stars" aria-hidden="true">
          <AppIcon name="star" :size="30" class="st st1" />
          <AppIcon name="star" :size="44" class="st st2" />
          <AppIcon name="star" :size="30" class="st st3" />
        </div>
        <h2 id="next-title">{{ FEEDBACK_TEXT.next }}</h2>
        <p class="remaining">還有 {{ remaining }} 個注音要找</p>
        <div class="actions">
          <button
            v-if="!muted"
            type="button"
            class="replay"
            aria-label="再聽一次"
            title="再聽一次"
            @click="emit('replay')"
          >
            <AppIcon name="speaker" :size="26" />
          </button>
          <button type="button" class="action" @click="emit('next')">
            <span>找下一個！</span>
            <AppIcon name="next" :size="30" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.next-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(255, 252, 240, 0.6);
  touch-action: none;
}
.next-card {
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
h2 {
  margin: 14px 0 6px;
  font-size: 28px;
  font-weight: 900;
}
.remaining {
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: 700;
  opacity: 0.6;
}
.actions {
  display: flex;
  gap: 10px;
}
.action,
.replay {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 62px;
  font: inherit;
  font-size: 23px;
  font-weight: 900;
  color: var(--ink);
  background: var(--accent-soft);
  border: 3px solid var(--ink);
  border-radius: 20px;
  box-shadow: 0 3px 0 var(--ink);
}
.action {
  flex: 1;
  animation: nudge 1.4s ease-in-out 0.6s infinite;
}
.replay {
  flex: 0 0 62px;
  background: #fff;
}
.action:active,
.replay:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--ink);
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
@keyframes nudge {
  50% {
    transform: scale(1.04);
  }
}
@media (prefers-reduced-motion: reduce) {
  .st,
  .next-card,
  .action {
    animation: none;
  }
}
</style>
