import { describe, expect, it } from 'vitest'
import { AudioService, type AudioElementLike, type PlayOutcome, type SpeechFallback } from '../src/services/AudioService'

type Behavior = 'ended' | 'error' | 'hang' | 'reject-notallowed'

class FakeAudio implements AudioElementLike {
  src = ''
  currentTime = 0
  preload = ''
  played: string[] = []
  private listeners = new Map<string, Set<() => void>>()
  constructor(private behavior: (src: string) => Behavior) {}
  addEventListener(type: string, fn: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(fn)
  }
  removeEventListener(type: string, fn: () => void) {
    this.listeners.get(type)?.delete(fn)
  }
  emit(type: string) {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn()
  }
  play() {
    this.played.push(this.src)
    const b = this.behavior(this.src)
    if (b === 'reject-notallowed') return Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' }))
    if (b === 'ended') setTimeout(() => this.emit('ended'), 2)
    if (b === 'error') setTimeout(() => this.emit('error'), 2)
    return Promise.resolve()
  }
  pause() {}
}

function makeSpeech() {
  const spoken: string[] = []
  const speech: SpeechFallback = {
    speak: (text: string): Promise<PlayOutcome> => {
      spoken.push(text)
      return Promise.resolve('spoken')
    },
    cancel: () => undefined,
  }
  return { speech, spoken }
}

function service(behavior: (src: string) => Behavior, speech: SpeechFallback | null = null, timeoutMs = 60) {
  const el = new FakeAudio(behavior)
  const svc = new AudioService({ createAudio: () => el, speech, resolveUrl: (p) => `/${p}`, timeoutMs })
  return { svc, el }
}

describe('AudioService', () => {
  it('注音音檔播放完成回傳 ended', async () => {
    const { svc, el } = service(() => 'ended')
    expect(await svc.playSymbol('ㄌ')).toBe('ended')
    expect(el.played).toEqual(['/audio/zhuyin/F8.wav'])
  })

  it('注音音檔不存在：回傳 missing，不使用 TTS 念注音', async () => {
    const { speech, spoken } = makeSpeech()
    const { svc } = service(() => 'error', speech)
    expect(await svc.playSymbol('ㄌ')).toBe('missing')
    expect(spoken).toHaveLength(0)
    expect(svc.isSymbolAudioMissing('ㄌ')).toBe(true)
    // 已知缺檔：不再重試
    expect(await svc.playSymbol('ㄌ')).toBe('missing')
  })

  it('鼓勵語音檔不存在時，改用中文語音備援念鼓勵句', async () => {
    const { speech, spoken } = makeSpeech()
    const { svc } = service(() => 'error', speech)
    expect(await svc.playFeedback('found')).toBe('spoken')
    expect(await svc.playFeedback('try-again')).toBe('spoken')
    expect(spoken).toEqual(['找到了！', '再找找看！'])
  })

  it('沒有可用語音時回報 unavailable（不假裝成功）', async () => {
    const { svc } = service(() => 'error', null)
    expect(await svc.playFeedback('found')).toBe('unavailable')
  })

  it('音檔沒有回應時逾時保護', async () => {
    const { svc } = service(() => 'hang', null, 30)
    expect(await svc.playSymbol('ㄌ')).toBe('timeout')
  })

  it('瀏覽器擋自動播放：回傳 blocked，且不標記為缺檔', async () => {
    const { svc } = service(() => 'reject-notallowed')
    expect(await svc.playSymbol('ㄌ')).toBe('blocked')
    expect(svc.isSymbolAudioMissing('ㄌ')).toBe(false)
  })

  it('AbortSignal 可以中止播放', async () => {
    const { svc } = service(() => 'hang', null, 1000)
    const ac = new AbortController()
    const p = svc.playSymbol('ㄌ', ac.signal)
    ac.abort()
    expect(await p).toBe('aborted')
  })

  it('新的播放會中斷舊的播放（不會重複播放）', async () => {
    const { svc } = service((src) => (src.includes('F8.wav') ? 'hang' : 'ended'), null, 1000)
    const first = svc.playSymbol('ㄌ')
    const second = svc.playSymbol('ㄇ')
    expect(await first).toBe('aborted')
    expect(await second).toBe('ended')
  })

  it('靜音時不播放任何聲音', async () => {
    const { speech, spoken } = makeSpeech()
    const { svc, el } = service(() => 'ended', speech)
    svc.setMuted(true)
    expect(await svc.playSymbol('ㄌ')).toBe('muted')
    expect(await svc.playFeedback('found')).toBe('muted')
    expect(el.played).toHaveLength(0)
    expect(spoken).toHaveLength(0)
  })

  it('沒有對應表的符號回傳 missing', async () => {
    const { svc } = service(() => 'ended')
    expect(await svc.playSymbol('X')).toBe('missing')
  })
})

describe('鼓勵語音多樣化', () => {
  const map = {
    found: ['a/found-1.wav', 'a/found-2.wav', 'a/found-3.wav'],
    'try-again': ['a/try-1.wav', 'a/try-2.wav'],
    completed: ['a/done.wav'],
    break: ['a/break.wav'],
  } as const

  it('每次隨機挑一句，不會連續兩次同一句', () => {
    const svc = new AudioService({ createAudio: () => null, speech: null, feedbackMap: map })
    let last = ''
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const p = svc.pickFeedback('found')!
      expect(p).not.toBe(last)
      last = p
      seen.add(p)
    }
    expect(seen.size).toBe(3)
  })

  it('只有一句時固定播那一句；沒有時回傳 null', () => {
    const svc = new AudioService({
      createAudio: () => null,
      speech: null,
      feedbackMap: { ...map, completed: ['a/done.wav'], 'try-again': [] },
    })
    expect(svc.pickFeedback('completed')).toBe('a/done.wav')
    expect(svc.pickFeedback('completed')).toBe('a/done.wav')
    expect(svc.pickFeedback('try-again')).toBeNull()
  })

  it('兩句時固定的隨機數也會輪流', () => {
    const svc = new AudioService({ createAudio: () => null, speech: null, feedbackMap: map, random: () => 0 })
    expect([1, 2, 3, 4].map(() => svc.pickFeedback('try-again'))).toEqual([
      'a/try-1.wav',
      'a/try-2.wav',
      'a/try-1.wav',
      'a/try-2.wav',
    ])
  })

  it('對應表裡列出的鼓勵語音檔都存在', async () => {
    const files = new Set(Object.keys(import.meta.glob('/public/audio/feedback/*.wav')))
    const { FEEDBACK_AUDIO, OPTIONAL_FEEDBACK } = await import('../src/data/zhuyinAudioMap')
    for (const [kind, list] of Object.entries(FEEDBACK_AUDIO)) {
      if (OPTIONAL_FEEDBACK.includes(kind as keyof typeof FEEDBACK_AUDIO)) continue
      expect(list.length).toBeGreaterThan(0)
      for (const path of list) expect(files.has(`/public/${path}`), path).toBe(true)
    }
  })
})
