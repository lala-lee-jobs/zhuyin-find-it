/**
 * 護眼休息提醒：每秒累計一次遊玩時間（只算畫面看得到的時間），到時間就顯示休息畫面。
 * 休息畫面不會自己消失，要按「我休息好了！」才會關閉並重新計時。
 */
import { getCurrentScope, onScopeDispose, ref, watch, type Ref } from 'vue'
import { PlayTimer } from '../core/playTimer'

export interface BreakReminderOptions {
  intervalMs?: number
  now?: () => number
}

export function useBreakReminder(minutes: Ref<number>, options: BreakReminderOptions = {}) {
  const intervalMs = options.intervalMs ?? 1000
  const now = options.now ?? (() => Date.now())
  const timer = new PlayTimer(intervalMs * 5)
  const showing = ref(false)

  const isVisible = (): boolean => typeof document === 'undefined' || document.visibilityState !== 'hidden'

  function tick(): void {
    timer.tick(now(), isVisible(), !showing.value)
    if (!showing.value && timer.isDue(minutes.value)) showing.value = true
  }

  /** 按下「我休息好了！」 */
  function finishBreak(): void {
    showing.value = false
    timer.reset(isVisible() ? now() : null)
  }

  // 大人改了間隔：已經玩超過新的間隔時，下一秒就會提醒；關閉時不再提醒
  watch(minutes, tick)

  // 從現在開始計時
  tick()
  let handle: ReturnType<typeof setInterval> | null = null
  if (typeof window !== 'undefined') {
    handle = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
  }
  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (handle) clearInterval(handle)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', tick)
    })
  }

  return { showing, finishBreak, tick, elapsedMs: () => timer.elapsedMs }
}
