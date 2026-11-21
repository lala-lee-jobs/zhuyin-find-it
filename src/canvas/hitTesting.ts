import type { ZhuyinCircle } from '../types/worksheet'

export function isPointInCircle(
  x: number,
  y: number,
  circle: Pick<ZhuyinCircle, 'x' | 'y' | 'radius'>,
  slop = 0,
): boolean {
  const dx = x - circle.x
  const dy = y - circle.y
  const r = circle.radius + slop
  return dx * dx + dy * dy <= r * r
}

/** 找出被點到的圓圈；若剛好在兩圈之間（加上容錯時），取最近的一個 */
export function findCircleAt<T extends Pick<ZhuyinCircle, 'x' | 'y' | 'radius'>>(
  x: number,
  y: number,
  circles: readonly T[],
  slop = 0,
): T | null {
  let best: T | null = null
  let bestDist = Infinity
  for (const c of circles) {
    if (!isPointInCircle(x, y, c, slop)) continue
    const d = Math.hypot(x - c.x, y - c.y)
    if (d < bestDist) {
      best = c
      bestDist = d
    }
  }
  return best
}
