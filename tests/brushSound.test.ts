import { describe, expect, it } from 'vitest'
import { BRUSH_MAX_VOLUME, BrushSound, type AudioContextLike } from '../src/services/BrushSound'

function fakeParam() {
  const events: Array<{ target: number; at: number }> = []
  return {
    value: 0,
    events,
    setTargetAtTime(target: number, at: number) {
      events.push({ target, at })
    },
    cancelScheduledValues() {},
  }
}

function fakeContext() {
  const log = { sources: 0, started: 0, stopped: 0, gains: [] as ReturnType<typeof fakeParam>[], filters: [] as number[] }
  const node = () => ({ connect() {}, disconnect() {} })
  const ctx: AudioContextLike = {
    currentTime: 0,
    sampleRate: 8000,
    state: 'running',
    destination: {},
    resume: () => Promise.resolve(),
    createBuffer: (_c, length) => ({ getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => {
      log.sources++
      return {
        ...node(),
        buffer: null,
        loop: false,
        start() {
          log.started++
        },
        stop() {
          log.stopped++
        },
      }
    },
    createBiquadFilter: () => {
      const frequency = fakeParam()
      const f = { ...node(), type: '', frequency, Q: fakeParam() }
      queueMicrotask(() => log.filters.push(frequency.value))
      return f
    },
    createGain: () => {
      const gain = fakeParam()
      log.gains.push(gain)
      return { ...node(), gain }
    },
  }
  return { ctx, log }
}

describe('筆刷音效', () => {
  it('落筆開始播放，音量先為 0；移動越快音量越大，但不超過上限', () => {
    const { ctx, log } = fakeContext()
    let t = 0
    const s = new BrushSound(() => ctx, () => t)
    s.start('brush')
    expect(log.started).toBe(1)
    const g = log.gains[0]
    expect(g.value).toBe(0)

    t += 16
    s.move(2) // 慢
    const slow = g.events[g.events.length - 2].target
    t += 16
    s.move(30) // 快
    const fast = g.events[g.events.length - 2].target
    expect(slow).toBeGreaterThan(0)
    expect(fast).toBeGreaterThan(slow)
    expect(fast).toBeLessThanOrEqual(BRUSH_MAX_VOLUME)
    // 每次移動後都排好「停住就安靜」
    expect(g.events[g.events.length - 1].target).toBe(0)
  })

  it('幾乎不動時不出聲', () => {
    const { ctx, log } = fakeContext()
    let t = 0
    const s = new BrushSound(() => ctx, () => t)
    s.start('brush')
    t += 100
    s.move(0.5)
    expect(log.gains[0].events[0].target).toBe(0)
  })

  it('放開時淡出並停止；立即停止時馬上釋放', () => {
    const { ctx, log } = fakeContext()
    const s = new BrushSound(() => ctx, () => 0)
    s.start('brush')
    s.stop(true)
    expect(log.stopped).toBe(1)
    expect(s.playing).toBe(false)
  })

  it('靜音時不建立音效、也不播放', () => {
    const { ctx, log } = fakeContext()
    let created = 0
    const s = new BrushSound(() => {
      created++
      return ctx
    })
    s.setMuted(true)
    s.start('brush')
    expect(created).toBe(0)
    expect(log.sources).toBe(0)
  })

  it('播放中切成靜音會立刻停止', () => {
    const { ctx, log } = fakeContext()
    const s = new BrushSound(() => ctx, () => 0)
    s.start('eraser')
    s.setMuted(true)
    expect(log.stopped).toBe(1)
  })

  it('沒有 Web Audio 的環境安全略過', () => {
    const s = new BrushSound(() => null)
    expect(() => {
      s.start('brush')
      s.move(10)
      s.stop()
    }).not.toThrow()
  })

  it('畫筆與橡皮擦音色不同（橡皮擦較低）', async () => {
    const { ctx, log } = fakeContext()
    const s = new BrushSound(() => ctx, () => 0)
    s.start('brush')
    s.start('eraser')
    await Promise.resolve()
    expect(log.filters[0]).toBeGreaterThan(log.filters[1])
  })
})
