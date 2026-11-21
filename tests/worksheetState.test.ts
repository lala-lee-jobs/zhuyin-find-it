import { describe, expect, it } from 'vitest'
import { useWorksheetState } from '../src/composables/useWorksheetState'
import { StorageService, type StorageLike } from '../src/services/StorageService'
import { getCorrectCircleIds } from '../src/core/progress'
import type { DrawingStroke } from '../src/types/worksheet'

class MemoryStorage implements StorageLike {
  data = new Map<string, string>()
  getItem(k: string) {
    return this.data.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.data.set(k, v)
  }
  removeItem(k: string) {
    this.data.delete(k)
  }
}

const stroke = (id: string): DrawingStroke => ({
  id,
  color: '#FF8FB1',
  width: 26,
  tool: 'brush',
  points: [
    { x: 400, y: 700 },
    { x: 410, y: 720 },
  ],
})

describe('useWorksheetState：題目切換與進度', () => {
  it('第一次開啟顯示「找找看 ㄌ」', () => {
    const s = useWorksheetState({ storage: new StorageService(new MemoryStorage()) })
    expect(s.worksheet.value.targetSymbol).toBe('ㄌ')
  })

  it('找完全部注音後不會自動跳題，仍可繼續塗色', () => {
    const s = useWorksheetState({ storage: new StorageService(new MemoryStorage()) })
    const before = s.currentId.value
    const ids = getCorrectCircleIds(s.worksheet.value)
    let completed = 0
    for (const id of ids) if (s.markFound(id).completed) completed++
    expect(completed).toBe(1)
    expect(s.progress.value.recognitionCompleted).toBe(true)
    expect(s.currentId.value).toBe(before)
    s.addStroke(stroke('after-complete'))
    expect(s.progress.value.drawingStrokes.map((x) => x.id)).toEqual(['after-complete'])
  })

  it('切換題目會儲存並載入各自的進度', () => {
    const s = useWorksheetState({ storage: new StorageService(new MemoryStorage()) })
    s.addStroke(stroke('l1'))
    s.markFound(getCorrectCircleIds(s.worksheet.value)[0])
    s.selectWorksheet('zhuyin-b')
    expect(s.worksheet.value.targetSymbol).toBe('ㄅ')
    expect(s.progress.value.drawingStrokes).toHaveLength(0)
    expect(s.progress.value.foundCircleIds).toHaveLength(0)
    s.selectWorksheet('zhuyin-l')
    expect(s.progress.value.drawingStrokes.map((x) => x.id)).toEqual(['l1'])
    expect(s.progress.value.foundCircleIds).toHaveLength(1)
  })

  it('上一題／下一題', () => {
    const s = useWorksheetState({ storage: new StorageService(new MemoryStorage()) })
    s.selectWorksheet('zhuyin-b')
    expect(s.hasPrev.value).toBe(false)
    s.goNext()
    expect(s.worksheet.value.targetSymbol).toBe('ㄆ')
    s.goPrev()
    expect(s.worksheet.value.targetSymbol).toBe('ㄅ')
    s.selectWorksheet('zhuyin-j')
    s.goNext()
    expect(s.worksheet.value.targetSymbol).toBe('ㄐ') // 最後一個開放的題目不換
    s.goNext(true)
    expect(s.worksheet.value.targetSymbol).toBe('ㄅ') // 完成畫面的「下一個注音」可以回到第一題
  })

  it('預設只開放到 ㄐ：ㄑ 不在題目列、也切換不過去', () => {
    const s = useWorksheetState({ storage: new StorageService(new MemoryStorage()) })
    expect(s.available.value.map((w) => w.targetSymbol).join('')).toBe('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐ')
    s.selectWorksheet('zhuyin-q')
    expect(s.worksheet.value.targetSymbol).toBe('ㄌ')
  })

  it('大人開放到 ㄑ 後可以玩 ㄑ；設定會記住', () => {
    const mem = new MemoryStorage()
    const a = useWorksheetState({ storage: new StorageService(mem) })
    a.setUnlockedUntil('zhuyin-q')
    a.selectWorksheet('zhuyin-q')
    expect(a.worksheet.value.targetSymbol).toBe('ㄑ')
    a.saveNow()
    const b = useWorksheetState({ storage: new StorageService(mem) })
    expect(b.unlockedUntilId.value).toBe('zhuyin-q')
    expect(b.worksheet.value.targetSymbol).toBe('ㄑ')
  })

  it('縮小開放範圍時：目前題目被關閉就跳到最後一個開放的題目，進度保留', () => {
    const mem = new MemoryStorage()
    const s = useWorksheetState({ storage: new StorageService(mem) })
    s.addStroke(stroke('l1'))
    s.setUnlockedUntil('zhuyin-f')
    expect(s.available.value.map((w) => w.targetSymbol).join('')).toBe('ㄅㄆㄇㄈ')
    expect(s.worksheet.value.targetSymbol).toBe('ㄈ')
    expect(s.hasNext.value).toBe(false)
    s.setUnlockedUntil('zhuyin-j')
    s.selectWorksheet('zhuyin-l')
    expect(s.progress.value.drawingStrokes.map((x) => x.id)).toEqual(['l1'])
  })

  it('全部重置：清除所有題目的進度（含未開放），設定保留', () => {
    const mem = new MemoryStorage()
    const s = useWorksheetState({ storage: new StorageService(mem) })
    s.setUnlockedUntil('zhuyin-q')
    s.setEpaper(true)
    s.setMuted(true)
    s.addStroke(stroke('l1'))
    for (const id of getCorrectCircleIds(s.worksheet.value)) s.markFound(id)
    s.selectWorksheet('zhuyin-q')
    s.addStroke(stroke('q1'))
    s.setUnlockedUntil('zhuyin-j') // ㄑ 有進度但目前未開放

    s.resetAllProgress()
    for (const id of Object.keys(s.progressMap)) {
      expect(s.progressMap[id].drawingStrokes).toHaveLength(0)
      expect(s.progressMap[id].foundCircleIds).toHaveLength(0)
      expect(s.progressMap[id].recognitionCompleted).toBe(false)
    }
    expect(s.completedIds.value).toHaveLength(0)
    expect(s.unlockedUntilId.value).toBe('zhuyin-j')
    expect(s.epaper.value).toBe(true)
    expect(s.muted.value).toBe(true)

    // 已存檔：重新開啟也是清空的
    const b = useWorksheetState({ storage: new StorageService(mem) })
    expect(b.progressMap['zhuyin-l'].drawingStrokes).toHaveLength(0)
    expect(b.progressMap['zhuyin-q'].drawingStrokes).toHaveLength(0)
  })

  it('存檔的開放題目不存在時，退回預設（ㄐ）', () => {
    const mem = new MemoryStorage()
    mem.setItem('zhuyin-find-it', JSON.stringify({ version: 1, unlockedUntilId: 'zhuyin-zz', progress: {} }))
    const s = useWorksheetState({ storage: new StorageService(mem) })
    expect(s.unlockedUntilId.value).toBe('zhuyin-j')
  })

  it('重新整理後進度恢復（題目、塗色、答題、畫筆）', () => {
    const mem = new MemoryStorage()
    const a = useWorksheetState({ storage: new StorageService(mem) })
    a.selectWorksheet('zhuyin-f')
    a.addStroke(stroke('f1'))
    a.markFound(getCorrectCircleIds(a.worksheet.value)[0])
    a.setBrush({ color: '#62D6A4', width: 42 })
    a.saveNow()

    const b = useWorksheetState({ storage: new StorageService(mem) })
    expect(b.worksheet.value.targetSymbol).toBe('ㄈ')
    expect(b.progress.value.drawingStrokes.map((x) => x.id)).toEqual(['f1'])
    expect(b.progress.value.foundCircleIds).toHaveLength(1)
    expect(b.brush.color).toBe('#62D6A4')
    expect(b.brush.width).toBe(42)
  })

  it('清除塗色不影響答題；重新開始本題清除兩者', () => {
    const s = useWorksheetState({ storage: new StorageService(new MemoryStorage()) })
    s.addStroke(stroke('x'))
    s.markFound(getCorrectCircleIds(s.worksheet.value)[0])
    s.clearDrawing()
    expect(s.progress.value.drawingStrokes).toHaveLength(0)
    expect(s.progress.value.foundCircleIds).toHaveLength(1)

    s.addStroke(stroke('y'))
    s.restartWorksheet()
    expect(s.progress.value.drawingStrokes).toHaveLength(0)
    expect(s.progress.value.foundCircleIds).toHaveLength(0)
  })

  it('再玩一次：只重設找注音，保留塗色', () => {
    const s = useWorksheetState({ storage: new StorageService(new MemoryStorage()) })
    s.addStroke(stroke('keep'))
    for (const id of getCorrectCircleIds(s.worksheet.value)) s.markFound(id)
    s.replayRecognition()
    expect(s.progress.value.recognitionCompleted).toBe(false)
    expect(s.progress.value.drawingStrokes.map((x) => x.id)).toEqual(['keep'])
  })
})
