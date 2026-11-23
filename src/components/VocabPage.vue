<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { VocabWord } from '../data/vocabWords'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  open: boolean
  symbol: string
  words: VocabWord[]
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const index = ref(0)

watch(
  () => props.open,
  (open) => {
    if (open) index.value = 0
  },
)

const current = computed(() => props.words[index.value])
const isFirst = computed(() => index.value === 0)
const isLast = computed(() => index.value === props.words.length - 1)

function prev(): void {
  if (!isFirst.value) index.value--
}
function next(): void {
  if (!isLast.value) index.value++
}
</script>

<template>
  <Transition name="vocab-fade">
    <div v-if="open" class="vocab-page" role="dialog" aria-modal="true" :aria-label="`${symbol} 的相關詞語`">
      <!-- 關閉 -->
      <button type="button" class="close-btn" aria-label="關閉" @click="emit('close')">
        <AppIcon name="close" :size="28" />
      </button>

      <!-- 標題 -->
      <div class="page-title">{{ symbol }} 的詞語</div>

      <!-- 卡片 -->
      <div class="card-area">
        <button
          type="button"
          class="nav-btn nav-prev"
          :class="{ hidden: isFirst }"
          aria-label="上一個"
          @click="prev"
        >
          <AppIcon name="prev" :size="32" />
        </button>

        <Transition :name="'slide'" mode="out-in">
          <div :key="index" class="card">
            <img :src="current.illustration" class="illustration" alt="" draggable="false" />
            <div class="word">{{ current.word }}</div>
          </div>
        </Transition>

        <button
          type="button"
          class="nav-btn nav-next"
          :class="{ hidden: isLast }"
          aria-label="下一個"
          @click="next"
        >
          <AppIcon name="next" :size="32" />
        </button>
      </div>

      <!-- 點點 -->
      <div class="dots" aria-hidden="true">
        <span
          v-for="(_, i) in words"
          :key="i"
          class="dot"
          :class="{ active: i === index }"
        />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.vocab-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--paper-bg, #fff);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  gap: 12px;
}

.close-btn {
  align-self: flex-end;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid var(--ink);
  background: #fff;
  color: var(--ink);
  box-shadow: 0 3px 0 var(--ink);
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.close-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--ink);
}

.page-title {
  font-size: clamp(22px, 5vw, 32px);
  font-weight: 900;
  color: var(--ink);
}

.card-area {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 480px;
}

.card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.illustration {
  width: min(60vw, 60vh, 280px);
  height: min(60vw, 60vh, 280px);
  border: 4px solid var(--ink);
  border-radius: 24px;
  box-shadow: 0 6px 0 var(--ink);
  background: #fff;
  object-fit: contain;
  display: block;
}

.word {
  font-size: clamp(40px, 10vw, 64px);
  font-weight: 900;
  color: var(--ink);
  letter-spacing: 0.08em;
}

.nav-btn {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid var(--ink);
  background: #fff;
  color: var(--ink);
  box-shadow: 0 3px 0 var(--ink);
  display: grid;
  place-items: center;
  transition: opacity 0.15s;
}
.nav-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--ink);
}
.nav-btn.hidden {
  opacity: 0;
  pointer-events: none;
}

.dots {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
  padding-bottom: 8px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2.5px solid var(--ink);
  background: transparent;
  transition: background 0.2s;
}
.dot.active {
  background: var(--ink);
}

/* 頁面進場 */
.vocab-fade-enter-active,
.vocab-fade-leave-active {
  transition: opacity 0.2s ease;
}
.vocab-fade-enter-from,
.vocab-fade-leave-to {
  opacity: 0;
}

/* 卡片換頁 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
