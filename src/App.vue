<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import type { DrawingStroke, ZhuyinCircle } from './types/worksheet'
import { useWorksheetState } from './composables/useWorksheetState'
import { useAudio } from './composables/useAudio'
import { useCircleInteraction } from './composables/useCircleInteraction'
import { useStageFit } from './composables/useStageFit'
import WorksheetCanvas from './components/WorksheetCanvas.vue'
import WorksheetHeader from './components/WorksheetHeader.vue'
import ProgressIndicator from './components/ProgressIndicator.vue'
import DrawingToolbar from './components/DrawingToolbar.vue'
import WorksheetSelector from './components/WorksheetSelector.vue'
import AnswerPopup from './components/AnswerPopup.vue'
import CompletionPopup from './components/CompletionPopup.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import BreakPopup from './components/BreakPopup.vue'
import { useBreakReminder } from './composables/useBreakReminder'
import AppIcon from './components/AppIcon.vue'
import PwaBanner from './components/PwaBanner.vue'
import VocabPage from './components/VocabPage.vue'
import ListenGamePage from './components/ListenGamePage.vue'
import { displayColor } from './core/palette'
import { VOCAB_WORDS } from './data/vocabWords'

const ws = useWorksheetState()
const audio = useAudio(ws.muted, ws.brushSound)

// ───────── 聽音遊戲 ─────────
const showListenGame = ref(false)
const listenSymbols = computed(() => ws.available.value.map((w) => w.targetSymbol))

// ───────── 相關詞語 ─────────
const showVocab = ref(false)
const currentVocabWords = computed(() => VOCAB_WORDS[ws.worksheet.value.targetSymbol] ?? [])
const hasVocab = computed(() => currentVocabWords.value.length > 0)

const showCompletion = ref(false)

const interaction = useCircleInteraction({
  audio: audio.service,
  evaluate: (id) => ws.evaluate(id),
  onCorrect: (id) => ws.markFound(id),
  onRecognitionComplete: () => {
    showCompletion.value = true
    void audio.playCompletion()
  },
})

// ───────── 版面 ─────────
const stage = ref<HTMLElement | null>(null)
const fit = useStageFit(stage)

const sheetStyle = computed(() => ({
  width: `${Math.round(fit.layout.value.width * fit.scale.value)}px`,
  height: `${Math.round(fit.layout.value.height * fit.scale.value)}px`,
}))

// ───────── 圓圈 ─────────
function onCircleTap(circle: ZhuyinCircle): void {
  audio.stopSpeaker()
  void interaction.tap({ id: circle.id, symbol: circle.symbol })
}

const activeFillColor = computed(() => {
  const id = interaction.activeCircleId.value
  const color = ws.worksheet.value.circles.find((c) => c.id === id)?.fillColor
  return color && displayColor(color, ws.epaper.value)
})

// ───────── 護眼休息提醒 ─────────
// 累計遊玩（畫面看得到的時間）到設定的分鐘數就提醒；休息畫面要按「我休息好了！」才會關閉
const breakReminder = useBreakReminder(ws.breakMinutes)
watch(breakReminder.showing, (showing) => {
  if (!showing) return
  // 1. 暫停答題與塗色（休息畫面也會蓋住整個畫面） 2. 存好進度 3. 播放休息語音
  resetTransientUi()
  showSettings.value = false
  confirmKind.value = null
  audio.brush.stop(true)
  ws.saveNow()
  void audio.playBreak()
})
function onBreakDone(): void {
  audio.service.stop()
  breakReminder.finishBreak()
}

