<script setup lang="ts">
/**
 * 護眼休息提醒：喝水、上廁所、抱抱的插畫＋溫柔的語音。
 * - 不倒數、不自動消失，要按「我休息好了！」才會關閉。
 * - 蓋住整個畫面，休息時不能塗色、不能答題；進度在打開前已經存好。
 */
import { FEEDBACK_TEXT } from '../data/zhuyinAudioMap'
import { assetUrl } from '../utils/assetUrl'
import AppIcon from './AppIcon.vue'

defineProps<{ open: boolean; muted: boolean }>()
const emit = defineEmits<{ (e: 'done'): void; (e: 'replay'): void }>()

const ITEMS = [
  { img: 'illustrations/break-water.svg', label: '喝水' },
  { img: 'illustrations/break-toilet.svg', label: '上廁所' },
  { img: 'illustrations/break-hug.svg', label: '抱抱爸爸媽媽' },
] as const
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="break-layer" @pointerdown.stop>
      <div class="break-card" role="dialog" aria-modal="true" aria-labelledby="break-title">
        <h2 id="break-title">休息一下 <span aria-hidden="true">🥰</span></h2>
        <p class="message">{{ FEEDBACK_TEXT.break }}</p>

        <ul class="items">
          <li v-for="item in ITEMS" :key="item.label">
            <img :src="assetUrl(item.img)" alt="" draggable="false" />
            <span>{{ item.label }}</span>
          </li>
        </ul>

        <div class="actions">
          <button v-if="!muted" type="button" class="replay" aria-label="再聽一次" title="再聽一次" @click="emit('replay')">
            <AppIcon name="speaker" :size="26" />
          </button>
          <button type="button" class="done" @click="emit('done')">我休息好了！</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.break-layer {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(255, 250, 235, 0.92);
  touch-action: none;
}
.break-card {
  width: min(94vw, 560px);
  max-height: 100%;
  overflow-y: auto;
  padding: 24px 20px 20px;
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 28px;
  box-shadow: 0 4px 0 var(--ink);
  text-align: center;
}
h2 {
  margin: 0 0 6px;
  font-size: clamp(26px, 6vw, 34px);
}
.message {
  margin: 0 0 14px;
  font-size: clamp(17px, 4.2vw, 21px);
  font-weight: 700;
  line-height: 1.5;
}
.items {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
}
.items li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: clamp(14px, 3.6vw, 17px);
  font-weight: 800;
}
.items img {
  width: 100%;
  max-width: 130px;
  aspect-ratio: 1;
}
.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.replay {
  flex: 0 0 auto;
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 3px solid var(--ink);
  background: #fff;
  color: var(--ink);
  box-shadow: 0 3px 0 var(--ink);
}
.done {
  flex: 1;
  max-width: 340px;
  min-height: 60px;
  font: inherit;
  font-size: clamp(20px, 5vw, 24px);
  font-weight: 900;
  color: var(--ink);
  background: var(--accent-soft);
  border: 3px solid var(--ink);
  border-radius: 20px;
  box-shadow: 0 3px 0 var(--ink);
}
.done:active,
.replay:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--ink);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
