/**
 * 中央注音自由塗色：管理「正在畫的一筆」與離屏合成 surface。
 * 指標事件的分流（圓圈 or 畫筆）在 WorksheetCanvas 中處理，這裡只處理畫筆本身。
 */
import { getCurrentScope, onScopeDispose } from 'vue'
import type { BrushSettings, DrawingPoint, DrawingStroke } from '../types/worksheet'
import { appendPoint, createStroke } from '../core/strokes'
import { GlyphPaintSurface, defaultCanvasFactory, type CanvasFactory } from '../canvas/drawingMask'
import type { GlyphLayout } from '../canvas/glyphGeometry'
import type { Ctx2D } from '../canvas/renderDecorations'

export interface UseCanvasDrawingOptions {
  getBrush: () => BrushSettings
  onCommit: (stroke: DrawingStroke) => void
  requestRender: () => void
  canvasFactory?: CanvasFactory
}

export function useCanvasDrawing(options: UseCanvasDrawingOptions) {
  const surface = new GlyphPaintSurface(options.canvasFactory ?? defaultCanvasFactory)
  let active: DrawingStroke | null = null
  let activePointerId: number | null = null

  function isDrawing(pointerId?: number): boolean {
    return active !== null && (pointerId === undefined || pointerId === activePointerId)
  }

  function begin(pointerId: number, p: DrawingPoint): void {
    active = createStroke(options.getBrush(), p)
    activePointerId = pointerId
    options.requestRender()
  }

  function extend(pointerId: number, points: DrawingPoint[]): void {
    if (!active || pointerId !== activePointerId) return
    let changed = false
    for (const p of points) changed = appendPoint(active, p) || changed
    if (changed) options.requestRender()
  }

  /** 結束筆畫（pointerup / pointercancel / lostpointercapture 都會走這裡） */
  function end(pointerId: number): void {
    if (!active || pointerId !== activePointerId) return
    const stroke = active
    active = null
    activePointerId = null
    options.onCommit(stroke)
    options.requestRender()
  }

  /** 換題等情況：直接丟棄未完成的筆畫 */
  function discard(): void {
    active = null
    activePointerId = null
    options.requestRender()
  }

  function configure(width: number, height: number, k: number, layout: GlyphLayout | null): void {
    surface.configure(width, height, k, layout)
  }

  function sync(strokes: readonly DrawingStroke[]): void {
    surface.syncStrokes(strokes)
  }

  function compose(target: Ctx2D): void {
    surface.compose(target, active)
  }

  if (getCurrentScope()) onScopeDispose(discard)

  return { isDrawing, begin, extend, end, discard, configure, sync, compose }
}
