// ───────── 筆畫 ─────────

export interface DrawingPoint {
  x: number
  y: number
}

export type DrawingTool = 'brush' | 'eraser'

export interface DrawingStroke {
  id: string
  color: string
  width: number
  tool: DrawingTool
  points: DrawingPoint[]
}

export interface BrushSettings {
  color: string
  /** 畫筆粗細（邏輯座標單位） */
  width: number
  tool: DrawingTool
}

// ───────── 題庫 ─────────

export interface ZhuyinCircle {
  id: string
  symbol: string
  x: number
  y: number
  radius: number
  /** 題庫資料一律為 false；執行時由進度資料推導 */
  isFound: boolean
  /** 答對後的填色 */
  fillColor?: string
}

export interface IllustrationItem {
  id: string
  word: string
  imageUrl: string
  /** 預留：詞彙注音（第一版不顯示） */
  zhuyin?: string
  /** 預留：詞彙發音音檔 */
  audioUrl?: string
}

export interface ZhuyinWorksheet {
  id: string
  targetSymbol: string
  title: string
  audioUrl: string
  illustrations: IllustrationItem[]
  circles: ZhuyinCircle[]
}

// ───────── 進度 ─────────

export interface WorksheetProgress {
  worksheetId: string

  foundCircleIds: string[]
  totalCorrectCircles: number
  recognitionCompleted: boolean

  drawingStrokes: DrawingStroke[]
  drawingModified: boolean
}

export interface PersistedState {
  version: number
  lastWorksheetId: string | null
  brush: BrushSettings
  muted: boolean
  /** 彩色電子紙模式（舊存檔沒有這個欄位時視為 false） */
  epaper: boolean
  /** 塗色筆刷音效（預設關閉） */
  brushSound: boolean
  /** 開放到哪一題（含）；null 代表使用預設（DEFAULT_UNLOCKED_UNTIL_ID） */
  unlockedUntilId: string | null
  progress: Record<string, WorksheetProgress>
}

// ───────── 互動 ─────────

export type InteractionState = 'idle' | 'pronouncing' | 'feedback' | 'closing'

/** correct：找到新的目標注音；wrong：不是目標；already：已找到過的目標 */
export type AnswerKind = 'correct' | 'wrong' | 'already'