// ───────── 標題喇叭 ─────────
const speakerHint = ref<string | null>(null)
let hintTimer: ReturnType<typeof setTimeout> | null = null
function showHint(text: string): void {
  speakerHint.value = text
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = setTimeout(() => (speakerHint.value = null), 2400)
}
async function onSpeak(): Promise<void> {
  if (interaction.isBusy.value) return
  if (ws.muted.value) {
    showHint('目前是靜音，按右上角喇叭可以打開聲音')
    return
  }
  const symbol = ws.worksheet.value.targetSymbol
  const outcome = await audio.playTarget(symbol)
  if (outcome === 'missing' || outcome === 'error') showHint(`尚未加入「${symbol}」的發音音檔`)
  else if (outcome === 'blocked') showHint('請再按一次喇叭')
}
onBeforeUnmount(() => {
  if (hintTimer) clearTimeout(hintTimer)
})

// ───────── 題目切換 ─────────
function resetTransientUi(): void {
  interaction.cancel()
  audio.stopSpeaker()
  showCompletion.value = false
  speakerHint.value = null
}
function selectWorksheet(id: string): void {
  resetTransientUi()
  ws.selectWorksheet(id)
}
function goPrev(): void {
  resetTransientUi()
  ws.goPrev()
}
function goNext(wrap = false): void {
  resetTransientUi()
  ws.goNext(wrap)
}

// ───────── 完成 ─────────
function onContinueColoring(): void {
  showCompletion.value = false
}
function onReplay(): void {
  showCompletion.value = false
  ws.replayRecognition() // 只重設找注音，塗色保留
}

// ───────── 塗色 ─────────
function onStrokeCommit(stroke: DrawingStroke): void {
  ws.addStroke(stroke)
}

type ConfirmKind = 'clear' | 'restart' | null
const confirmKind = ref<ConfirmKind>(null)
const confirmText = computed(() =>
  confirmKind.value === 'restart'
    ? { title: '重新開始本題？', detail: '會清除這一題找到的注音和中間的塗色。', confirm: '重新開始' }
    : { title: '清除塗色？', detail: '只會擦掉中間大注音的顏色，找到的注音會保留。', confirm: '清除' },
)
function onConfirm(): void {
  if (confirmKind.value === 'clear') ws.clearDrawing()
  if (confirmKind.value === 'restart') {
    resetTransientUi()
    ws.restartWorksheet()
  }
  confirmKind.value = null
}

function toggleMute(): void {
  ws.setMuted(!ws.muted.value)
}

// ───────── 彩色電子紙模式 ─────────
// 掛在 <html> 上，讓全域 CSS 換成飽和配色並關閉動畫（電子紙更新慢，動畫會留殘影）
watchEffect(() => {
  if (typeof document === 'undefined') return
  if (ws.epaper.value) document.documentElement.dataset.display = 'epaper'
  else delete document.documentElement.dataset.display
})
// ───────── 大人設定（長按 1 秒才打開，避免小朋友誤觸） ─────────
const SETTINGS_HOLD_MS = 1000
const showSettings = ref(false)
const settingsHolding = ref(false)
const settingsHint = ref(false)
let holdTimer: ReturnType<typeof setTimeout> | null = null
let settingsHintTimer: ReturnType<typeof setTimeout> | null = null

function onSettingsDown(e: PointerEvent): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  cancelSettingsHold()
  settingsHolding.value = true
  holdTimer = setTimeout(() => {
    holdTimer = null
    settingsHolding.value = false
    settingsHint.value = false
    showSettings.value = true
  }, SETTINGS_HOLD_MS)
}
/** 放開：還沒按滿 1 秒就提示「大人請按住」 */
function onSettingsUp(): void {
  if (!holdTimer) return
  cancelSettingsHold()
  settingsHint.value = true
  if (settingsHintTimer) clearTimeout(settingsHintTimer)
  settingsHintTimer = setTimeout(() => (settingsHint.value = false), 2200)
}
function cancelSettingsHold(): void {
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = null
  settingsHolding.value = false
}
/** 鍵盤（Enter／空白鍵）直接打開；小朋友通常不會用鍵盤 */
function onSettingsClick(e: MouseEvent): void {
  if (e.detail === 0) showSettings.value = true
}
onBeforeUnmount(() => {
  cancelSettingsHold()
  if (settingsHintTimer) clearTimeout(settingsHintTimer)
})

