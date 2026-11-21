import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { PlayTimer, isBreakMinutes, DEFAULT_BREAK_MINUTES } from '../src/core/playTimer'
import { useBreakReminder } from '../src/composables/useBreakReminder'
import { StorageService, createDefaultState, type StorageLike } from '../src/services/StorageService'
import { FEEDBACK_TEXT } from '../src/data/zhuyinAudioMap'

const MIN = 60_000

/** 模擬每秒 tick 一次，持續 ms 毫秒 */
function play(t: PlayTimer, from: number, ms: number, visible = true, counting = true): number {
  let now = from
  for (let i = 0; i < ms / 1000; i++) {
    now += 1000
    t.tick(now, visible, counting)
  }
  return now
}

describe('護眼休息提醒：遊玩時間', () => {
  it('畫面看得到時累計，滿 10 分鐘就該休息', () => {
    const t = new PlayTimer()
    t.tick(0, true)
    let now = play(t, 0, 10 * MIN - 1000)
    expect(t.isDue(10)).toBe(false)
    now = play(t, now, 1000)
    expect(t.isDue(10)).toBe(true)
    expect(t.isDue(15)).toBe(false)
  })

  it('切到背景（看不到畫面）的時間不算', () => {
    const t = new PlayTimer()
    t.tick(0, true)
    let now = play(t, 0, 5 * MIN)
    now = play(t, now, 30 * MIN, false) // 背景 30 分鐘
    expect(t.elapsedMs).toBe(5 * MIN)
    // 回到前景後第一次 tick 不會把背景時間算進來
    now += 1000
    t.tick(now, true)
    expect(t.elapsedMs).toBe(5 * MIN)
  })

  it('裝置休眠後計時器恢復，不會一次加進一大段時間', () => {
    const t = new PlayTimer(5000)
    t.tick(0, true)
    t.tick(60 * MIN, true) // 一小時後才跳下一次
    expect(t.elapsedMs).toBe(5000)
  })

  it('休息畫面顯示中不累計；重新計時後從 0 開始', () => {
    const t = new PlayTimer()
    t.tick(0, true)
    let now = play(t, 0, 10 * MIN)
    now = play(t, now, 5 * MIN, true, false)
    expect(t.elapsedMs).toBe(10 * MIN)
    t.reset(now)
    expect(t.elapsedMs).toBe(0)
    play(t, now, 3000)
    expect(t.elapsedMs).toBe(3000)
  })

  it('關閉提醒（0 分鐘）永遠不會提醒', () => {
    const t = new PlayTimer()
    t.tick(0, true)
    play(t, 0, 120 * MIN)
    expect(t.isDue(0)).toBe(false)
  })
})

describe('護眼休息提醒：畫面流程', () => {
  it('到時間顯示休息畫面，不會自動消失；按「我休息好了」後重新計時', () => {
    let now = 0
    const minutes = ref(10)
    const r = useBreakReminder(minutes, { now: () => now })
    for (let i = 0; i < 600; i++) {
      now += 1000
      r.tick()
    }
    expect(r.showing.value).toBe(true)
    // 休息中過了很久，還是顯示（不自動消失）
    for (let i = 0; i < 1200; i++) {
      now += 1000
      r.tick()
    }
    expect(r.showing.value).toBe(true)
    r.finishBreak()
    expect(r.showing.value).toBe(false)
    expect(r.elapsedMs()).toBe(0)
  })

  it('試用 1 分鐘：玩滿 1 分鐘就提醒', () => {
    let now = 0
    const r = useBreakReminder(ref(1), { now: () => now })
    for (let i = 0; i < 59; i++) {
      now += 1000
      r.tick()
    }
    expect(r.showing.value).toBe(false)
    now += 1000
    r.tick()
    expect(r.showing.value).toBe(true)
  })

  it('改成 15 分鐘：10 分鐘時不提醒，15 分鐘才提醒', () => {
    let now = 0
    const minutes = ref(15)
    const r = useBreakReminder(minutes, { now: () => now })
    for (let i = 0; i < 600; i++) {
      now += 1000
      r.tick()
    }
    expect(r.showing.value).toBe(false)
    for (let i = 0; i < 300; i++) {
      now += 1000
      r.tick()
    }
    expect(r.showing.value).toBe(true)
  })
})

describe('護眼休息提醒：設定', () => {
  class Mem implements StorageLike {
    data = new Map<string, string>()
    getItem(k: string) {
      return this.data.get(k) ?? null
    }
    setItem(k: string, v: string) {
      this.data.set(k, v)
    }
    removeItem(k: string) {
      this.data.delete(k)
    }
  }

  it('預設每 10 分鐘；只接受 0（關閉）、1（試用）、10、15', () => {
    expect(DEFAULT_BREAK_MINUTES).toBe(10)
    expect(createDefaultState().breakMinutes).toBe(10)
    expect([0, 1, 10, 15].every(isBreakMinutes)).toBe(true)
    expect([5, 20, '10', null].some(isBreakMinutes)).toBe(false)
  })

  it('存檔裡不合法的值退回預設 10 分鐘；關閉（0）會被保留', () => {
    const mem = new Mem()
    mem.setItem('zhuyin-find-it', JSON.stringify({ version: 1, breakMinutes: 99, progress: {} }))
    expect(new StorageService(mem).load().breakMinutes).toBe(10)
    mem.setItem('zhuyin-find-it', JSON.stringify({ version: 1, breakMinutes: 0, progress: {} }))
    expect(new StorageService(mem).load().breakMinutes).toBe(0)
  })

  it('休息語音的文字', () => {
    expect(FEEDBACK_TEXT.break).toBe('眼睛休息一下，我們去喝水、上廁所、抱抱爸爸媽媽吧！等等再來玩！')
  })
})
