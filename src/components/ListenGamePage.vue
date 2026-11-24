<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { BrushSettings, ZhuyinCircle } from '../types/worksheet'
import type { InteractionAudio } from '../core/CircleInteractionController'
import AppIcon from './AppIcon.vue'
import WorksheetCanvas from './WorksheetCanvas.vue'
import ProgressIndicator from './ProgressIndicator.vue'
import AnswerPopup from './AnswerPopup.vue'
import CompletionPopup from './CompletionPopup.vue'
import NextRoundPopup from './NextRoundPopup.vue'
import { useListenGame } from '../composables/useListenGame'
import { useCircleInteraction } from '../composables/useCircleInteraction'
import { useStageFit } from '../composables/useStageFit'
import { ZHUYIN_AUDIO } from '../data/zhuyinAudioMap'
import { assetUrl } from '../utils/assetUrl'
import { displayColor } from '../core/palette'

const props = defineProps<{
  symbols: readonly string[]
  audio: InteractionAudio
  muted: boolean
  epaper: boolean
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const stage = ref<HTMLElement | null>(null)
const fit = useStageFit(stage)

const game = useListenGame(props.symbols, fit.layout)

const sheetStyle = computed(() => ({
  width: `${Math.round(fit.layout.value.width * fit.scale.value)}px`,
  height: `${Math.round(fit.layout.value.height * fit.scale.value)}px`,
}))

// "?" 覆蓋在中央注音格子上
const questionStyle = computed(() => {
  const { width: W, height: H, glyphBox } = fit.layout.value
  return {
    left: `${(glyphBox.x / W) * 100}%`,
    top: `${(glyphBox.y / H) * 100}%`,
    width: `${(glyphBox.size / W) * 100}%`,
    height: `${(glyphBox.size / H) * 100}%`,
  }
})

const questionFontSize = computed(() => `${Math.round(fit.scale.value * 90)}px`)

// ── 符號音檔播放 ──
const playing = ref(false)
let activeAudio: HTMLAudioElement | null = null

function stopAudio(): void {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.onended = null
    activeAudio.onerror = null
    activeAudio = null
  }
  playing.value = false
}

function playSymbol(symbol: string): void {
  if (props.muted || !symbol) return
  stopAudio()
  const path = ZHUYIN_AUDIO[symbol]
  if (!path) return
  const a = new Audio(assetUrl(path))
  activeAudio = a
  playing.value = true
  a.onended = () => { playing.value = false; activeAudio = null }
  a.onerror = () => { playing.value = false; activeAudio = null }
  void a.play().catch(() => { playing.value = false; activeAudio = null })
}

// 符號換了就自動播
watch(() => game.currentSymbol.value, (symbol) => {
  if (symbol) playSymbol(symbol)
})

// ── 圓圈互動 ──
const showCompletion = ref(false)
/** 一個注音找完、還有下一個：先提示，按「找下一個！」才換題 */
const showNext = ref(false)
let nextVoice: AbortController | null = null

function playNextVoice(): void {
  stopNextVoice()
  stopAudio()
  nextVoice = new AbortController()
  void props.audio.playFeedback('next', nextVoice.signal)
}

function stopNextVoice(): void {
  nextVoice?.abort()
  nextVoice = null
  props.audio.stop()
}

/** 還沒完成的注音數（不含剛找完的這個） */
const remainingSymbols = computed(() => {
  const symbols = new Set(game.board.value.circles.map((c) => c.symbol))
  return [...symbols].filter((s) => s !== game.currentSymbol.value && !game.completedSymbols.value.includes(s)).length
})

const interaction = useCircleInteraction({
  audio: props.audio,
  evaluate: (id) => game.evaluate(id),
  onCorrect: (id) => game.markFound(id),
  onRecognitionComplete: () => {
    if (remainingSymbols.value === 0) {
      game.advanceToNextSymbol()
      showCompletion.value = true
      return
    }
    showNext.value = true
    playNextVoice()
  },
})

const activeFillColor = computed(() => {
  const id = interaction.activeCircleId.value
  const color = game.board.value.circles.find((c) => c.id === id)?.fillColor
  return color ? displayColor(color, props.epaper) : undefined
})

function onCircleTap(circle: ZhuyinCircle): void {
  void interaction.tap({ id: circle.id, symbol: circle.symbol })
}

