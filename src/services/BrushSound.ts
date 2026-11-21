/**
 * 塗色時的筆刷音效（Web Audio 即時合成，不需要音檔）。
 *
 *   白噪音（循環）→ 帶通濾波（畫筆偏亮的「沙沙」、橡皮擦偏低的「擦擦」）→ 音量
 *
 * 音量跟著筆畫速度走：畫得快聲音大、停住不動就安靜，放開手指時淡出。
 * AudioContext 在第一次落筆（使用者手勢）時才建立，符合 iOS 的自動播放限制。
 */
import type { DrawingTool } from '../types/worksheet'

/** 測試時可替換的最小 Web Audio 介面 */
export interface AudioParamLike {
  value: number
  setTargetAtTime(target: number, startTime: number, timeConstant: number): unknown
  cancelScheduledValues(startTime: number): unknown
}
export interface AudioNodeLike {
  connect(dest: unknown): unknown
  disconnect(): void
}
export interface BufferSourceLike extends AudioNodeLike {
  buffer: unknown
  loop: boolean
  start(when?: number, offset?: number): void
  stop(when?: number): void
}
export interface BiquadLike extends AudioNodeLike {
  type: string
  frequency: AudioParamLike
  Q: AudioParamLike
}
export interface GainLike extends AudioNodeLike {
  gain: AudioParamLike
}
export interface AudioContextLike {
  currentTime: number
  sampleRate: number
  state: string
  destination: unknown
  resume(): Promise<void>
  createBuffer(channels: number, length: number, sampleRate: number): { getChannelData(ch: number): Float32Array }
  createBufferSource(): BufferSourceLike
  createBiquadFilter(): BiquadLike
  createGain(): GainLike
}

export type AudioContextFactory = () => AudioContextLike | null

export const defaultAudioContextFactory: AudioContextFactory = () => {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    return new Ctor() as unknown as AudioContextLike
  } catch {
    return null
  }
}

/** 音色：中心頻率與 Q（越大越尖） */
const TONE: Record<DrawingTool, { frequency: number; q: number }> = {
  brush: { frequency: 2200, q: 0.9 },
  eraser: { frequency: 900, q: 0.7 },
}

/** 最大音量（不要蓋過注音發音） */
export const BRUSH_MAX_VOLUME = 0.16
/** 速度達到這個值（邏輯單位 / 秒）時音量最大 */
const FULL_SPEED = 900
/** 低於這個速度視為停住 */
const MIN_SPEED = 30

export class BrushSound {
  private ctx: AudioContextLike | null = null
  private noise: unknown = null
  private source: BufferSourceLike | null = null
  private filter: BiquadLike | null = null
  private gain: GainLike | null = null
  private muted = false
  private lastTime = 0
  private stopTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly factory: AudioContextFactory = defaultAudioContextFactory,
    private readonly now: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  ) {}

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.stop(true)
  }

  get playing(): boolean {
    return this.source !== null
  }

  /** 落筆：開始播放（音量先為 0，等移動才出聲） */
  start(tool: DrawingTool): void {
    if (this.muted) return
    const ctx = this.ensureContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
    this.stop(true)

    const source = ctx.createBufferSource()
    source.buffer = this.noise
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = TONE[tool].frequency
    filter.Q.value = TONE[tool].q
    const gain = ctx.createGain()
    gain.gain.value = 0
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    // 從噪音的隨機位置開始，每一筆聽起來不完全一樣
    source.start(0, Math.random())

    this.source = source
    this.filter = filter
    this.gain = gain
    this.lastTime = this.now()
  }

  /** 筆畫移動了 distance（邏輯單位）：依速度調整音量 */
  move(distance: number): void {
    if (!this.ctx || !this.gain) return
    const t = this.now()
    const dt = Math.max(1, t - this.lastTime) / 1000
    this.lastTime = t
    const speed = distance / dt
    const level = speed < MIN_SPEED ? 0 : Math.min(1, speed / FULL_SPEED)
    // 開根號：慢慢畫也聽得到，快畫不會太吵
    const target = BRUSH_MAX_VOLUME * Math.sqrt(level)
    const g = this.gain.gain
    g.cancelScheduledValues(this.ctx.currentTime)
    g.setTargetAtTime(target, this.ctx.currentTime, 0.03)
    // 停住不動時（沒有新的 move）自動降到 0
    g.setTargetAtTime(0, this.ctx.currentTime + 0.12, 0.05)
  }

  /** 放開：淡出後停止；immediate 時立刻停止 */
  stop(immediate = false): void {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
    const source = this.source
    const filter = this.filter
    const gain = this.gain
    if (!source || !gain || !filter) return
    this.source = this.filter = this.gain = null

    const end = (): void => {
      try {
        source.stop()
      } catch {
        /* 已停止 */
      }
      source.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
    if (immediate || !this.ctx) {
      end()
      return
    }
    gain.gain.cancelScheduledValues(this.ctx.currentTime)
    gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04)
    this.stopTimer = setTimeout(() => {
      this.stopTimer = null
      end()
    }, 250)
  }

  private ensureContext(): AudioContextLike | null {
    if (this.ctx) return this.ctx
    const ctx = this.factory()
    if (!ctx) return null
    // 2 秒白噪音，循環播放
    const length = Math.floor(ctx.sampleRate * 2)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    this.ctx = ctx
    this.noise = buffer
    return ctx
  }
}