function onResetAll(): void {
  resetTransientUi()
  ws.resetAllProgress()
  showSettings.value = false
}

function onSetUnlocked(id: string): void {
  resetTransientUi()
  ws.setUnlockedUntil(id)
}

// 換題時把焦點留在學習單，避免螢幕閱讀器停在舊按鈕
watch(ws.currentId, () => stage.value?.focus({ preventScroll: true }))
</script>

<template>
  <div class="app" :class="{ landscape: fit.landscape.value, compact: fit.compact.value }">
    <header class="topbar">
      <WorksheetSelector
        :worksheets="ws.available.value"
        :current-id="ws.currentId.value"
        :completed-ids="ws.completedIds.value"
        :has-prev="ws.hasPrev.value"
        :has-next="ws.hasNext.value"
        @select="selectWorksheet"
        @prev="goPrev"
        @next="goNext()"
      />
      <div class="top-actions">
        <button
          type="button"
          class="round-btn"
          :class="{ active: showListenGame }"
          aria-label="聽音找注音模式"
          @click="showListenGame = true"
        >
          <AppIcon name="headphones" />
        </button>
        <div class="settings-wrap">
          <button
            type="button"
            class="round-btn settings-btn"
            :class="{ holding: settingsHolding }"
            aria-label="大人設定（請按住 1 秒）"
            title="大人設定：請按住 1 秒"
            @pointerdown="onSettingsDown"
            @pointerup="onSettingsUp"
            @pointerleave="cancelSettingsHold"
            @pointercancel="cancelSettingsHold"
            @click="onSettingsClick"
            @contextmenu.prevent
          >
            <AppIcon name="settings" />
          </button>
          <div v-if="settingsHint" class="settings-hint" role="status">大人設定：請按住 1 秒</div>
        </div>
        <button
          type="button"
          class="round-btn"
          :aria-pressed="ws.muted.value"
          :aria-label="ws.muted.value ? '打開聲音' : '靜音'"
          @click="toggleMute"
        >
          <AppIcon :name="ws.muted.value ? 'speaker-off' : 'speaker'" />
        </button>
      </div>
    </header>

    <main ref="stage" class="stage" tabindex="-1">
      <div v-if="fit.scale.value > 0" class="sheet" :style="sheetStyle">
        <WorksheetCanvas
          :worksheet="ws.worksheet.value"
          :found-ids="ws.progress.value.foundCircleIds"
          :strokes="ws.progress.value.drawingStrokes"
          :brush="ws.brush"
          :scale="fit.scale.value"
          :dpr="fit.dpr.value"
          :active-circle-id="interaction.activeCircleId.value"
          :locked="interaction.isBusy.value || showCompletion || breakReminder.showing.value"
          :epaper="ws.epaper.value"
          :layout="fit.layout.value"
          @circle-tap="onCircleTap"
          @stroke-commit="onStrokeCommit"
          @stroke-start="(tool) => audio.brush.start(tool)"
          @stroke-move="(distance) => audio.brush.move(distance)"
          @stroke-end="audio.brush.stop()"
        />
        <WorksheetHeader
          :symbol="ws.worksheet.value.targetSymbol"
          :playing="audio.speakerPlaying.value"
          :muted="ws.muted.value"
          :hint="speakerHint"
          :layout="fit.layout.value"
          :has-vocab="hasVocab"
          @speak="onSpeak"
          @vocab="showVocab = true"
        />
        <ProgressIndicator
          :found="ws.progress.value.foundCircleIds.length"
          :total="ws.progress.value.totalCorrectCircles"
          :symbol="ws.worksheet.value.targetSymbol"
          :scale="fit.scale.value"
          :layout="fit.layout.value"
        />
      </div>
    </main>

    <aside class="tools">
      <DrawingToolbar
        :brush="ws.brush"
        :can-undo="ws.progress.value.drawingStrokes.length > 0"
        :can-clear="ws.progress.value.drawingStrokes.length > 0"
        :vertical="fit.landscape.value"
        :collapsible="fit.compact.value"
        :epaper="ws.epaper.value"
        @update:brush="ws.setBrush"
        @undo="ws.undoStroke"
        @clear="confirmKind = 'clear'"
        @restart="confirmKind = 'restart'"
      />
    </aside>

    <AnswerPopup :popup="interaction.popup.value" :fill-color="activeFillColor" @close="interaction.close" />
    <CompletionPopup
      :open="showCompletion"
      :symbol="ws.worksheet.value.targetSymbol"
      :epaper="ws.epaper.value"
      @continue="onContinueColoring"
      @replay="onReplay"
      @next="goNext(true)"
    />
    <BreakPopup
      :open="breakReminder.showing.value"
      :muted="ws.muted.value"
      @replay="audio.playBreak()"
      @done="onBreakDone"
    />
    <SettingsDialog
      :open="showSettings"
      :worksheets="ws.worksheets"
      :unlocked-until-id="ws.unlockedUntilId.value"
      :brush-sound="ws.brushSound.value"
      :epaper="ws.epaper.value"
      :break-minutes="ws.breakMinutes.value"
      @set-unlocked="onSetUnlocked"
      @set-break-minutes="ws.setBreakMinutes"
      @set-epaper="ws.setEpaper"
      @reset-all="onResetAll"
      @set-brush-sound="ws.setBrushSound"
      @close="showSettings = false"
    />
    <ConfirmDialog
      :open="confirmKind !== null"
      :title="confirmText.title"
      :detail="confirmText.detail"
      :confirm-label="confirmText.confirm"
      @confirm="onConfirm"
      @cancel="confirmKind = null"
    />
    <VocabPage
      :open="showVocab"
      :symbol="ws.worksheet.value.targetSymbol"
      :words="currentVocabWords"
      @close="showVocab = false"
    />
    <ListenGamePage
      v-if="showListenGame"
      :symbols="listenSymbols"
      :audio="audio.service"
      :muted="ws.muted.value"
      :epaper="ws.epaper.value"
      @close="showListenGame = false"
    />
    <PwaBanner />
  </div>
