import { describe, expect, it } from 'vitest'
import {
  CircleInteractionController,
  type InteractionAudio,
  type PopupState,
} from '../src/core/CircleInteractionController'
import type { AnswerKind, InteractionState } from '../src/types/worksheet'
import type { FeedbackKind } from '../src/data/zhuyinAudioMap'
import type { PlayOutcome } from '../src/services/AudioService'

const FAST = { minPronounceMs: 0, feedbackHoldMs: 1, alreadyHoldMs: 1, closingMs: 1, stepTimeoutMs: 80 }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Event = string

/** 可控制的假音訊：每段播放都要測試手動 resolve，才能檢查「發音完成前不顯示結果」 */
function createFakeAudio(opts: { symbol?: 'manual' | PlayOutcome | 'reject' | 'hang'; feedback?: PlayOutcome } = {}) {
  const log: Event[] = []
  let resolveSymbol: ((o: PlayOutcome) => void) | null = null
  const audio: InteractionAudio = {
    playSymbol(symbol: string, signal: AbortSignal) {
      log.push(`symbol:${symbol}`)
      const mode = opts.symbol ?? 'ended'
      if (mode === 'reject') return Promise.reject(new Error('boom'))
      if (mode === 'hang') return new Promise(() => undefined)
      if (mode === 'manual') {
        return new Promise<PlayOutcome>((resolve) => {
          resolveSymbol = resolve
          signal.addEventListener('abort', () => resolve('aborted'))
        })
      }
      return Promise.resolve(mode)
    },
    playFeedback(kind: FeedbackKind) {
      log.push(`feedback:${kind}`)
      return Promise.resolve(opts.feedback ?? 'ended')
    },
    stop() {
      log.push('stop')
    },
  }
  return { audio, log, finishSymbol: (o: PlayOutcome = 'ended') => resolveSymbol?.(o) }
}

function setup(answer: AnswerKind | ((id: string) => AnswerKind), audioOpts?: Parameters<typeof createFakeAudio>[0]) {
  const fake = createFakeAudio(audioOpts)
  const states: Array<{ phase: InteractionState; popup: PopupState | null }> = []
  const correct: string[] = []
  let completeCalls = 0
  let completeOnCorrect = false
  const controller = new CircleInteractionController({
    audio: fake.audio,
    timings: FAST,
    evaluate: (id) => {
      fake.log.push('evaluate')
      return typeof answer === 'function' ? answer(id) : answer
    },
    onCorrect: (id) => {
      correct.push(id)
      return { completed: completeOnCorrect }
    },
    onChange: (popup, phase) => states.push({ popup, phase }),
    onRecognitionComplete: () => completeCalls++,
  })
  return {
    controller,
    fake,
    states,
    correct,
    completeCalls: () => completeCalls,
    setCompleteOnCorrect: (v: boolean) => (completeOnCorrect = v),
  }
}

