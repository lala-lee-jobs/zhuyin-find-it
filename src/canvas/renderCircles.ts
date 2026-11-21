/** Layer 5–6：注音圓圈、答對填色動畫、目前互動中的圓圈提示 */
import type { ZhuyinCircle } from '../types/worksheet'
import { INK } from './layout'
import { drawSolidGlyph } from './renderZhuyin'
import type { Ctx2D } from './renderDecorations'

export const FILL_ANIMATION_MS = 420

export interface CircleRenderOptions {
  k: number
  now: number
  /** circleId → 填色動畫開始時間 */
  animations: ReadonlyMap<string, number>
  activeCircleId: string | null
  width: number
  height: number
}

function easeOutBack(t: number): number {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** 回傳 true 代表仍有動畫在進行，需要下一幀 */
export function renderCircles(ctx: Ctx2D, circles: readonly ZhuyinCircle[], opts: CircleRenderOptions): boolean {
  let animating = false
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, opts.width, opts.height)
  ctx.setTransform(opts.k, 0, 0, opts.k, 0, 0)

  for (const c of circles) {
    // 白底
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()

    // 答對填色（由中心長大）
    if (c.isFound) {
      const start = opts.animations.get(c.id)
      let t = 1
      if (start !== undefined) {
        t = Math.min(1, Math.max(0, (opts.now - start) / FILL_ANIMATION_MS))
        if (t < 1) animating = true
      }
      const r = c.radius * Math.min(1.04, Math.max(0, easeOutBack(t)))
      ctx.save()
      ctx.beginPath()
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2)
      ctx.clip()
      ctx.beginPath()
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
      ctx.fillStyle = c.fillColor ?? '#FFEB99'
      ctx.fill()
      ctx.restore()
    }

    // 互動中的圓圈：柔和外圈提示
    if (c.id === opts.activeCircleId) {
      ctx.beginPath()
      ctx.arc(c.x, c.y, c.radius + 7, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 196, 61, 0.85)'
      ctx.lineWidth = 8
      ctx.stroke()
    }

    // 黑色外框
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2)
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.stroke()

    // 注音（永遠黑色、畫在最上面）
    const size = c.radius * 1.12
    drawSolidGlyph(ctx, c.symbol, { x: c.x - size / 2, y: c.y - size / 2, size }, 10.5)
  }

  ctx.restore()
  return animating
}
