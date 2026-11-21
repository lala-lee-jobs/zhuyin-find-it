/**
 * 點擊圓圈後的互動狀態機（與 Vue 無關，可單獨測試）。
 *
 * idle → pronouncing → feedback → closing → idle
 *
 * 規則：
 * - 先顯示注音並播放發音，發音結束（或失敗／逾時）後才判斷正誤。
 * - 非 idle 狀態一律忽略新的點擊 → 不會有重疊 Popup、不會重複播放。
 * - 每次流程有 generation 編號與 AbortController；cancel() 之後舊流程的回呼不會再更新畫面。
 * - 任何音訊失敗都只會讓流程「繼續往下走」，不會卡住。
 */
import type { AnswerKind, InteractionState } from '../types/worksheet'
import type { FeedbackKind } from '../data/zhuyinAudioMap'
import type { PlayOutcome } from '../services/AudioService'

export interface InteractionAudio {
  playSymbol(symbol: string, signal: AbortSignal): Promise<PlayOutcome>
  playFeedback(kind: FeedbackKind, signal: AbortSignal): Promise<PlayOutcome>
  stop(): void
}

export interface InteractionTimings {
  /** Popup 至少顯示注音多久才判斷（音檔缺少時也讓孩子看清楚符號） */
  minPronounceMs: number
  /** 回饋顯示多久後自動關閉 */
  feedbackHoldMs: number
  /** 已找到的圓圈：重播發音後停留多久 */
  alreadyHoldMs: number
  /** 關閉動畫 */
  closingMs: number
  /** 單一段音訊的逾時保護 */
  stepTimeoutMs: number
}

export const DEFAULT_TIMINGS: InteractionTimings = {
  minPronounceMs: 700,
  feedbackHoldMs: 900,
  alreadyHoldMs: 700,
  closingMs: 260,
  stepTimeoutMs: 6000,
}

export interface PopupState {
  circleId: string
  symbol: string
  phase: InteractionState
  result: AnswerKind | null
  /** 注音音檔是否缺少（Popup 顯示提示，不假裝播放成功） */
  symbolAudioMissing: boolean
}

export interface CircleInteractionOptions {
  audio: InteractionAudio
  /** 在「發音結束後」才呼叫，取得當下的判斷結果 */
  evaluate: (circleId: string) => AnswerKind
  /** 答對時呼叫：寫入進度，回傳是否剛好全部完成 */
  onCorrect: (circleId: string) => { completed: boolean }
  /** 狀態或 Popup 改變 */
  onChange: (popup: PopupState | null, phase: InteractionState) => void
  /** 全部找到且 Popup 已關閉 */
  onRecognitionComplete?: () => void
  timings?: Partial<InteractionTimings>
}

export interface TapTarget {
  id: string
  symbol: string
}

export class CircleInteractionController {
  private phase: InteractionState = 'idle'
  private popup: PopupState | null = null
  private generation = 0
  private abortController: AbortController | null = null
  private pendingCompletion = false
  private disposed = false
  private readonly timings: InteractionTimings

  constructor(private readonly options: CircleInteractionOptions) {
    this.timings = { ...DEFAULT_TIMINGS, ...options.timings }
  }

  get state(): InteractionState {
    return this.phase
  }

  get currentPopup(): PopupState | null {
    return this.popup ? { ...this.popup } : null
  }

  get isBusy(): boolean {
    return this.phase !== 'idle'
  }

