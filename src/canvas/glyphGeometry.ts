import type { DrawingPoint } from '../types/worksheet'
import { GLYPH_SKELETONS } from '../data/zhuyinGlyphs'
import { GLYPH_STYLE } from './layout'

export type Polyline = DrawingPoint[]

export interface Box {
  x: number
  y: number
  size: number
}

export interface GlyphLayout {
  symbol: string
  /** 邏輯座標中的骨架折線 */
  polylines: Polyline[]
  /** 含黑框的總寬 */
  outerWidth: number
  /** 可塗色區寬度 */
  innerWidth: number
  /** 遮罩寬度（略寬於 innerWidth，顏色藏在黑框下） */
  maskWidth: number
}

/** 解析只含 M / L / Q 的絕對座標路徑，二次曲線以折線近似 */
export function parseSkeletonPath(d: string, curveSegments = 14): Polyline[] {
  const polylines: Polyline[] = []
  let current: Polyline | null = null
  let cursor: DrawingPoint = { x: 0, y: 0 }
  const re = /([MLQ])([^MLQ]*)/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(d)) !== null) {
    const cmd = match[1].toUpperCase()
    const nums = (match[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number)
    if (cmd === 'M') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const p = { x: nums[i], y: nums[i + 1] }
        if (i === 0) {
          current = [p]
          polylines.push(current)
        } else {
          current?.push(p)
        }
        cursor = p
      }
    } else if (cmd === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const p = { x: nums[i], y: nums[i + 1] }
        if (!current) {
          current = [cursor]
          polylines.push(current)
        }
        current.push(p)
        cursor = p
      }
    } else if (cmd === 'Q') {
      for (let i = 0; i + 3 < nums.length; i += 4) {
        const c = { x: nums[i], y: nums[i + 1] }
        const end = { x: nums[i + 2], y: nums[i + 3] }
        if (!current) {
          current = [cursor]
          polylines.push(current)
        }
        const start = cursor
        for (let s = 1; s <= curveSegments; s++) {
          const t = s / curveSegments
          const mt = 1 - t
          current.push({
            x: mt * mt * start.x + 2 * mt * t * c.x + t * t * end.x,
            y: mt * mt * start.y + 2 * mt * t * c.y + t * t * end.y,
          })
        }
        cursor = end
      }
    }
  }
  return polylines
}

const unitCache = new Map<string, Polyline[] | null>()

/** 取得符號在 0–100 單位座標中的骨架折線（有快取）；沒有骨架則回傳 null */
export function getUnitPolylines(symbol: string): Polyline[] | null {
  if (unitCache.has(symbol)) return unitCache.get(symbol) ?? null
  const paths = GLYPH_SKELETONS[symbol]
  const result = paths ? paths.flatMap((d) => parseSkeletonPath(d)) : null
  unitCache.set(symbol, result)
  return result
}

export function mapPolylinesToBox(polylines: Polyline[], box: Box): Polyline[] {
  const s = box.size / 100
  return polylines.map((line) => line.map((p) => ({ x: box.x + p.x * s, y: box.y + p.y * s })))
}

export function layoutGlyph(
  symbol: string,
  box: Box,
  style: { outerWidth: number; ringWidth: number; maskBleed: number } = GLYPH_STYLE,
): GlyphLayout | null {
  const unit = getUnitPolylines(symbol)
  if (!unit) return null
  const innerWidth = style.outerWidth - style.ringWidth * 2
  return {
    symbol,
    polylines: mapPolylinesToBox(unit, box),
    outerWidth: style.outerWidth,
    innerWidth,
    maskWidth: innerWidth + style.maskBleed,
  }
}

export function distanceToSegment(p: DrawingPoint, a: DrawingPoint, b: DrawingPoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * dx
  const cy = a.y + t * dy
  return Math.hypot(p.x - cx, p.y - cy)
}

export function distanceToPolylines(p: DrawingPoint, polylines: Polyline[]): number {
  let best = Infinity
  for (const line of polylines) {
    if (line.length === 1) {
      best = Math.min(best, Math.hypot(p.x - line[0].x, p.y - line[0].y))
      continue
    }
    for (let i = 1; i < line.length; i++) {
      best = Math.min(best, distanceToSegment(p, line[i - 1], line[i]))
    }
  }
  return best
}

/**
 * 判斷點是否落在中央注音（含黑框）上。
 * 與 Canvas 圓頭粗線條的幾何完全一致：到骨架距離 ≤ 線寬一半。
 */
export function isPointInGlyph(p: DrawingPoint, layout: GlyphLayout, extra = 0): boolean {
  return distanceToPolylines(p, layout.polylines) <= layout.outerWidth / 2 + extra
}

/** 判斷點是否在「可塗色」區（遮罩內） */
export function isPointInPaintableArea(p: DrawingPoint, layout: GlyphLayout): boolean {
  return distanceToPolylines(p, layout.polylines) <= layout.maskWidth / 2
}

/** 骨架外接矩形（含線寬） */
export function glyphBounds(layout: GlyphLayout): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const line of layout.polylines) {
    for (const p of line) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  const h = layout.outerWidth / 2
  return { minX: minX - h, minY: minY - h, maxX: maxX + h, maxY: maxY + h }
}
