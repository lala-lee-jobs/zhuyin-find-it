import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, STORAGE_VERSION, StorageService, createDefaultState, type StorageLike } from '../src/services/StorageService'
import type { PersistedState } from '../src/types/worksheet'

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

function sample(): PersistedState {
  return {
    version: STORAGE_VERSION,
    lastWorksheetId: 'zhuyin-l',
    brush: { color: '#5EC2FF', width: 42, tool: 'eraser' },
    muted: true,
    epaper: true,
    brushSound: true,
    unlockedUntilId: 'zhuyin-g',
    breakMinutes: 15,
    progress: {
      'zhuyin-l': {
        worksheetId: 'zhuyin-l',
        foundCircleIds: ['zhuyin-l-c01'],
        totalCorrectCircles: 7,
        recognitionCompleted: false,
        drawingStrokes: [
          { id: 's1', color: '#FF8FB1', width: 26, tool: 'brush', points: [{ x: 300.123456, y: 600.98765 }] },
        ],
        drawingModified: true,
      },
    },
  }
}

describe('19.4 重新整理後進度恢復（localStorage）', () => {
  it('儲存後可完整讀回：題目、筆畫、畫筆、靜音、答題', () => {
    const mem = new MemoryStorage()
    new StorageService(mem).save(sample())
    const loaded = new StorageService(mem).load()
    expect(loaded.lastWorksheetId).toBe('zhuyin-l')
    expect(loaded.brush).toEqual({ color: '#5EC2FF', width: 42, tool: 'eraser' })
    expect(loaded.muted).toBe(true)
    expect(loaded.epaper).toBe(true)
    expect(loaded.brushSound).toBe(true)
    expect(loaded.unlockedUntilId).toBe('zhuyin-g')
    expect(loaded.breakMinutes).toBe(15)
    expect(loaded.progress['zhuyin-l'].foundCircleIds).toEqual(['zhuyin-l-c01'])
    expect(loaded.progress['zhuyin-l'].drawingStrokes[0].points[0]).toEqual({ x: 300.1, y: 601 })
  })

  it('舊存檔沒有電子紙欄位時，預設為一般模式', () => {
    const mem = new MemoryStorage()
    const { epaper: _omit, ...old } = sample()
    mem.setItem(STORAGE_KEY, JSON.stringify(old))
    const loaded = new StorageService(mem).load()
    expect(loaded.epaper).toBe(false)
    expect(loaded.muted).toBe(true)
  })

  it('筆刷音效預設關閉；舊存檔沒有這個欄位時也是關閉', () => {
    expect(createDefaultState().brushSound).toBe(false)
    const mem = new MemoryStorage()
    const { brushSound: _omit, ...old } = sample()
    mem.setItem(STORAGE_KEY, JSON.stringify(old))
    expect(new StorageService(mem).load().brushSound).toBe(false)
  })

  it('儲存的是向量資料與版本號，不含 Base64 圖片', () => {
    const mem = new MemoryStorage()
    new StorageService(mem).save(sample())
    const raw = mem.getItem(STORAGE_KEY)!
    expect(raw).not.toMatch(/data:image|base64/)
    expect(JSON.parse(raw).version).toBe(STORAGE_VERSION)
  })

  it('壞掉的 JSON、未知版本、沒有 localStorage 都安全退回預設值', () => {
    const mem = new MemoryStorage()
    mem.setItem(STORAGE_KEY, '{not json')
    expect(new StorageService(mem).load()).toEqual(createDefaultState())
    mem.setItem(STORAGE_KEY, JSON.stringify({ ...sample(), version: 999 }))
    expect(new StorageService(mem).load()).toEqual(createDefaultState())
    expect(new StorageService(null).load()).toEqual(createDefaultState())
    expect(new StorageService(null).save(sample())).toBe(false)
  })

  it('過濾不合法的筆畫與設定', () => {
    const mem = new MemoryStorage()
    const bad = sample() as unknown as Record<string, unknown>
    ;(bad.brush as Record<string, unknown>).width = -5
    ;(bad.progress as Record<string, { drawingStrokes: unknown[] }>)['zhuyin-l'].drawingStrokes.push(
      { id: 'x', tool: 'laser', points: [] },
      { id: 'y', color: '#000', width: 10, tool: 'brush', points: [{ x: NaN, y: 1 }] },
    )
    mem.setItem(STORAGE_KEY, JSON.stringify(bad))
    const loaded = new StorageService(mem).load()
    expect(loaded.brush.width).toBeGreaterThan(0)
    expect(loaded.progress['zhuyin-l'].drawingStrokes).toHaveLength(1)
  })

  it('localStorage 寫入失敗（容量滿）不會丟出例外', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => undefined,
    }
    expect(new StorageService(failing).save(sample())).toBe(false)
  })
})
