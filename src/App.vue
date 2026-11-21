<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
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
import AppIcon from './components/AppIcon.vue'

const ws = useWorksheetState()
const audio = useAudio(ws.muted)

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
  width: `${Math.round(800 * fit.scale.value)}px`,
  height: `${Math.round(1100 * fit.scale.value)}px`,
}))

// ───────── 圓圈 ─────────
function onCircleTap(circle: ZhuyinCircle): void {
  audio.stopSpeaker()
  void interaction.tap({ id: circle.id, symbol: circle.symbol })
}

const activeFillColor = computed(() => {
  const id = interaction.activeCircleId.value
  return ws.worksheet.value.circles.find((c) => c.id === id)?.fillColor
})

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

// 換題時把焦點留在學習單，避免螢幕閱讀器停在舊按鈕
watch(ws.currentId, () => stage.value?.focus({ preventScroll: true }))
</script>

<template>
  <div class="app" :class="{ landscape: fit.landscape.value, compact: fit.compact.value }">
    <header class="topbar">
      <WorksheetSelector
        :worksheets="ws.worksheets"
        :current-id="ws.currentId.value"
        :completed-ids="ws.completedIds.value"
        :has-prev="ws.hasPrev.value"
        :has-next="ws.hasNext.value"
        @select="selectWorksheet"
        @prev="goPrev"
        @next="goNext()"
      />
      <button
        type="button"
        class="mute-btn"
        :aria-pressed="ws.muted.value"
        :aria-label="ws.muted.value ? '打開聲音' : '靜音'"
        @click="toggleMute"
      >
        <AppIcon :name="ws.muted.value ? 'speaker-off' : 'speaker'" />
      </button>
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
          :locked="interaction.isBusy.value || showCompletion"
          @circle-tap="onCircleTap"
          @stroke-commit="onStrokeCommit"
        />
        <WorksheetHeader
          :symbol="ws.worksheet.value.targetSymbol"
          :playing="audio.speakerPlaying.value"
          :muted="ws.muted.value"
          :hint="speakerHint"
          @speak="onSpeak"
        />
        <ProgressIndicator
          :found="ws.progress.value.foundCircleIds.length"
          :total="ws.progress.value.totalCorrectCircles"
          :symbol="ws.worksheet.value.targetSymbol"
          :scale="fit.scale.value"
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
      @continue="onContinueColoring"
      @replay="onReplay"
      @next="goNext(true)"
    />
    <ConfirmDialog
      :open="confirmKind !== null"
      :title="confirmText.title"
      :detail="confirmText.detail"
      :confirm-label="confirmText.confirm"
      @confirm="onConfirm"
      @cancel="confirmKind = null"
    />
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
.mute-btn {
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
.stage {
  grid-area: stage;
  min-height: 0;
  display: grid;
  place-items: center;
  outline: none;
}
.sheet {
  position: relative;
  background: #fff;
  border-radius: 6px;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.08),
    0 10px 28px rgba(80, 60, 20, 0.16);
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