</template>

<style scoped>
.app {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'top'
    'stage'
    'tools';
  gap: 8px;
  padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right))
    max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
}
.app.landscape {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas:
    'top top'
    'stage tools';
}
.topbar {
  grid-area: top;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}
.top-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}
.round-btn {
  flex: 0 0 auto;
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 3px solid var(--ink);
  background: #fff;
  color: var(--ink);
  box-shadow: 0 3px 0 var(--ink);
}
.round-btn.active {
  background: var(--accent-soft, #fff3bf);
}
.settings-wrap {
  position: relative;
}
.settings-btn {
  position: relative;
  overflow: hidden;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
/* 按住時由下往上填滿，1 秒填滿就打開 */
.settings-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent-soft);
  transform: scaleY(0);
  transform-origin: bottom;
}
.settings-btn.holding::before {
  transform: scaleY(1);
  transition: transform 1s linear;
}
.settings-btn > * {
  position: relative;
}
.settings-hint {
  position: absolute;
  z-index: 30;
  top: calc(100% + 8px);
  right: 0;
  width: max-content;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 700;
  background: #fff;
  border: 2px solid var(--ink);
  border-radius: 14px;
}
.stage {
  grid-area: stage;
  min-height: 0;
  display: grid;
  place-items: center;
  outline: none;
}
/* 滿版：白紙與頁面背景同色，不加陰影與圓角 */
.sheet {
  position: relative;
  background: #fff;
}
.tools {
  grid-area: tools;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
}
.tools > .toolbar {
  margin: auto; /* 置中，但內容過長時仍可捲動到頂端 */
}
</style>
