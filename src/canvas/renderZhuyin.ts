/** 注音繪製：實心小字（圓圈、標題）與泡泡大字（中央塗色區） */
import { FONT_STACK, INK } from './layout'
import { getUnitPolylines, mapPolylinesToBox, type Box, type GlyphLayout, type Polyline } from './glyphGeometry'
import type { Ctx2D } from './renderDecorations'

export function strokePolylines(ctx: Ctx2D, polylines: Polyline[], width: number, color: string): void {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (const line of polylines) {
    if (line.length === 0) continue
    ctx.moveTo(line[0].x, line[0].y)
    if (line.length === 1) ctx.lineTo(line[0].x + 0.01, line[0].y)
    for (let i = 1; i < line.length; i++) ctx.lineTo(line[i].x, line[i].y)
  }
  ctx.stroke()
  ctx.restore()
}

/**
 * 實心注音：box 為 0–100 單位方塊對應的位置；unitLineWidth 為單位座標中的線寬。
 * 沒有骨架的符號（未來擴充用）退回系統字型。
 */
export function drawSolidGlyph(ctx: Ctx2D, symbol: string, box: Box, unitLineWidth = 11, color = INK): void {
  const unit = getUnitPolylines(symbol)
  if (unit) {
    strokePolylines(ctx, mapPolylinesToBox(unit, box), (unitLineWidth * box.size) / 100, color)
    return
  }
  ctx.save()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${Math.round(box.size * 0.9)}px ${FONT_STACK}`
  ctx.fillText(symbol, box.x + box.size / 2, box.y + box.size / 2)
  ctx.restore()
}

/** 泡泡字黑框（只有外框環，內部透明） */
export function drawGlyphRing(ctx: Ctx2D, layout: GlyphLayout): void {
  strokePolylines(ctx, layout.polylines, layout.outerWidth, INK)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  strokePolylines(ctx, layout.polylines, layout.innerWidth, '#000')
  ctx.restore()
}

/** 遮罩：可塗色區（不透明處 = 可顯示顏色） */
export function drawGlyphMask(ctx: Ctx2D, layout: GlyphLayout): void {
  strokePolylines(ctx, layout.polylines, layout.maskWidth, '#000')
}
