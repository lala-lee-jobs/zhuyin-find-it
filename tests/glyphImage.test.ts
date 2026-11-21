import { describe, expect, it } from 'vitest'
import {
  isPointInGlyphImage,
  opaqueBounds,
  placeGlyphImage,
  removeWhite,
  type PlacedGlyphImage,
  type ProcessedGlyphImage,
} from '../src/canvas/glyphImage'
import { CIRCLE_SLOTS, CIRCLE_JITTER, CIRCLE_RADIUS, GLYPH_IMAGE_AREA } from '../src/canvas/layout'

const px = (...rgba: number[]) => new Uint8ClampedArray(rgba)

describe('中央注音圖片：去白', () => {
  it('白色變透明、黑色維持不透明黑', () => {
    expect([...removeWhite(px(255, 255, 255, 255))]).toEqual([0, 0, 0, 0])
    expect([...removeWhite(px(0, 0, 0, 255))]).toEqual([0, 0, 0, 255])
  })

  it('灰色反鋸齒邊 → 半透明黑（疊在白底上和原圖一樣）', () => {
    const [r, g, b, a] = removeWhite(px(128, 128, 128, 255))
    expect(Math.max(r, g, b)).toBeLessThanOrEqual(2)
    expect(a).toBeGreaterThan(120)
    expect(a).toBeLessThan(135)
  })

  it('黃色起點圓圈保留原色', () => {
    expect([...removeWhite(px(255, 190, 0, 255))]).toEqual([255, 190, 0, 255])
  })

  it('原本就透明的像素維持透明', () => {
    expect([...removeWhite(px(0, 0, 0, 0))]).toEqual([0, 0, 0, 0])
  })
})

describe('中央注音圖片：位置與點擊判定', () => {
  // 10 × 10 的圖，中間 (2..7, 1..8) 不透明
  const W = 10
  const H = 10
  const alpha = new Uint8ClampedArray(W * H * 4)
  for (let y = 1; y <= 8; y++) for (let x = 2; x <= 7; x++) alpha[(y * W + x) * 4 + 3] = 255

  it('找出不透明範圍', () => {
    expect(opaqueBounds(alpha, W, H)).toEqual({ x: 2, y: 1, w: 6, h: 8 })
    expect(opaqueBounds(new Uint8ClampedArray(16), 2, 2)).toBeNull()
  })

  it('不透明範圍等比例縮放後置中在可用範圍', () => {
    const bounds = { x: 2, y: 1, w: 6, h: 8 }
    const rect = placeGlyphImage(bounds, W, H, GLYPH_IMAGE_AREA)
    const s = rect.w / W
    expect(rect.h / H).toBeCloseTo(s)
    expect(rect.x + (bounds.x + bounds.w / 2) * s).toBeCloseTo(GLYPH_IMAGE_AREA.cx)
    expect(rect.y + (bounds.y + bounds.h / 2) * s).toBeCloseTo(GLYPH_IMAGE_AREA.cy)
    expect(bounds.w * s).toBeLessThanOrEqual(GLYPH_IMAGE_AREA.maxW + 0.001)
    expect(bounds.h * s).toBeLessThanOrEqual(GLYPH_IMAGE_AREA.maxH + 0.001)
  })

  it('可用範圍不會碰到任何圓圈（含微調）', () => {
    const a = GLYPH_IMAGE_AREA
    const left = a.cx - a.maxW / 2
    const right = a.cx + a.maxW / 2
    const top = a.cy - a.maxH / 2
    const bottom = a.cy + a.maxH / 2
    for (const slot of CIRCLE_SLOTS) {
      // 圓心到矩形的最近距離要大於半徑＋微調
      const dx = Math.max(left - slot.x, 0, slot.x - right)
      const dy = Math.max(top - slot.y, 0, slot.y - bottom)
      expect(Math.hypot(dx, dy)).toBeGreaterThan(CIRCLE_RADIUS + CIRCLE_JITTER)
    }
  })

  it('點在不透明區才算點在字上；容錯範圍內也算', () => {
    const image = { width: W, height: H, alpha, bounds: { x: 2, y: 1, w: 6, h: 8 } } as ProcessedGlyphImage
    const placed: PlacedGlyphImage = { image, rect: { x: 0, y: 0, w: 100, h: 100 } }
    expect(isPointInGlyphImage({ x: 50, y: 50 }, placed)).toBe(true)
    expect(isPointInGlyphImage({ x: 5, y: 50 }, placed)).toBe(false)
    expect(isPointInGlyphImage({ x: 15, y: 50 }, placed)).toBe(false)
    expect(isPointInGlyphImage({ x: 15, y: 50 }, placed, 6)).toBe(true)
  })
})
