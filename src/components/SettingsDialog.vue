<script setup lang="ts">
/**
 * 大人設定（長按頂列齒輪 1 秒才會打開，避免小朋友誤觸）：
 * - 開放題目：跟著學校進度，點一個注音 = 開放到這一題（含）為止
 * - 彩色電子紙模式：飽和配色、關閉動畫
 * - 筆刷音效：塗色時的沙沙聲（預設關閉）
 * - 休息提醒：累計玩 10／15 分鐘提醒休息，或關閉
 * - 全部重置：清除所有題目的進度（按兩次才執行），設定保留
 * - 素材出處：CC BY 4.0 要求標示來源
 */
import { computed, ref, watch } from 'vue'
import type { ZhuyinWorksheet } from '../types/worksheet'
import { CREDITS } from '../data/credits'
import { BREAK_MINUTES_OPTIONS } from '../core/playTimer'
import AppIcon from './AppIcon.vue'
import ZhuyinGlyph from './ZhuyinGlyph.vue'

const props = defineProps<{
  open: boolean
  worksheets: readonly ZhuyinWorksheet[]
  unlockedUntilId: string
  brushSound: boolean
  epaper: boolean
  breakMinutes: number
}>()
const emit = defineEmits<{
  (e: 'set-unlocked', id: string): void
  (e: 'set-brush-sound', on: boolean): void
  (e: 'set-epaper', on: boolean): void
  (e: 'reset-all'): void
  (e: 'set-break-minutes', minutes: number): void
  (e: 'close'): void
}>()

/** 全部重置要按兩次：第一次只顯示確認 */
const confirmingReset = ref(false)
watch(
  () => props.open,
  () => (confirmingReset.value = false),
)
function confirmReset(): void {
  confirmingReset.value = false
  emit('reset-all')
}

