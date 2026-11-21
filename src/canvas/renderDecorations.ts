/** 黑白線稿裝飾：星星、愛心、小花、雲朵、草叢、強調線、虛線外框 */
import { BORDER_INSET, INK, WORKSHEET_HEIGHT, WORKSHEET_WIDTH } from './layout'

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export function setInk(ctx: Ctx2D, width: number): void {
  ctx.strokeStyle = INK
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

export function drawStar(ctx: Ctx2D, cx: number, cy: number, r: number, lw = 3, fill = '#fff'): void {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.5
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  setInk(ctx, lw)
  ctx.stroke()
}

export function drawHeart(ctx: Ctx2D, cx: number, cy: number, s: number, lw = 3, fill = '#fff'): void {
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.7)
  ctx.bezierCurveTo(cx - s * 1.25, cy - s * 0.05, cx - s * 0.6, cy - s * 0.95, cx, cy - s * 0.3)
  ctx.bezierCurveTo(cx + s * 0.6, cy - s * 0.95, cx + s * 1.25, cy - s * 0.05, cx, cy + s * 0.7)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  setInk(ctx, lw)
  ctx.stroke()
}

export function drawFlower(ctx: Ctx2D, cx: number, cy: number, r: number, lw = 3): void {
  const petalR = r * 0.42
  setInk(ctx, lw)
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58, petalR, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.stroke()
}

interface Circle {
  x: number
  y: number
  r: number
}

/** 多個圓的聯集外框（雲朵、草叢使用）：先畫粗黑線，再填白，只留下外圍輪廓 */
export function drawBlobUnion(ctx: Ctx2D, circles: Circle[], lw: number, fill = '#fff'): void {
  ctx.save()
  ctx.strokeStyle = INK
  ctx.lineWidth = lw * 2
  for (const c of circles) {
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = fill
  for (const c of circles) {
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function cloudCircles(cx: number, cy: number, w: number, h: number): Circle[] {
  const sideR = h * 0.4
  const circles: Circle[] = [
    { x: cx - w / 2 + sideR, y: cy + h * 0.06, r: sideR },
    { x: cx + w / 2 - sideR, y: cy + h * 0.06, r: sideR },
  ]
  const innerW = w - sideR * 2
  const topCount = Math.max(1, Math.round(innerW / (h * 0.55)))
  for (let i = 0; i < topCount; i++) {
    const t = topCount === 1 ? 0.5 : i / (topCount - 1)
    circles.push({ x: cx - innerW / 2 + innerW * t, y: cy - h * 0.14, r: h * 0.36 })
  }
  const bottomCount = Math.max(1, topCount - 1)
  for (let i = 0; i < bottomCount; i++) {
    const t = bottomCount === 1 ? 0.5 : i / (bottomCount - 1)
    circles.push({ x: cx - innerW * 0.38 + innerW * 0.76 * t, y: cy + h * 0.2, r: h * 0.3 })
  }
  circles.push({ x: cx, y: cy, r: Math.min(innerW / 2, h * 0.36) })
  return circles
}

export function drawCloud(ctx: Ctx2D, cx: number, cy: number, w: number, h: number, lw = 3): void {
  drawBlobUnion(ctx, cloudCircles(cx, cy, w, h), lw)
  // 中央空隙補白
  ctx.fillStyle = '#fff'
  ctx.fillRect(cx - w / 2 + h * 0.4, cy - h * 0.2, w - h * 0.8, h * 0.45)
}

/** 草叢：底部開口的三個圓弧 */
export function drawBush(ctx: Ctx2D, cx: number, baseY: number, w: number, lw = 3): void {
  const r = w / 4
  setInk(ctx, lw)
  ctx.beginPath()
  ctx.moveTo(cx - w / 2, baseY)
  ctx.arc(cx - r, baseY - r * 0.3, r, Math.PI * 0.95, Math.PI * 1.75)
  ctx.arc(cx, baseY - r * 0.75, r * 1.05, Math.PI * 1.2, Math.PI * 1.8)
  ctx.arc(cx + r, baseY - r * 0.3, r, Math.PI * 1.25, Math.PI * 0.05)
  ctx.stroke()
}

/** 強調線（三條放射短線） */
export function drawSparkLines(ctx: Ctx2D, x: number, y: number, angle: number, len = 18, lw = 3.5): void {
  setInk(ctx, lw)
  for (const offset of [-0.45, 0, 0.45]) {
    const a = angle + offset
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6)
    ctx.lineTo(x + Math.cos(a) * (6 + len), y + Math.sin(a) * (6 + len))
    ctx.stroke()
  }
}

export function drawDashedBorder(ctx: Ctx2D): void {
  ctx.save()
  setInk(ctx, 2.5)
  ctx.setLineDash([10, 7])
  ctx.strokeRect(BORDER_INSET, BORDER_INSET, WORKSHEET_WIDTH - BORDER_INSET * 2, WORKSHEET_HEIGHT - BORDER_INSET * 2)
  ctx.restore()
}