  /**
   * 處理點擊。回傳 false 表示被忽略（流程進行中）。
   * 注意：此函式會「同步」呼叫 audio.playSymbol，讓 iOS 視為使用者手勢內的播放。
   */
  async tap(target: TapTarget): Promise<boolean> {
    if (this.disposed || this.phase !== 'idle') return false

    const gen = ++this.generation
    const ac = new AbortController()
    this.abortController = ac
    this.pendingCompletion = false
    this.popup = {
      circleId: target.id,
      symbol: target.symbol,
      phase: 'pronouncing',
      result: null,
      symbolAudioMissing: false,
    }
    this.setPhase('pronouncing')

    const startedAt = Date.now()
    const outcome = await this.safePlay(() => this.options.audio.playSymbol(target.symbol, ac.signal), ac.signal)
    if (this.isStale(gen)) return true
    if (outcome === 'missing' || outcome === 'error') {
      this.updatePopup({ symbolAudioMissing: true })
    }

    const remaining = this.timings.minPronounceMs - (Date.now() - startedAt)
    if (remaining > 0) await this.wait(remaining, ac.signal)
    if (this.isStale(gen)) return true

    // ── 發音結束：此時才判斷正誤 ──
    const result = this.options.evaluate(target.id)
    if (result === 'correct') {
      const { completed } = this.options.onCorrect(target.id)
      this.pendingCompletion = completed
    }
    // 結果與 feedback 狀態同一次更新，畫面不會在「發音中」狀態下閃現結果
    if (this.popup) this.popup = { ...this.popup, result }
    this.setPhase('feedback')

    if (result === 'already') {
      await this.wait(this.timings.alreadyHoldMs, ac.signal)
    } else {
      await this.safePlay(
        () => this.options.audio.playFeedback(result === 'correct' ? 'found' : 'try-again', ac.signal),
        ac.signal,
      )
      if (this.isStale(gen)) return true
      await this.wait(this.timings.feedbackHoldMs, ac.signal)
    }
    if (this.isStale(gen)) return true

    this.setPhase('closing')
    await this.wait(this.timings.closingMs, ac.signal)
    if (this.isStale(gen)) return true

    this.finish()
    return true
  }

  /**
   * 使用者按下關閉（右上角 X 或點畫面任何地方）。
   * - 發音階段關閉：停止發音，但仍然判斷正誤並計分（不播回饋語音），直接收起。
   * - 回饋階段關閉：結果已記錄，直接收起。
   * 兩種情況若剛好完成全部，都會觸發完成獎勵。
   */
  close(): void {
    if (this.phase === 'idle') return
    const wasPronouncing = this.phase === 'pronouncing'
    const circleId = this.popup?.circleId
    this.invalidate()
    if (wasPronouncing && circleId) {
      this.pendingCompletion = false
      if (this.options.evaluate(circleId) === 'correct') {
        this.pendingCompletion = this.options.onCorrect(circleId).completed
      }
    }
    this.finish()
  }

  /** 切換題目／重新開始／元件卸載：中止流程且不觸發完成 */
  cancel(): void {
    this.invalidate()
    this.pendingCompletion = false
    if (this.phase !== 'idle' || this.popup) {
      this.popup = null
      this.setPhase('idle')
    }
  }

  dispose(): void {
    this.cancel()
    this.disposed = true
  }

  // ───────── private ─────────

  private finish(): void {
    const completed = this.pendingCompletion
    this.pendingCompletion = false
    this.abortController = null
    this.popup = null
    this.setPhase('idle')
    if (completed) this.options.onRecognitionComplete?.()
  }

  private invalidate(): void {
    this.generation++
    this.abortController?.abort()
    this.abortController = null
    try {
      this.options.audio.stop()
    } catch {
      /* ignore */
    }
  }

  private isStale(gen: number): boolean {
    return this.disposed || gen !== this.generation
  }

  private setPhase(phase: InteractionState): void {
    this.phase = phase
    if (this.popup) this.popup = { ...this.popup, phase }
    this.options.onChange(this.popup ? { ...this.popup } : null, phase)
  }

  private updatePopup(patch: Partial<PopupState>): void {
    if (!this.popup) return
    this.popup = { ...this.popup, ...patch }
    this.options.onChange({ ...this.popup }, this.phase)
  }

  /** 播放並加上逾時保護；任何例外都轉成結果值 */
  private async safePlay(play: () => Promise<PlayOutcome>, signal: AbortSignal): Promise<PlayOutcome> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const timeout = new Promise<PlayOutcome>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), this.timings.stepTimeoutMs)
      })
      const aborted = new Promise<PlayOutcome>((resolve) => {
        if (signal.aborted) resolve('aborted')
        else signal.addEventListener('abort', () => resolve('aborted'), { once: true })
      })
      let playing: Promise<PlayOutcome>
      try {
        playing = play().catch(() => 'error' as const)
      } catch {
        playing = Promise.resolve('error' as const)
      }
      return await Promise.race([playing, timeout, aborted])
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  private wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (signal.aborted || ms <= 0) {
        resolve()
        return
      }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      }, ms)
      const onAbort = () => {
        clearTimeout(timer)
        resolve()
      }
      signal.addEventListener('abort', onAbort, { once: true })
    })
  }
}
