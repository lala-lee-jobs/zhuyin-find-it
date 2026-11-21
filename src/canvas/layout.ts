/**
 * 學習單版面：全部使用 800 × 1100 的邏輯座標。
 * 畫面縮放只改變「邏輯 → 螢幕像素」的倍率，版面本身不變。
 */

export const WORKSHEET_WIDTH = 800
export const WORKSHEET_HEIGHT = 1100

export const REGIONS = {
  header: { top: 0, bottom: 150 },
  illustrations: { top: 150, bottom: 420 },
  /** 圓圈區一路延伸到外框內側（底部不再保留進度列） */
  board: { top: 420, bottom: 1084 },
} as const

export const BORDER_INSET = 12

/** 標題區：左半部放標題＋喇叭，右半部放進度（見 PROGRESS_BAND） */
export const HEADER = {
  /** 標題文字的左緣 */
  titleLeftX: 40,
  titleBaselineY: 102,
  titleFontSize: 58,
  titleGlyphSize: 62,
  /** 喇叭按鈕（HTML overlay，x/y 為中心點） */
  speaker: { x: 344, y: 80, size: 76 },
} as const

/** 中央大注音的外框方塊（邏輯座標）。注音骨架 0–100 對應到這個方塊。 */
export const GLYPH_BOX = { x: 250, y: 604, size: 300 } as const

/**
 * 泡泡字樣式（邏輯座標單位）
 * outerWidth：含黑框的總寬；ringWidth：黑框粗細；
 * 可塗色區 = outerWidth - 2 * ringWidth；遮罩比可塗色區略寬，讓顏色延伸到黑框底下，不留白縫。
 */
export const GLYPH_STYLE = {
  outerWidth: 60,
  ringWidth: 7,
  maskBleed: 4,
} as const

export const CIRCLE_RADIUS = 46
export const CIRCLE_JITTER = 4

/**
 * 26 個圓圈位置：上 5、中間左右各 2 × 4 列、下 5，
 * 每題再以 seeded random 做 ±4 的微調，讓排版自然但不重疊。
 */
export const CIRCLE_SLOTS: ReadonlyArray<{ x: number; y: number; zone: 'top' | 'left' | 'right' | 'bottom' }> = [
  { x: 85, y: 478, zone: 'top' },
  { x: 242, y: 478, zone: 'top' },
  { x: 400, y: 478, zone: 'top' },
  { x: 558, y: 478, zone: 'top' },
  { x: 715, y: 478, zone: 'top' },

  { x: 75, y: 588, zone: 'left' },
  { x: 185, y: 588, zone: 'left' },
  { x: 615, y: 588, zone: 'right' },
  { x: 725, y: 588, zone: 'right' },

  { x: 75, y: 698, zone: 'left' },
  { x: 185, y: 698, zone: 'left' },
  { x: 615, y: 698, zone: 'right' },
  { x: 725, y: 698, zone: 'right' },

  { x: 75, y: 808, zone: 'left' },
  { x: 185, y: 808, zone: 'left' },
  { x: 615, y: 808, zone: 'right' },
  { x: 725, y: 808, zone: 'right' },

  { x: 75, y: 918, zone: 'left' },
  { x: 185, y: 918, zone: 'left' },
  { x: 615, y: 918, zone: 'right' },
  { x: 725, y: 918, zone: 'right' },

  { x: 85, y: 1028, zone: 'bottom' },
  { x: 242, y: 1028, zone: 'bottom' },
  { x: 400, y: 1028, zone: 'bottom' },
  { x: 558, y: 1028, zone: 'bottom' },
  { x: 715, y: 1028, zone: 'bottom' },
]

/** 四個插畫位置 */
export const ILLUSTRATION_SLOTS = {
  centersX: [112, 304, 496, 688],
  imageTop: 168,
  imageSize: 156,
  labelY: 356,
  labelFontSize: 30,
} as const

/** 進度（HTML overlay），位於標題區右半部 */
export const PROGRESS_BAND = { x: 420, y: 34, w: 350, h: 92 } as const

export const INK = '#1f1f1f'

export const FONT_STACK =
  '"Yuanti TC", "jf-openhuninn-2.0", "PingFang TC", "Noto Sans TC", "Noto Sans CJK TC", "Microsoft JhengHei", sans-serif'
