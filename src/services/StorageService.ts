/**
 * StorageService：localStorage 進度保存。
 * - 只存向量筆畫資料，不存 Canvas bitmap / Base64。
 * - 有 version 欄位；讀到不認得的版本或壞掉的資料時安全退回預設值。
 * - localStorage 無法使用（無痕模式、容量已滿）時不會丟出例外。
 */
import type { BrushSettings, PersistedState, WorksheetProgress } from '../types/worksheet'
import { DEFAULT_BRUSH, isValidStroke, roundStroke } from '../core/strokes'

export const STORAGE_KEY = 'zhuyin-find-it'
export const STORAGE_VERSION = 1

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createDefaultState(): PersistedState {
  return {
    version: STORAGE_VERSION,
    lastWorksheetId: null,
    brush: { ...DEFAULT_BRUSH },
    muted: false,
    epaper: false,
    brushSound: false,
    progress: {},
  }
}

export function safeLocalStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const probe = '__zhuyin_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

export class StorageService {
  constructor(
    private readonly storage: StorageLike | null,
    private readonly key = STORAGE_KEY,
  ) {}

  load(): PersistedState {
    if (!this.storage) return createDefaultState()
    let raw: string | null
    try {
      raw = this.storage.getItem(this.key)
    } catch {
      return createDefaultState()
    }
    if (!raw) return createDefaultState()
    try {
      return migrate(JSON.parse(raw))
    } catch {
      return createDefaultState()
    }
  }

  save(state: PersistedState): boolean {
    if (!this.storage) return false
    const payload: PersistedState = {
      version: STORAGE_VERSION,
      lastWorksheetId: state.lastWorksheetId,
      brush: { ...state.brush },
      muted: state.muted,
      epaper: state.epaper,
      brushSound: state.brushSound,
      progress: Object.fromEntries(
        Object.entries(state.progress).map(([id, p]) => [
          id,
          { ...p, drawingStrokes: p.drawingStrokes.map((s) => roundStroke(s)) },
        ]),
      ),
    }
    try {
      this.storage.setItem(this.key, JSON.stringify(payload))
      return true
    } catch {
      return false
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key)
    } catch {
      /* ignore */
    }
  }
}

/** 版本遷移：目前只有 v1。未來改格式時在這裡加入轉換 */
export function migrate(raw: unknown): PersistedState {
  if (!raw || typeof raw !== 'object') return createDefaultState()
  const data = raw as Record<string, unknown>
  if (data.version !== STORAGE_VERSION) return createDefaultState()

  const state = createDefaultState()
  state.lastWorksheetId = typeof data.lastWorksheetId === 'string' ? data.lastWorksheetId : null
  state.muted = data.muted === true
  state.epaper = data.epaper === true
  state.brushSound = data.brushSound === true
  state.brush = sanitizeBrush(data.brush)

  const progress = data.progress
  if (progress && typeof progress === 'object') {
    for (const [id, value] of Object.entries(progress as Record<string, unknown>)) {
      const p = sanitizeProgress(id, value)
      if (p) state.progress[id] = p
    }
  }
  return state
}

function sanitizeBrush(value: unknown): BrushSettings {
  const b = (value ?? {}) as Partial<BrushSettings>
  return {
    color: typeof b.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(b.color) ? b.color : DEFAULT_BRUSH.color,
    width:
      typeof b.width === 'number' && Number.isFinite(b.width) && b.width > 0 && b.width <= 120
        ? b.width
        : DEFAULT_BRUSH.width,
    tool: b.tool === 'eraser' ? 'eraser' : 'brush',
  }
}

function sanitizeProgress(id: string, value: unknown): WorksheetProgress | null {
  if (!value || typeof value !== 'object') return null
  const p = value as Partial<WorksheetProgress>
  const strokes = Array.isArray(p.drawingStrokes) ? p.drawingStrokes.filter(isValidStroke) : []
  return {
    worksheetId: id,
    foundCircleIds: Array.isArray(p.foundCircleIds) ? p.foundCircleIds.filter((x) => typeof x === 'string') : [],
    totalCorrectCircles: typeof p.totalCorrectCircles === 'number' ? p.totalCorrectCircles : 0,
    recognitionCompleted: p.recognitionCompleted === true,
    drawingStrokes: strokes,
    drawingModified: strokes.length > 0,
  }
}
