/**
 * 中央注音自由塗色的離屏合成（Layer 2–4）。
 *
 *   paint   ：孩子所有已完成的筆畫（畫筆 source-over、橡皮擦 destination-out）
 *   mask    ：注音可塗色區（離屏 Canvas）
 *   ring    ：注音黑色外框（離屏 Canvas，只有外框環）
 *   scratch ：每一幀合成用
 *
 * 每一幀：scratch = paint (+ 正在畫的筆畫) → destination-in mask → 畫到螢幕 → 最後畫 ring。
 *
 * 選擇 destination-in + 離屏遮罩的原因：
 * - 遮罩形狀可以是任何點陣，與 clip() 相比在各瀏覽器表現最一致、邊緣有反鋸齒。
 * - 橡皮擦只在 paint 上做 destination-out，永遠碰不到黑色外框。
 * - 黑框每一幀最後才畫，永遠清晰。
 */
import type { DrawingStroke } from '../types/worksheet'
import type { GlyphLayout } from './glyphGeometry'
import { drawGlyphMask, drawGlyphRing } from './renderZhuyin'
import type { Ctx2D } from './renderDecorations'

export type CanvasLike = HTMLCanvasElement | OffscreenCanvas
export type CanvasFactory = (width: number, height: number) => CanvasLike

export const defaultCanvasFactory: CanvasFactory = (width, height) => {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    return c
  }
  return new OffscreenCanvas(width, height)
}

function getCtx(canvas: CanvasLike): Ctx2D {
  const ctx = canvas.getContext('2d') as Ctx2D | null
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  return ctx
}

/** 以平滑曲線（中點二次曲線）畫一筆；單點畫圓點 */
export function drawStroke(ctx: Ctx2D, stroke: DrawingStroke, k: number): void {
  const pts = stroke.points
  if (pts.length === 0) return
  ctx.save()
  ctx.setTransform(k, 0, 0, k, 0, 0)
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.strokeStyle = stroke.tool === 'eraser' ? '#000' : stroke.color
  ctx.fillStyle = ctx.strokeStyle
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (pts.length === 1) {
    ctx.beginPath()
    ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y)
    } else {
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2
        const my = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
      }
      const last = pts[pts.length - 1]
      ctx.lineTo(last.x, last.y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

export class GlyphPaintSurface {
  private paint: CanvasLike | null = null
  private mask: CanvasLike | null = null
  private ring: CanvasLike | null = null
  private scratch: CanvasLike | null = null
  private width = 0
  private height = 0
  private k = 1
  private layout: GlyphLayout | null = null
  private drawnIds: string[] = []
  private strokes: readonly DrawingStroke[] = []

  constructor(private readonly factory: CanvasFactory = defaultCanvasFactory) {}

  get pixelSize(): { width: number; height: number; k: number } {
    return { width: this.width, height: this.height, k: this.k }
  }

  get drawnStrokeCount(): number {
    return this.drawnIds.length
  }

  /** 尺寸或注音改變：重建遮罩與外框，並用向量資料重畫全部筆畫（resize 不會遺失塗色） */
  configure(width: number, height: number, k: number, layout: GlyphLayout | null): void {
    const sizeChanged = width !== this.width || height !== this.height
    this.width = width
    this.height = height
    this.k = k
    this.layout = layout
    if (sizeChanged || !this.paint) {
      this.paint = this.factory(width, height)
      this.mask = this.factory(width, height)
      this.ring = this.factory(width, height)
      this.scratch = this.factory(width, height)
    }
    this.rebuildGlyphLayers()
    this.rebuildPaint()
  }

  /**
   * 同步筆畫：如果新的陣列只是在後面多了筆畫，就只畫新增的；
   * 否則（Undo、清除、換題）整個重畫。
   */
  syncStrokes(strokes: readonly DrawingStroke[]): void {
    const prev = this.drawnIds
    const isAppend = strokes.length >= prev.length && prev.every((id, i) => strokes[i]?.id === id)
    this.strokes = strokes
    if (!this.paint) return
    if (isAppend) {
      const ctx = getCtx(this.paint)
      for (let i = prev.length; i < strokes.length; i++) drawStroke(ctx, strokes[i], this.k)
      this.drawnIds = strokes.map((s) => s.id)
    } else {
      this.rebuildPaint()
    }
  }

  /** 合成到螢幕上的 canvas（整張學習單尺寸，同像素大小） */
  compose(target: Ctx2D, active: DrawingStroke | null = null): void {
    target.save()
    target.setTransform(1, 0, 0, 1, 0, 0)
    target.globalCompositeOperation = 'source-over'
    target.clearRect(0, 0, this.width, this.height)
    if (!this.paint || !this.mask || !this.ring || !this.scratch || !this.layout) {
      target.restore()
      return
    }
    const s = getCtx(this.scratch)
    s.save()
    s.setTransform(1, 0, 0, 1, 0, 0)
    s.globalCompositeOperation = 'source-over'
    s.clearRect(0, 0, this.width, this.height)
    s.drawImage(this.paint, 0, 0)
    s.restore()
    if (active) drawStroke(s, active, this.k)
    s.save()
    s.setTransform(1, 0, 0, 1, 0, 0)
    s.globalCompositeOperation = 'destination-in'
    s.drawImage(this.mask, 0, 0)
    s.restore()

    target.drawImage(this.scratch, 0, 0)
    target.drawImage(this.ring, 0, 0)
    target.restore()
  }

  private rebuildGlyphLayers(): void {
    if (!this.mask || !this.ring) return
    for (const canvas of [this.mask, this.ring]) {
      const ctx = getCtx(canvas)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, this.width, this.height)
    }
    if (!this.layout) return
    const m = getCtx(this.mask)
    m.save()
    m.setTransform(this.k, 0, 0, this.k, 0, 0)
    drawGlyphMask(m, this.layout)
    m.restore()
    const r = getCtx(this.ring)
    r.save()
    r.setTransform(this.k, 0, 0, this.k, 0, 0)
    drawGlyphRing(r, this.layout)
    r.restore()
  }

  private rebuildPaint(): void {
    if (!this.paint) return
    const ctx = getCtx(this.paint)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.restore()
    for (const stroke of this.strokes) drawStroke(ctx, stroke, this.k)
    this.drawnIds = this.strokes.map((s) => s.id)
  }
}
