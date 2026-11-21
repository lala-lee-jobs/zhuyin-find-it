<script setup lang="ts">
/** 清除塗色／重新開始本題前的確認（避免幼兒誤觸），給陪伴的大人看 */
import AppIcon from './AppIcon.vue'

defineProps<{ open: boolean; title: string; detail: string; confirmLabel: string }>()
const emit = defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="confirm-layer" @pointerdown.self="emit('cancel')">
      <div class="confirm-card" role="alertdialog" :aria-label="title">
        <h3>{{ title }}</h3>
        <p>{{ detail }}</p>
        <div class="buttons">
          <button type="button" class="btn" @click="emit('cancel')">
            <AppIcon name="prev" :size="22" />
            <span>先不要</span>
          </button>
          <button type="button" class="btn danger" @click="emit('confirm')">
            <AppIcon name="trash" :size="22" />
            <span>{{ confirmLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.confirm-layer {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(40, 30, 10, 0.25);
}
.confirm-card {
  width: min(86vw, 340px);
  padding: 20px;
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 24px;
  box-shadow: 0 3px 0 var(--ink);
  text-align: center;
}
h3 {
  margin: 0 0 6px;
  font-size: 22px;
}
p {
  margin: 0 0 16px;
  color: #6b6357;
}
.buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.btn {
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
.btn.danger {
  background: #ffd6df;
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