function onNext(): void {
  stopNextVoice()
  showNext.value = false
  game.advanceToNextSymbol() // 換題時 watch 會自動播下一個注音
}

function onReplay(): void {
  stopNextVoice()
  showNext.value = false
  showCompletion.value = false
  interaction.cancel()
  game.start()
}

function onClose(): void {
  stopNextVoice()
  stopAudio()
  interaction.cancel()
  emit('close')
}

const LISTEN_BRUSH: BrushSettings = { tool: 'brush', color: '#ff6b6b', width: 20 }

onMounted(() => {
  game.start()
})
</script>

<template>
  <div class="listen-page">
    <header class="topbar">
      <div class="page-title">聽音找注音</div>
      <button type="button" class="round-btn" aria-label="關閉聽音模式" @click="onClose">
        <AppIcon name="close" />
      </button>
    </header>

    <main ref="stage" class="stage">
      <div v-if="fit.scale.value > 0" class="sheet" :style="sheetStyle">
        <WorksheetCanvas
          :worksheet="game.worksheet.value"
          :found-ids="game.foundCircleIds.value"
          :strokes="[]"
          :brush="LISTEN_BRUSH"
          :scale="fit.scale.value"
          :dpr="fit.dpr.value"
          :active-circle-id="interaction.activeCircleId.value"
          :locked="interaction.isBusy.value || showCompletion || showNext"
          :epaper="epaper"
          :layout="fit.layout.value"
          :hide-glyph="true"
          @circle-tap="onCircleTap"
        />
        <!-- "?" 蓋住中央注音，小朋友點擊可重播發音 -->
        <button
          type="button"
          class="question-btn"
          :class="{ playing }"
          :style="questionStyle"
          :aria-label="`聽發音，再點一次：${game.currentSymbol.value}`"
          @click="playSymbol(game.currentSymbol.value)"
        >
          <span class="question-mark" :style="{ fontSize: questionFontSize }">?</span>
          <span class="question-hint">點我聽發音</span>
          <span v-if="playing" class="ripple" aria-hidden="true" />
        </button>
        <ProgressIndicator
          :found="game.roundFound.value"
          :total="game.roundTotal.value"
          :symbol="game.currentSymbol.value"
          :scale="fit.scale.value"
          :layout="fit.layout.value"
        />
      </div>
    </main>

    <AnswerPopup
      :popup="interaction.popup.value"
      :fill-color="activeFillColor"
      @close="interaction.close()"
    />
    <NextRoundPopup
      :open="showNext"
      :remaining="remainingSymbols"
      :muted="muted"
      @next="onNext"
      @replay="playNextVoice"
    />
    <CompletionPopup
      :open="showCompletion"
      symbol=""
      :epaper="epaper"
      replay-only
      @replay="onReplay"
    />
  </div>
</template>

<style scoped>
.listen-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--paper-bg, #fff);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 8px;
  padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right))
    max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
  animation: listen-in 0.2s ease-out;
}

@keyframes listen-in {
  from { opacity: 0; transform: translateY(6px); }
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.page-title {
  font-size: clamp(20px, 5vw, 28px);
  font-weight: 900;
  color: var(--ink);
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
.round-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--ink);
}

.stage {
  min-height: 0;
  display: grid;
  place-items: center;
  outline: none;
}

.sheet {
  position: relative;
  background: #fff;
}

/* 蓋住中央注音格子 */
.question-btn {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: #fff;
  border: 4px solid var(--ink);
  border-radius: 20px;
  box-shadow: 0 6px 0 var(--ink);
  color: var(--ink);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}
.question-btn:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 var(--ink);
}
.question-btn.playing {
  background: var(--accent-soft, #fff3bf);
  animation: q-pulse 0.7s ease-in-out infinite;
}

.question-mark {
  font-weight: 900;
  line-height: 1;
  font-family: inherit;
}

.question-hint {
  font-size: 0.55em;
  font-weight: 700;
  opacity: 0.55;
  line-height: 1;
}

.ripple {
  position: absolute;
  inset: -6px;
  border-radius: 24px;
  border: 3px solid var(--accent, #ffb74d);
  animation: q-ripple 1s ease-out infinite;
  pointer-events: none;
}

@keyframes q-pulse {
  50% { transform: scale(1.03); }
}
@keyframes q-ripple {
  from { opacity: 1; transform: scale(0.95); }
  to   { opacity: 0; transform: scale(1.1); }
}
</style>
