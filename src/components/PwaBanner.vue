<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { offlineReady } = useRegisterSW()

const dismissed = ref(true) // 預設隱藏，等確認 localStorage 後再決定

onMounted(() => {
  try {
    dismissed.value = localStorage.getItem('pwa-banner-dismissed') === '1'
  } catch {
    dismissed.value = false
  }
})

// offlineReady 第一次變成 true 時，若還沒 dismiss 就顯示
watch(offlineReady, (ready) => {
  if (ready) {
    try {
      if (localStorage.getItem('pwa-banner-dismissed') !== '1') dismissed.value = false
    } catch {
      dismissed.value = false
    }
  }
})

function dismiss(): void {
  dismissed.value = true
  try {
    localStorage.setItem('pwa-banner-dismissed', '1')
  } catch {
    // ignore
  }
}
</script>

<template>
  <div v-if="offlineReady && !dismissed" class="pwa-banner" role="status">
    <span class="pwa-icon">📲</span>
    <div class="pwa-text">
      <strong>可以加到主畫面</strong>
      <span>離線也能玩！音效和圖片都已存好囉</span>
    </div>
    <button type="button" class="pwa-close" aria-label="關閉" @click="dismiss">✕</button>
  </div>
</template>

<style scoped>
.pwa-banner {
  position: fixed;
  bottom: max(16px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px 12px 16px;
  background: #fff;
  border: 2.5px solid var(--ink);
  border-radius: 18px;
  box-shadow: 0 4px 0 var(--ink);
  max-width: min(360px, calc(100vw - 32px));
  animation: slide-up 0.3s ease;
}
@keyframes slide-up {
  from { transform: translateX(-50%) translateY(20px); opacity: 0; }
  to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
}
.pwa-icon {
  font-size: 24px;
  flex: 0 0 auto;
}
.pwa-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  line-height: 1.4;
}
.pwa-text strong {
  font-size: 14px;
}
.pwa-close {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--ink);
  background: transparent;
  color: var(--ink);
  font-size: 12px;
  display: grid;
  place-items: center;
  box-shadow: none;
  padding: 0;
}
</style>