const unlockedIndex = computed(() => props.worksheets.findIndex((w) => w.id === props.unlockedUntilId))
const summary = computed(() => {
  const first = props.worksheets[0]
  const last = props.worksheets[unlockedIndex.value]
  if (!first || !last) return ''
  const range = first === last ? first.targetSymbol : `${first.targetSymbol}～${last.targetSymbol}`
  return `目前開放：${range}，共 ${unlockedIndex.value + 1} 題（題庫共 ${props.worksheets.length} 題）`
})
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="settings-layer" @pointerdown.self="emit('close')">
      <div class="settings-card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header class="head">
          <h3 id="settings-title">大人設定</h3>
          <button type="button" class="close-btn" aria-label="關閉" title="關閉" @click="emit('close')">
            <AppIcon name="close" :size="22" />
          </button>
        </header>

        <section>
          <h4>開放題目</h4>
          <p class="hint">跟著學校進度：點一個注音，就會開放到這一題為止。</p>
          <div class="chips" role="radiogroup" aria-label="開放到哪一題">
            <button
              v-for="(ws, i) in worksheets"
              :key="ws.id"
              type="button"
              role="radio"
              class="chip"
              :class="{ open: i <= unlockedIndex, last: i === unlockedIndex }"
              :aria-checked="i === unlockedIndex"
              :aria-label="`開放到 ${ws.targetSymbol}`"
              @click="emit('set-unlocked', ws.id)"
            >
              <ZhuyinGlyph :symbol="ws.targetSymbol" :size="26" />
            </button>
          </div>
          <p class="summary" role="status">{{ summary }}</p>
        </section>

        <section>
          <h4>顯示</h4>
          <button
            type="button"
            role="switch"
            class="switch-row"
            :aria-checked="epaper"
            @click="emit('set-epaper', !epaper)"
          >
            <AppIcon name="epaper" :size="26" />
            <span class="switch-label">
              <span>彩色電子紙模式</span>
            </span>
            <span class="switch" :class="{ on: epaper }" aria-hidden="true"><span class="knob" /></span>
          </button>
        </section>

        <section>
          <h4>音效</h4>
          <button
            type="button"
            role="switch"
            class="switch-row"
            :aria-checked="brushSound"
            @click="emit('set-brush-sound', !brushSound)"
          >
            <AppIcon :name="brushSound ? 'brush-sound' : 'brush-sound-off'" :size="26" />
            <span class="switch-label">
              <span>筆刷音效</span>
            </span>
            <span class="switch" :class="{ on: brushSound }" aria-hidden="true"><span class="knob" /></span>
          </button>
        </section>

        <section>
          <h4>休息提醒</h4>
          <div class="segmented" role="radiogroup" aria-label="休息提醒">
            <button
              v-for="m in BREAK_MINUTES_OPTIONS"
              :key="m"
              type="button"
              role="radio"
              class="seg"
              :class="{ on: breakMinutes === m }"
              :aria-checked="breakMinutes === m"
              @click="emit('set-break-minutes', m)"
            >
              {{ m === 0 ? '關閉' : m === 1 ? '試用 1 分鐘' : `每 ${m} 分鐘` }}
            </button>
          </div>
        </section>

        <section>
          <h4>重置</h4>
          <template v-if="!confirmingReset">
            <p class="hint">清除所有題目找到的注音和塗色。上面的設定會保留。</p>
            <button type="button" class="btn danger" @click="confirmingReset = true">
              <AppIcon name="restart" :size="22" />
              <span>全部重置</span>
            </button>
          </template>
          <div v-else class="reset-confirm" role="alert">
            <p><strong>確定要清除全部 {{ worksheets.length }} 題的進度嗎？</strong><br />清除後無法復原。</p>
            <div class="reset-buttons">
              <button type="button" class="btn" @click="confirmingReset = false">
                <AppIcon name="prev" :size="22" />
                <span>先不要</span>
              </button>
              <button type="button" class="btn danger" @click="confirmReset">
                <AppIcon name="trash" :size="22" />
                <span>確定清除</span>
              </button>
            </div>
          </div>
        </section>

        <section>
          <h4>素材出處</h4>
          <ul>
            <li v-for="c in CREDITS" :key="c.what">
              <!-- 寫在同一行，避免中文之間多出空格 -->
              <strong>{{ c.what }}</strong>：{{ c.author }}<a :href="c.url" target="_blank" rel="noopener">{{ c.source }}</a>，以 <a :href="c.licenseUrl" target="_blank" rel="noopener">{{ c.license }}</a> 授權
            </li>
          </ul>
        </section>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.settings-layer {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgba(40, 30, 10, 0.25);
}
.settings-card {
  width: min(92vw, 460px);
  max-height: 100%;
  overflow-y: auto;
  padding: 20px;
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 24px;
  box-shadow: 0 3px 0 var(--ink);
}
.head {
  position: sticky;
  top: -20px;
  z-index: 1;
  margin: -20px -20px 0;
  padding: 16px 20px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
h3 {
  margin: 0;
  font-size: 22px;
}
/* 右上角 X：44px 觸控面積 */
.close-btn {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--ink);
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 50%;
  box-shadow: 0 2px 0 var(--ink);
}
section {
  padding: 8px 0;
  border-top: 2px dashed #d8d2c6;
}
h4 {
  margin: 0 0 2px;
  font-size: 18px;
}
.hint,
.summary {
  margin: 0 0 8px;
  font-size: 15px;
  color: #6b6357;
}
.summary {
  margin: 8px 0 0;
  font-weight: 700;
  color: var(--ink);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 12px;
  border: 2px dashed #b9b2a5;
  background: #f3f1ec;
  color: #9a9286;
  opacity: 0.7;
}
.chip.open {
  border: 3px solid var(--ink);
  background: #fff;
  color: var(--ink);
  opacity: 1;
}
.chip.last {
  background: var(--accent-soft);
  box-shadow: 0 3px 0 var(--ink);
}
.switch-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 4px;
  font: inherit;
  color: var(--ink);
  text-align: left;
  background: none;
  border: none;
}
.switch-label {
  flex: 1;
  font-size: 17px;
  font-weight: 700;
}
.switch {
  flex: 0 0 auto;
  position: relative;
  width: 56px;
  height: 32px;
  border: 3px solid var(--ink);
  border-radius: 999px;
  background: #e9e5dc;
}
.switch.on {
  background: var(--accent-soft);
}
.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--ink);
  transition: transform 0.15s ease;
}
.switch.on .knob {
  transform: translateX(24px);
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 15px;
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
  margin-top: 4px;
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
.segmented {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.seg {
  min-height: 44px;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  background: #fff;
  border: 3px solid var(--ink);
  border-radius: 14px;
}
.seg.on {
  background: var(--accent-soft);
  box-shadow: 0 3px 0 var(--ink);
}
.btn.danger {
  background: #ffd6df;
}
.reset-confirm p {
  margin: 0 0 10px;
  font-size: 15px;
  line-height: 1.5;
}
.reset-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.reset-buttons .btn {
  margin-top: 0;
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
