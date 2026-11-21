/**
 * AudioService：統一管理注音發音與鼓勵語音。
 *
 * - 注音一律使用真人預錄音檔。音檔不存在時回傳 'missing'，絕不改用 TTS 念聲母。
 * - 鼓勵語句（找到了！／再找找看！）音檔不存在時，才使用 Web Speech API 的中文語音備援；
 *   找不到中文語音就回傳 'unavailable'，畫面仍有文字。
 * - 只使用一個共用的 HTMLAudioElement：第一次在點擊手勢內播放後，iOS Safari 才允許後續自動播放。
 * - 每次播放都有逾時保護與 AbortSignal，不會讓互動流程卡住。
 */
import { FEEDBACK_AUDIO, FEEDBACK_TEXT, ZHUYIN_AUDIO, type FeedbackKind } from '../data/zhuyinAudioMap'
import { assetUrl } from '../utils/assetUrl'

export type PlayOutcome =
  | 'ended' // 音檔正常播完
  | 'spoken' // 語音備援念完
  | 'missing' // 找不到音檔
  | 'error' // 其他播放錯誤
  | 'blocked' // 瀏覽器自動播放限制
  | 'timeout'
  | 'aborted'
  | 'muted'
  | 'unavailable' // 沒有可用的備援語音

/** HTMLAudioElement 的最小介面（方便測試替換） */
export interface AudioElementLike {
  src: string
  currentTime: number
  preload: string
  play(): Promise<void> | void
  pause(): void
  load?(): void
  addEventListener(type: string, listener: () => void): void
  removeEventListener(type: string, listener: () => void): void
}

export interface SpeechFallback {
  speak(text: string, signal: AbortSignal, timeoutMs: number): Promise<PlayOutcome>
  cancel(): void
}

export interface AudioServiceOptions {
  createAudio?: () => AudioElementLike | null
  speech?: SpeechFallback | null
  resolveUrl?: (path: string) => string
  /** 單一音檔逾時（毫秒） */
  timeoutMs?: number
  symbolMap?: Readonly<Record<string, string>>
  feedbackMap?: Readonly<Record<FeedbackKind, readonly string[]>>
  /** 隨機數（測試時可固定） */
  random?: () => number
}

interface CurrentPlayback {
  settle: (outcome: PlayOutcome) => void
}

export class AudioService {
  muted = false

  private element: AudioElementLike | null = null
  private readonly createAudio: () => AudioElementLike | null
  private readonly speech: SpeechFallback | null
  private readonly resolveUrl: (path: string) => string
  private readonly timeoutMs: number
  private readonly symbolMap: Readonly<Record<string, string>>
  private readonly feedbackMap: Readonly<Record<FeedbackKind, readonly string[]>>
  private readonly random: () => number
  /** 每種鼓勵語上一次播的是哪一句，避免連續重複 */
  private readonly lastFeedback = new Map<FeedbackKind, number>()
  private readonly missing = new Set<string>()
  private current: CurrentPlayback | null = null

  constructor(options: AudioServiceOptions = {}) {
    this.createAudio =
      options.createAudio ??
      (() => (typeof Audio !== 'undefined' ? (new Audio() as unknown as AudioElementLike) : null))
    this.speech = options.speech === undefined ? WebSpeechFallback.createIfSupported() : options.speech
    this.resolveUrl = options.resolveUrl ?? assetUrl
    this.timeoutMs = options.timeoutMs ?? 5000
    this.symbolMap = options.symbolMap ?? ZHUYIN_AUDIO
    this.feedbackMap = options.feedbackMap ?? FEEDBACK_AUDIO
    this.random = options.random ?? Math.random
  }

  /** 隨機挑一句鼓勵語；有兩句以上時不會連續兩次挑到同一句 */
  pickFeedback(kind: FeedbackKind): string | null {
    const list = this.feedbackMap[kind] ?? []
    if (list.length === 0) return null
    if (list.length === 1) return list[0]
    const last = this.lastFeedback.get(kind)
    let i = Math.floor(this.random() * list.length) % list.length
    if (i === last) i = (i + 1 + Math.floor(this.random() * (list.length - 1))) % list.length
    this.lastFeedback.set(kind, i)
    return list[i]
  }

  /** 是否已知缺少此注音音檔（嘗試播放過才會知道） */
  isSymbolAudioMissing(symbol: string): boolean {
    const path = this.symbolMap[symbol]
    return !path || this.missing.has(this.resolveUrl(path))
  }

  playSymbol(symbol: string, signal?: AbortSignal): Promise<PlayOutcome> {
    if (this.muted) return Promise.resolve('muted')
    const path = this.symbolMap[symbol]
    if (!path) return Promise.resolve('missing')
    // 只能播音檔：不使用 TTS，避免念錯注音
    return this.playUrl(this.resolveUrl(path), signal)
  }

  async playFeedback(kind: FeedbackKind, signal?: AbortSignal): Promise<PlayOutcome> {
    if (this.muted) return 'muted'
    const path = this.pickFeedback(kind)
    const outcome = path ? await this.playUrl(this.resolveUrl(path), signal) : 'missing'
    if (outcome !== 'missing' && outcome !== 'error') return outcome
    if (signal?.aborted) return 'aborted'
    if (!this.speech) return 'unavailable'
    return this.speech.speak(FEEDBACK_TEXT[kind], signal ?? new AbortController().signal, this.timeoutMs)
  }