describe('19.2 語音與 Popup', () => {
  it('點擊圓圈先播放注音，發音完成後才顯示結果', async () => {
    const t = setup('correct', { symbol: 'manual' })
    const done = t.controller.tap({ id: 'c1', symbol: 'ㄌ' })
    await sleep(15)
    expect(t.controller.state).toBe('pronouncing')
    expect(t.controller.currentPopup?.result).toBeNull()
    expect(t.fake.log).toEqual(['symbol:ㄌ'])
    expect(t.correct).toHaveLength(0)

    t.fake.finishSymbol('ended')
    await done
    const firstResult = t.states.findIndex((s) => s.popup?.result != null)
    const lastPronouncing = t.states.map((s) => s.phase).lastIndexOf('pronouncing')
    expect(firstResult).toBeGreaterThan(lastPronouncing)
    expect(t.fake.log.indexOf('evaluate')).toBeGreaterThan(t.fake.log.indexOf('symbol:ㄌ'))
  })

  it('狀態依序為 idle → pronouncing → feedback → closing → idle', async () => {
    const t = setup('wrong')
    await t.controller.tap({ id: 'c1', symbol: 'ㄇ' })
    const phases = t.states.map((s) => s.phase).filter((p, i, arr) => i === 0 || arr[i - 1] !== p)
    expect(phases).toEqual(['pronouncing', 'feedback', 'closing', 'idle'])
    expect(t.controller.state).toBe('idle')
    expect(t.controller.currentPopup).toBeNull()
  })

  it('正確答案播放「找到了！」並計分', async () => {
    const t = setup('correct')
    await t.controller.tap({ id: 'c1', symbol: 'ㄌ' })
    expect(t.fake.log).toContain('feedback:found')
    expect(t.correct).toEqual(['c1'])
  })

  it('錯誤答案播放「再找找看！」且不計分', async () => {
    const t = setup('wrong')
    await t.controller.tap({ id: 'c2', symbol: 'ㄇ' })
    expect(t.fake.log).toContain('feedback:try-again')
    expect(t.fake.log).not.toContain('feedback:found')
    expect(t.correct).toHaveLength(0)
  })

  it('已找到的圓圈：重播發音、不重複計分、不播完整答對回饋', async () => {
    const t = setup('already')
    await t.controller.tap({ id: 'c1', symbol: 'ㄌ' })
    expect(t.fake.log[0]).toBe('symbol:ㄌ')
    expect(t.fake.log.some((e) => e.startsWith('feedback:'))).toBe(false)
    expect(t.correct).toHaveLength(0)
  })

  it('語音失敗（reject / missing）不會卡住', async () => {
    for (const mode of ['reject', 'missing', 'error'] as const) {
      const t = setup('correct', { symbol: mode, feedback: 'unavailable' })
      await t.controller.tap({ id: 'c1', symbol: 'ㄌ' })
      expect(t.controller.state).toBe('idle')
      expect(t.correct).toEqual(['c1'])
    }
  })

  it('音檔缺少時 Popup 標示缺音檔（不假裝播放成功）', async () => {
    const t = setup('wrong', { symbol: 'missing' })
    await t.controller.tap({ id: 'c1', symbol: 'ㄇ' })
    expect(t.states.some((s) => s.popup?.symbolAudioMissing === true)).toBe(true)
  })

  it('音訊卡住沒有回應時，逾時保護讓流程繼續', async () => {
    const t = setup('wrong', { symbol: 'hang' })
    const start = Date.now()
    await t.controller.tap({ id: 'c1', symbol: 'ㄇ' })
    expect(Date.now() - start).toBeGreaterThanOrEqual(70)
    expect(t.controller.state).toBe('idle')
  })

  it('快速連點不會產生重複 Popup', async () => {
    const t = setup('correct', { symbol: 'manual' })
    const first = t.controller.tap({ id: 'c1', symbol: 'ㄌ' })
    const second = await t.controller.tap({ id: 'c2', symbol: 'ㄌ' })
    const third = await t.controller.tap({ id: 'c1', symbol: 'ㄌ' })
    expect(second).toBe(false)
    expect(third).toBe(false)
    expect(t.fake.log.filter((e) => e.startsWith('symbol:'))).toHaveLength(1)
    t.fake.finishSymbol()
    await first
    expect(t.correct).toEqual(['c1'])
  })

  it('切換題目時舊的非同步流程會取消，不會再更新狀態或計分', async () => {
    const t = setup('correct', { symbol: 'manual' })
    const pending = t.controller.tap({ id: 'old', symbol: 'ㄌ' })
    await sleep(5)
    t.controller.cancel()
    const statesAfterCancel = t.states.length
    t.fake.finishSymbol('ended') // 舊流程的音訊之後才結束
    await pending
    await sleep(20)
    expect(t.correct).toHaveLength(0)
    expect(t.states.length).toBe(statesAfterCancel)
    expect(t.controller.state).toBe('idle')
    expect(t.fake.log).toContain('stop')
  })

  it('發音中按關閉：停止發音，仍判斷並計分，不播回饋語音', async () => {
    const t = setup('correct', { symbol: 'manual' })
    const pending = t.controller.tap({ id: 'c1', symbol: 'ㄌ' })
    await sleep(5)
    t.controller.close()
    await pending
    expect(t.correct).toEqual(['c1'])
    expect(t.fake.log).toContain('stop')
    expect(t.fake.log.some((x) => x.startsWith('feedback'))).toBe(false)
    expect(t.controller.state).toBe('idle')
  })

  it('發音中按關閉：答錯不計分', async () => {
    const t = setup('wrong', { symbol: 'manual' })
    const pending = t.controller.tap({ id: 'c1', symbol: 'ㄇ' })
    await sleep(5)
    t.controller.close()
    await pending
    expect(t.correct).toHaveLength(0)
    expect(t.controller.state).toBe('idle')
  })

  it('發音中按關閉最後一個正確圓圈：仍觸發完成獎勵', async () => {
    const t = setup('correct', { symbol: 'manual' })
    t.setCompleteOnCorrect(true)
    const pending = t.controller.tap({ id: 'last', symbol: 'ㄌ' })
    await sleep(5)
    t.controller.close()
    await pending
    expect(t.completeCalls()).toBe(1)
  })

  it('完成最後一個時，Popup 關閉後才觸發完成獎勵', async () => {
    const t = setup('correct')
    t.setCompleteOnCorrect(true)
    await t.controller.tap({ id: 'last', symbol: 'ㄌ' })
    expect(t.completeCalls()).toBe(1)
    const idleIndex = t.states.map((s) => s.phase).lastIndexOf('idle')
    expect(idleIndex).toBe(t.states.length - 1)
  })

  it('取消（換題）時不觸發完成獎勵', async () => {
    const t = setup('correct', { symbol: 'manual' })
    t.setCompleteOnCorrect(true)
    const p = t.controller.tap({ id: 'last', symbol: 'ㄌ' })
    await sleep(5)
    t.controller.cancel()
    t.fake.finishSymbol()
    await p
    expect(t.completeCalls()).toBe(0)
  })

  it('dispose 之後不再接受點擊', async () => {
    const t = setup('correct')
    t.controller.dispose()
    expect(await t.controller.tap({ id: 'c1', symbol: 'ㄌ' })).toBe(false)
  })
})
