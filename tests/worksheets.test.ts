import { describe, expect, it } from 'vitest'
import { WORKSHEETS, WORKSHEET_SEEDS, buildWorksheet } from '../src/data/worksheets'
import { REGIONS, WORKSHEET_WIDTH, BORDER_INSET } from '../src/canvas/layout'
import { hasGlyphSkeleton } from '../src/data/zhuyinGlyphs'
import { ZHUYIN_AUDIO } from '../src/data/zhuyinAudioMap'

describe('題庫資料', () => {
  it('題庫有十三個注音：ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑ', () => {
    expect(WORKSHEETS.map((w) => w.targetSymbol).join('')).toBe('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑ')
    expect(new Set(WORKSHEETS.map((w) => w.id)).size).toBe(13)
  })

  it.each(WORKSHEETS.map((w) => [w.title, w] as const))('%s：40 個圓圈、8–10 個正確', (_title, ws) => {
    expect(ws.circles.length).toBe(40)
    const correct = ws.circles.filter((c) => c.symbol === ws.targetSymbol).length
    expect(correct).toBeGreaterThanOrEqual(8)
    expect(correct).toBeLessThanOrEqual(10)
    expect(ws.illustrations).toHaveLength(4)
    expect(ws.audioUrl).toBe(ZHUYIN_AUDIO[ws.targetSymbol])
  })

  it('圓圈不重疊、在學習單內、不遮住插畫區與底部', () => {
    for (const ws of WORKSHEETS) {
      for (const c of ws.circles) {
        expect(c.y - c.radius).toBeGreaterThanOrEqual(REGIONS.board.top)
        expect(c.y + c.radius).toBeLessThanOrEqual(REGIONS.board.bottom)
        expect(c.x - c.radius).toBeGreaterThan(BORDER_INSET)
        expect(c.x + c.radius).toBeLessThan(WORKSHEET_WIDTH - BORDER_INSET)
        expect(c.radius).toBeGreaterThanOrEqual(40) // 觸控面積
      }
      for (let i = 0; i < ws.circles.length; i++) {
        for (let j = i + 1; j < ws.circles.length; j++) {
          const a = ws.circles[i]
          const b = ws.circles[j]
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.radius + b.radius + 4)
        }
      }
    }
  })

  it('同一題重新產生，圓圈位置與注音完全相同', () => {
    for (const seed of WORKSHEET_SEEDS) {
      expect(buildWorksheet(seed)).toEqual(buildWorksheet(seed))
    }
  })

  it('不同題目的圓圈配置不同', () => {
    const layouts = WORKSHEETS.map((w) => w.circles.map((c) => `${c.x},${c.y}`).join('|'))
    expect(new Set(layouts).size).toBe(WORKSHEETS.length)
  })

  it('所有用到的注音都有骨架字形', () => {
    for (const ws of WORKSHEETS) for (const c of ws.circles) expect(hasGlyphSkeleton(c.symbol)).toBe(true)
  })

  it('圓圈 id 全域唯一，答對填色已設定', () => {
    const ids = WORKSHEETS.flatMap((w) => w.circles.map((c) => c.id))
    expect(new Set(ids).size).toBe(ids.length)
    for (const ws of WORKSHEETS) for (const c of ws.circles) expect(c.fillColor).toMatch(/^#[0-9A-F]{6}$/i)
  })
})
