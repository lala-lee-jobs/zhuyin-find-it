/**
 * 護眼休息提醒：累計「真的在玩」的時間（與 Vue 無關，可單獨測試）。
 *
 * - 只有畫面看得到（Page Visibility = visible）時才累計；切到背景、鎖螢幕都不算。
 * - 每次累計的間隔有上限：裝置休眠後計時器恢復時，不會一次加進一大段時間。
 * - 休息提醒顯示中不累計；按「我休息好了」後從 0 重新計時。
 */

/** 可選的提醒間隔（分鐘）；0 = 關閉；1 = 試用（大人先體驗提醒流程） */
export const BREAK_MINUTES_OPTIONS = [0, 1, 10, 15] as const
export type BreakMinutes = (typeof BREAK_MINUTES_OPTIONS)[number]
export const DEFAULT_BREAK_MINUTES: BreakMinutes = 10

export function isBreakMinutes(value: unknown): value is BreakMinutes {
  return BREAK_MINUTES_OPTIONS.includes(value as BreakMinutes)
}

export class PlayTimer {
  /** 已累計的遊玩時間（毫秒） */
  elapsedMs = 0
  private last: number | null = null

  /**
   * @param maxStepMs 單次累計上限（例如計時器每秒跳一次，上限 5 秒）
   */
  constructor(private readonly maxStepMs = 5000) {}

  /**
   * 時間往前走到 now。visible = 畫面看得到；counting = 目前可以計時（沒有在休息）。
   * 回傳累計後的毫秒數。
   */
  tick(now: number, visible: boolean, counting = true): number {
    if (this.last !== null && visible && counting) {
      const step = now - this.last
      if (step > 0) this.elapsedMs += Math.min(step, this.maxStepMs)
    }
    this.last = visible ? now : null
    return this.elapsedMs
  }

  /** 是否到了該休息的時間；minutes = 0 代表關閉 */
  isDue(minutes: number): boolean {
    return minutes > 0 && this.elapsedMs >= minutes * 60_000
  }

  /** 休息結束：重新計時 */
  reset(now: number | null = null): void {
    this.elapsedMs = 0
    this.last = now
  }
}
