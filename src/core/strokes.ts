import type { BrushSettings, DrawingPoint, DrawingStroke } from '../types/worksheet'

/** 橡皮擦比畫筆粗一些，幼兒比較好擦 */
export const ERASER_WIDTH_FACTOR = 1.5

export const BRUSH_COLORS = [
  { name: '粉紅', value: '#FF8FB1' },
  { name: '黃色', value: '#FFD23F' },
  { name: '天空藍', value: '#5EC2FF' },
  { name: '薄荷綠', value: '#62D6A4' },
  { name: '紫色', value: '#A98BFF' },
  { name: '橘色', value: '#FF9F4A' },
] as const

export const BRUSH_WIDTHS = [
  { name: '細', value: 14 },
  { name: '中', value: 26 },
  { name: '粗', value: 42 },
] as const

export const DEFAULT_BRUSH: BrushSettings = {
  color: BRUSH_COLORS[0].value,
  width: BRUSH_WIDTHS[1].value,
  tool: 'brush',
}

let counter = 0
export function createStrokeId(): string {
  counter = (counter + 1) % 1_000_000
  return `s${Date.now().toString(36)}${counter.toString(36)}`
}

export function createStroke(brush: BrushSettings, start: DrawingPoint): DrawingStroke {
  return {
    id: createStrokeId(),
    color: brush.color,
    width: brush.tool === 'eraser' ? Math.round(brush.width * ERASER_WIDTH_FACTOR) : brush.width,
    tool: brush.tool,
    points: [{ x: start.x, y: start.y }],
  }
}

/** 加入一點；與上一點太近時略過，減少資料量。回傳是否真的加入 */
export function appendPoint(stroke: DrawingStroke, p: DrawingPoint, minDistance = 1.5): boolean {
  const last = stroke.points[stroke.points.length - 1]
  if (last && Math.hypot(p.x - last.x, p.y - last.y) < minDistance) return false
  stroke.points.push({ x: p.x, y: p.y })
  return true
}

/** 儲存前四捨五入到 0.1 邏輯單位，大幅縮小 localStorage 體積 */
export function roundStroke(stroke: DrawingStroke, decimals = 1): DrawingStroke {
  const f = 10 ** decimals
  return {
    ...stroke,
    points: stroke.points.map((p) => ({ x: Math.round(p.x * f) / f, y: Math.round(p.y * f) / f })),
  }
}

export function isValidStroke(value: unknown): value is DrawingStroke {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<DrawingStroke>
  return (
    typeof s.id === 'string' &&
    typeof s.color === 'string' &&
    typeof s.width === 'number' &&
    Number.isFinite(s.width) &&
    s.width > 0 &&
    (s.tool === 'brush' || s.tool === 'eraser') &&
    Array.isArray(s.points) &&
    s.points.length > 0 &&
    s.points.every(
      (p) => p && typeof p === 'object' && Number.isFinite((p as DrawingPoint).x) && Number.isFinite((p as DrawingPoint).y),
    )
  )
}
