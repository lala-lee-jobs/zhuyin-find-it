import { describe, expect, it } from 'vitest'
import {
  CIRCLE_JITTER,
  CIRCLE_RADIUS,
  EDGE_MARGIN,
  LANDSCAPE_LAYOUT,
  NARROW_LAYOUT,
  PORTRAIT_LAYOUT,
  SHEET_LAYOUTS,
  chooseLayout,
  layoutScale,
} from '../src/canvas/layout'
import { WORKSHEETS, placeCircles } from '../src/data/worksheets'
import { strokeTransformBetween } from '../src/canvas/glyphImage'
import { isPointInGlyph, layoutGlyph } from '../src/canvas/glyphGeometry'

const layouts = Object.values(SHEET_LAYOUTS)
const R = CIRCLE_RADIUS + CIRCLE_JITTER

describe.each(layouts.map((l) => [l.id, l] as const))('版面 %s', (_id, layout) => {
  it('圓圈（含微調）都在紙張與圓圈區內，彼此不重疊', () => {
    for (const s of layout.slots) {
      expect(s.x - R).toBeGreaterThanOrEqual(EDGE_MARGIN)
      expect(s.x + R).toBeLessThanOrEqual(layout.width - EDGE_MARGIN)
      expect(s.y - R).toBeGreaterThanOrEqual(layout.board.top)
      expect(s.y + R).toBeLessThanOrEqual(layout.board.bottom)
    }
    for (let i = 0; i < layout.slots.length; i++) {
      for (let j = i + 1; j < layout.slots.length; j++) {
        const a = layout.slots[i]
        const b = layout.slots[j]
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(2 * R + 4)
      }
    }
  })

  it('大注音的圖片範圍不碰到圓圈', () => {
    const a = layout.glyphImageArea
    const rect = { l: a.cx - a.maxW / 2, r: a.cx + a.maxW / 2, t: a.cy - a.maxH / 2, b: a.cy + a.maxH / 2 }
    for (const s of layout.slots) {
      const dx = Math.max(rect.l - s.x, 0, s.x - rect.r)
      const dy = Math.max(rect.t - s.y, 0, s.y - rect.b)
      expect(Math.hypot(dx, dy)).toBeGreaterThan(R)
    }
  })

  it('每一題的泡泡字（沒有圖片時）不碰到這個版面的圓圈', () => {
    for (const ws of WORKSHEETS) {
      const l = layoutGlyph(ws.targetSymbol, layout.glyphBox)!
      for (const c of placeCircles(ws, layout)) {
        expect(isPointInGlyph({ x: c.x, y: c.y }, l, c.radius)).toBe(false)
      }
    }
  })

  it('標題、喇叭、進度都在紙張上方、不互相重疊，也不碰到圓圈', () => {
    const { header: h, progress: p } = layout
    const speakerRight = h.speaker.x + h.speaker.size / 2
    expect(h.speaker.x - h.speaker.size / 2).toBeGreaterThan(h.titleLeftX + h.titleFontSize * 3 + h.titleGlyphSize)
    expect(p.x).toBeGreaterThan(speakerRight)
    expect(p.x + p.w).toBeLessThanOrEqual(layout.width)
    expect(p.y + p.h).toBeLessThanOrEqual(layout.board.top)
    expect(h.speaker.y + h.speaker.size / 2).toBeLessThanOrEqual(layout.board.top)
  })

  it('每一題：正確的圓圈全部都在、數量剛好填滿、四個區域都有正確答案', () => {
    for (const ws of WORKSHEETS) {
      const placed = placeCircles(ws, layout)
      expect(placed).toHaveLength(layout.slots.length)
      expect(new Set(placed.map((c) => c.id)).size).toBe(placed.length)
      const correctIds = ws.circles.filter((c) => c.symbol === ws.targetSymbol).map((c) => c.id)
      const placedIds = new Set(placed.map((c) => c.id))
      for (const id of correctIds) expect(placedIds.has(id)).toBe(true)
      // 同一題、同一版面結果相同
      expect(placeCircles(ws, layout)).toEqual(placed)
    }
  })
})

describe('選擇版面', () => {
  it('平板直向用直式，平板橫向用橫式（圓圈比較大），手機直向用窄版', () => {
    expect(chooseLayout(804, 1050, false)).toBe(PORTRAIT_LAYOUT) // iPad 直向
    expect(chooseLayout(1070, 740, false)).toBe(LANDSCAPE_LAYOUT) // iPad 橫向
    expect(chooseLayout(374, 620, true)).toBe(NARROW_LAYOUT) // 手機直向
    expect(chooseLayout(740, 320, true)).toBe(LANDSCAPE_LAYOUT) // 手機橫向
  })

  it('平板橫向、手機直向的圓圈在螢幕上明顯比直式版面大', () => {
    const tabletLandscape = layoutScale(LANDSCAPE_LAYOUT, 1070, 740) / layoutScale(PORTRAIT_LAYOUT, 1070, 740)
    const phonePortrait = layoutScale(NARROW_LAYOUT, 374, 620) / layoutScale(PORTRAIT_LAYOUT, 374, 620)
    expect(tabletLandscape).toBeGreaterThan(1.3)
    expect(phonePortrait).toBeGreaterThan(1.25)
  })
})

describe('換版面時塗色跟著大注音', () => {
  it('直式 → 直式：不變', () => {
    expect(strokeTransformBetween(null, PORTRAIT_LAYOUT, PORTRAIT_LAYOUT)).toEqual({ a: 1, tx: 0, ty: 0 })
  })

  it('泡泡字：方塊左上角與右下角對齊', () => {
    for (const to of layouts) {
      const xf = strokeTransformBetween(null, PORTRAIT_LAYOUT, to)
      const g0 = PORTRAIT_LAYOUT.glyphBox
      expect(g0.x * xf.a + xf.tx).toBeCloseTo(to.glyphBox.x)
      expect((g0.y + g0.size) * xf.a + xf.ty).toBeCloseTo(to.glyphBox.y + to.glyphBox.size)
    }
  })

  it('圖片：圖片中心點對齊到新版面的中心', () => {
    const image = { width: 100, height: 120, bounds: { x: 10, y: 10, w: 80, h: 100 } }
    for (const to of layouts) {
      const xf = strokeTransformBetween(image, PORTRAIT_LAYOUT, to)
      const c0 = PORTRAIT_LAYOUT.glyphImageArea
      expect(c0.cx * xf.a + xf.tx).toBeCloseTo(to.glyphImageArea.cx)
      expect(c0.cy * xf.a + xf.ty).toBeCloseTo(to.glyphImageArea.cy)
    }
  })
})
