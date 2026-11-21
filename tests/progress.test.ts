import { describe, expect, it } from 'vitest'
import { WORKSHEETS, findWorksheet } from '../src/data/worksheets'
import {
  addStroke,
  clearDrawing,
  createEmptyProgress,
  evaluateTap,
  getCorrectCircleIds,
  markCircleFound,
  normalizeProgress,
  resetRecognition,
  restartWorksheet,
  undoLastStroke,
} from '../src/core/progress'
import type { DrawingStroke } from '../src/types/worksheet'

const ws = findWorksheet('zhuyin-l')!
const stroke = (id: string): DrawingStroke => ({
  id,
  color: '#FF8FB1',
  width: 20,
  tool: 'brush',
  points: [{ x: 400, y: 700 }],
})

describe('19.1 注音辨識', () => {
  const correctIds = getCorrectCircleIds(ws)
  const wrongId = ws.circles.find((c) => c.symbol !== ws.targetSymbol)!.id

  it('正確答案可以計分', () => {
    const p = createEmptyProgress(ws)
    expect(evaluateTap(ws, p, correctIds[0])).toBe('correct')
    const r = markCircleFound(ws, p, correctIds[0])
    expect(r.scored).toBe(true)
    expect(r.progress.foundCircleIds).toEqual([correctIds[0]])
  })

  it('錯誤答案不計分', () => {
    const p = createEmptyProgress(ws)
    expect(evaluateTap(ws, p, wrongId)).toBe('wrong')
    const r = markCircleFound(ws, p, wrongId)
    expect(r.scored).toBe(false)
    expect(r.progress.foundCircleIds).toHaveLength(0)
  })

  it('重複點擊不重複計分', () => {
    let p = markCircleFound(ws, createEmptyProgress(ws), correctIds[0]).progress
    expect(evaluateTap(ws, p, correctIds[0])).toBe('already')
    const r = markCircleFound(ws, p, correctIds[0])
    expect(r.scored).toBe(false)
    p = r.progress
    expect(p.foundCircleIds).toHaveLength(1)
  })

  it('所有正確注音找到後觸發完成（只觸發一次）', () => {
    let p = createEmptyProgress(ws)
    let completedCount = 0
    for (const id of correctIds) {
      const r = markCircleFound(ws, p, id)
      if (r.completedNow) completedCount++
      p = r.progress
    }
    expect(p.recognitionCompleted).toBe(true)
    expect(completedCount).toBe(1)
    expect(p.foundCircleIds).toHaveLength(p.totalCorrectCircles)
  })

  it('切換題目後載入正確資料（每題進度互不影響）', () => {
    const other = findWorksheet('zhuyin-f')!
    const pl = markCircleFound(ws, createEmptyProgress(ws), correctIds[0]).progress
    const pf = createEmptyProgress(other)
    expect(pf.worksheetId).toBe('zhuyin-f')
    expect(pf.foundCircleIds).toHaveLength(0)
    // 用 ㄌ 的圓圈 id 在 ㄈ 題目上不會計分
    expect(evaluateTap(other, pf, correctIds[0])).toBe('wrong')
    expect(pl.foundCircleIds).toHaveLength(1)
  })

  it('normalizeProgress 會移除不存在或錯誤的圓圈 id', () => {
    const p = {
      ...createEmptyProgress(ws),
      foundCircleIds: [correctIds[0], 'ghost', correctIds[0], ws.circles.find((c) => c.symbol !== 'ㄌ')!.id],
    }
    const n = normalizeProgress(ws, p)
    expect(n.foundCircleIds).toEqual([correctIds[0]])
    expect(normalizeProgress(ws, undefined).foundCircleIds).toEqual([])
  })
})

describe('19.4 進度', () => {
  const correctIds = getCorrectCircleIds(ws)

  it('塗色與找注音進度獨立', () => {
    let p = createEmptyProgress(ws)
    p = addStroke(p, stroke('a'))
    expect(p.foundCircleIds).toHaveLength(0)
    p = markCircleFound(ws, p, correctIds[0]).progress
    expect(p.drawingStrokes).toHaveLength(1)
  })

  it('找完注音後仍可塗色', () => {
    let p = createEmptyProgress(ws)
    for (const id of correctIds) p = markCircleFound(ws, p, id).progress
    expect(p.recognitionCompleted).toBe(true)
    p = addStroke(p, stroke('after'))
    expect(p.drawingStrokes.map((s) => s.id)).toEqual(['after'])
    expect(p.recognitionCompleted).toBe(true)
  })

  it('清除塗色不影響答題進度', () => {
    let p = markCircleFound(ws, createEmptyProgress(ws), correctIds[0]).progress
    p = addStroke(p, stroke('a'))
    p = clearDrawing(p)
    expect(p.drawingStrokes).toHaveLength(0)
    expect(p.drawingModified).toBe(false)
    expect(p.foundCircleIds).toEqual([correctIds[0]])
  })

  it('再玩一次只重設找注音、保留塗色', () => {
    let p = addStroke(createEmptyProgress(ws), stroke('keep'))
    for (const id of correctIds) p = markCircleFound(ws, p, id).progress
    p = resetRecognition(ws, p)
    expect(p.foundCircleIds).toHaveLength(0)
    expect(p.recognitionCompleted).toBe(false)
    expect(p.drawingStrokes.map((s) => s.id)).toEqual(['keep'])
  })

  it('重新開始本題正確清除兩種進度', () => {
    let p = addStroke(createEmptyProgress(ws), stroke('x'))
    p = markCircleFound(ws, p, correctIds[0]).progress
    p = restartWorksheet(ws)
    expect(p.foundCircleIds).toHaveLength(0)
    expect(p.drawingStrokes).toHaveLength(0)
    expect(p.recognitionCompleted).toBe(false)
  })

  it('Undo 移除最後一筆', () => {
    let p = createEmptyProgress(ws)
    p = addStroke(addStroke(p, stroke('1')), stroke('2'))
    p = undoLastStroke(p)
    expect(p.drawingStrokes.map((s) => s.id)).toEqual(['1'])
    p = undoLastStroke(undoLastStroke(p))
    expect(p.drawingStrokes).toHaveLength(0)
  })

  it('每一題都有正確數量的目標注音', () => {
    for (const w of WORKSHEETS) {
      expect(createEmptyProgress(w).totalCorrectCircles).toBe(getCorrectCircleIds(w).length)
    }
  })
})
