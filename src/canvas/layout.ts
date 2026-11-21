/**
 * 學習單版面：全部使用 800 × 1100 的邏輯座標。
 * 畫面縮放只改變「邏輯 → 螢幕像素」的倍率，版面本身不變。
 */

export const WORKSHEET_WIDTH = 800
export const WORKSHEET_HEIGHT = 1100

export const REGIONS = {
  header: { top: 0, bottom: 150 },
  illustrations: { top: 150, bottom: 420 },
  board: { top: 420, bottom: 1000 },
  footer: { top: 1000, bottom: 1100 },
} as const

export const BORDER_INSET = 12

/** 標題雲朵 */
export const HEADER = {
  cloud: { cx: 400, cy: 80, w: 470, h: 112 },
  /** 標題文字＋注音的中心點（喇叭在右側） */
  titleCenterX: 368,
  titleBaselineY: 102,
  titleFontSize: 62,
  titleGlyphSize: 66,
  /** 喇叭按鈕（HTML overlay） */
  speaker: { x: 580, y: 80, size: 84 },
} as const

/** 中央大注音的外框方塊（邏輯座標）。注音骨架 0–100 對應到這個方塊。 */
export const GLYPH_BOX = { x: 250, y: 560, size: 300 } as const

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
 * 22 個圓圈位置（與參考學習單相同：上 5、中間左右各 2 × 3 列、下 5），
 * 每題再以 seeded random 做 ±4 的微調，讓排版自然但不重疊。
 */
export const CIRCLE_SLOTS: ReadonlyArray<{ x: number; y: number; zone: 'top' | 'left' | 'right' | 'bottom' }> = [
  { x: 85, y: 478, zone: 'top' },
  { x: 242, y: 478, zone: 'top' },
  { x: 400, y: 478, zone: 'top' },
  { x: 558, y: 478, zone: 'top' },
  { x: 715, y: 478, zone: 'top' },

  { x: 75, y: 594, zone: 'left' },
  { x: 185, y: 594, zone: 'left' },
  { x: 615, y: 594, zone: 'right' },
  { x: 725, y: 594, zone: 'right' },

  { x: 75, y: 710, zone: 'left' },
  { x: 185, y: 710, zone: 'left' },
  { x: 615, y: 710, zone: 'right' },
  { x: 725, y: 710, zone: 'right' },

  { x: 75, y: 826, zone: 'left' },
  { x: 185, y: 826, zone: 'left' },
  { x: 615, y: 826, zone: 'right' },
  { x: 725, y: 826, zone: 'right' },

  { x: 85, y: 942, zone: 'bottom' },
  { x: 242, y: 942, zone: 'bottom' },
  { x: 400, y: 942, zone: 'bottom' },
  { x: 558, y: 942, zone: 'bottom' },
  { x: 715, y: 942, zone: 'bottom' },
]

/** 四個插畫位置 */
export const ILLUSTRATION_SLOTS = {
  centersX: [112, 304, 496, 688],
  imageTop: 168,
  imageSize: 156,
  labelY: 356,
  labelFontSize: 30,
} as const

/** 底部進度列（HTML overlay） */
export const PROGRESS_BAND = { x: 190, y: 1010, w: 420, h: 70 } as const

export const INK = '#1f1f1f'

export const FONT_STACK =
  '"Yuanti TC", "jf-openhuninn-2.0", "PingFang TC", "Noto Sans TC", "Noto Sans CJK TC", "Microsoft JhengHei", sans-serif'
