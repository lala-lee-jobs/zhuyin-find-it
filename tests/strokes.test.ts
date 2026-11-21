import { describe, expect, it } from 'vitest'
import { DEFAULT_BRUSH, ERASER_WIDTH_FACTOR, appendPoint, createStroke, isValidStroke, roundStroke } from '../src/core/strokes'

describe('筆畫向量資料', () => {
  it('建立畫筆與橡皮擦筆畫', () => {
    const s = createStroke(DEFAULT_BRUSH, { x: 1, y: 2 })
    expect(s.tool).toBe('brush')
    expect(s.points).toEqual([{ x: 1, y: 2 }])
    const e = createStroke({ ...DEFAULT_BRUSH, tool: 'eraser' }, { x: 1, y: 2 })
    expect(e.width).toBe(Math.round(DEFAULT_BRUSH.width * ERASER_WIDTH_FACTOR))
    expect(e.id).not.toBe(s.id)
  })

  it('連續筆畫：太近的點會略過', () => {
    const s = createStroke(DEFAULT_BRUSH, { x: 0, y: 0 })
    expect(appendPoint(s, { x: 0.5, y: 0 })).toBe(false)
    expect(appendPoint(s, { x: 5, y: 0 })).toBe(true)
    expect(s.points).toHaveLength(2)
  })

  it('四捨五入縮小儲存量，驗證函式可判斷資料是否合法', () => {
    const s = roundStroke({ ...createStroke(DEFAULT_BRUSH, { x: 1.23456, y: 9.87654 }) })
    expect(s.points[0]).toEqual({ x: 1.2, y: 9.9 })
    expect(isValidStroke(s)).toBe(true)
    expect(isValidStroke({ ...s, points: [] })).toBe(false)
    expect(isValidStroke({ ...s, tool: 'laser' })).toBe(false)
  })
})