  /** 播放音檔。新的播放會中斷舊的（舊的回傳 'aborted'） */
  playUrl(url: string, signal?: AbortSignal): Promise<PlayOutcome> {
    if (this.muted) return Promise.resolve('muted')
    if (this.missing.has(url)) return Promise.resolve('missing')
    if (signal?.aborted) return Promise.resolve('aborted')

    this.interruptCurrent()
    const el = this.getElement()
    if (!el) return Promise.resolve('unavailable')

    return new Promise<PlayOutcome>((resolve) => {
      let done = false
      let timer: ReturnType<typeof setTimeout> | undefined

      const cleanup = () => {
        el.removeEventListener('ended', onEnded)
        el.removeEventListener('error', onError)
        signal?.removeEventListener('abort', onAbort)
        if (timer !== undefined) clearTimeout(timer)
        if (this.current === playback) this.current = null
      }
      const settle = (outcome: PlayOutcome) => {
        if (done) return
        done = true
        cleanup()
        if (outcome === 'missing') this.missing.add(url)
        if (outcome !== 'ended') {
          try {
            el.pause()
          } catch {
            /* ignore */
          }
        }
        resolve(outcome)
      }
      const onEnded = () => settle('ended')
      // 404、或伺服器回傳的不是音訊（例如 SPA fallback 的 index.html）都會觸發 error
      const onError = () => settle('missing')
      const onAbort = () => settle('aborted')
      const playback: CurrentPlayback = { settle }

      this.current = playback
      el.addEventListener('ended', onEnded)
      el.addEventListener('error', onError)
      signal?.addEventListener('abort', onAbort, { once: true } as AddEventListenerOptions)
      timer = setTimeout(() => settle('timeout'), this.timeoutMs)

      try {
        if (el.src !== url) {
          el.src = url
          el.load?.()
        }
        el.currentTime = 0
        const result = el.play()
        if (result && typeof (result as Promise<void>).catch === 'function') {
          ;(result as Promise<void>).catch((err: unknown) => {
            const name = (err as { name?: string } | null)?.name
            if (name === 'NotAllowedError') settle('blocked')
            else if (name === 'NotSupportedError') settle('missing')
            else if (name === 'AbortError') settle('aborted')
            else settle('error')
          })
        }
      } catch {
        settle('error')
      }
    })
  }

  stop(): void {
    this.interruptCurrent()
    try {
      this.element?.pause()
    } catch {
      /* ignore */
    }
    this.speech?.cancel()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.stop()
  }

  private interruptCurrent(): void {
    const cur = this.current
    this.current = null
    cur?.settle('aborted')
  }

  private getElement(): AudioElementLike | null {
    if (!this.element) {
      this.element = this.createAudio()
      if (this.element) this.element.preload = 'auto'
    }
    return this.element
  }
}

/** Web Speech API 備援：只用來念中文鼓勵句，且必須有中文語音 */
export class WebSpeechFallback implements SpeechFallback {
  private constructor(private readonly synth: SpeechSynthesis) {}

  static createIfSupported(): WebSpeechFallback | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
    if (typeof SpeechSynthesisUtterance === 'undefined') return null
    return new WebSpeechFallback(window.speechSynthesis)
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    const voices = this.synth.getVoices()
    const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-')
    return (
      voices.find((v) => norm(v) === 'zh-tw') ??
      voices.find((v) => norm(v).includes('hant') && !norm(v).includes('hk')) ??
      voices.find((v) => norm(v) === 'zh-cn' || norm(v) === 'cmn-cn') ??
      voices.find((v) => norm(v).startsWith('zh') && !norm(v).includes('hk') && !norm(v).includes('yue')) ??
      null
    )
  }

  speak(text: string, signal: AbortSignal, timeoutMs: number): Promise<PlayOutcome> {
    const voice = this.pickVoice()
    if (!voice) return Promise.resolve('unavailable')
    if (signal.aborted) return Promise.resolve('aborted')
    return new Promise((resolve) => {
      let done = false
      const utter = new SpeechSynthesisUtterance(text)
      utter.voice = voice
      utter.lang = voice.lang
      utter.rate = 0.95
      utter.pitch = 1.15
      const finish = (o: PlayOutcome) => {
        if (done) return
        done = true
        clearTimeout(timer)
        signal.removeEventListener('abort', onAbort)
        resolve(o)
      }
      const onAbort = () => {
        this.synth.cancel()
        finish('aborted')
      }
      // 部分瀏覽器不會觸發 onend，用逾時保護
      const timer = setTimeout(() => finish('timeout'), Math.min(timeoutMs, 1200 + text.length * 450))
      utter.onend = () => finish('spoken')
      utter.onerror = () => finish('error')
      signal.addEventListener('abort', onAbort, { once: true })
      this.synth.cancel()
      this.synth.speak(utter)
    })
  }

  cancel(): void {
    this.synth.cancel()
  }
}
