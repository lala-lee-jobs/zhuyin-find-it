<script setup lang="ts">
/** 「關於」視窗：素材出處與授權（CC BY 4.0 要求標示來源），給陪伴的大人看 */
import { CREDITS } from '../data/credits'
import AppIcon from './AppIcon.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="credits-layer" @pointerdown.self="emit('close')">
      <div class="credits-card" role="dialog" aria-modal="true" aria-labelledby="credits-title">
        <h3 id="credits-title">素材出處</h3>
        <ul>
          <li v-for="c in CREDITS" :key="c.what">
            <!-- 寫在同一行，避免中文之間多出空格 -->
            <strong>{{ c.what }}</strong>：{{ c.author }}<a :href="c.url" target="_blank" rel="noopener">{{ c.source }}</a>，以 <a :href="c.licenseUrl" target="_blank" rel="noopener">{{ c.license }}</a> 授權
          </li>
        </ul>
        <button type="button" class="btn" @click="emit('close')">
          <AppIcon name="close" :size="22" />
          <span>關閉</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.credits-layer {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(40, 30, 10, 0.25);
}
.credits-card {
  width: min(88vw, 400px);
  padding: 20px;
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 24px;
  box-shadow: 0 3px 0 var(--ink);
}
h3 {
  margin: 0 0 10px;
  font-size: 22px;
  text-align: center;
}
ul {
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
  font-size: 16px;
  line-height: 1.6;
}
a {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.btn {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: inherit;
  font-weight: 800;
  font-size: 17px;
  color: var(--ink);
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 16px;
  box-shadow: 0 3px 0 var(--ink);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
