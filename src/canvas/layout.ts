/**
 * 學習單版面：全部使用 800 × 1100 的邏輯座標。
 * 畫面縮放只改變「邏輯 → 螢幕像素」的倍率，版面本身不變。
 */

export const WORKSHEET_WIDTH = 800
export const WORKSHEET_HEIGHT = 1100

export const REGIONS = {
  header: { top: 0, bottom: 150 },
  /** 不放主題插畫、沒有外框線：標題下方到紙張底部全部是圓圈區 */
  board: { top: 150, bottom: 1098 },
} as const

/** 滿版（不畫外框線）：圓圈離紙張邊緣的最小距離 */
export const EDGE_MARGIN = 4

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
export const GLYPH_BOX = { x: 250, y: 475, size: 300 } as const

/**
 * 中央注音改用 PNG 圖片時可使用的範圍（中心點與最大寬高）。
 * 寬度受左右兩側圓圈限制（內緣約 230–570），高度受上下整排圓圈限制（約 379–870）。
 */
export const GLYPH_IMAGE_AREA = { cx: 400, cy: 625, maxW: 330, maxH: 440 } as const

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

export const CIRCLE_RADIUS = 51
export const CIRCLE_JITTER = 4

type CircleZone = 'top' | 'left' | 'right' | 'bottom'

/** 上下整排：每排 6 個 */
const FULL_ROW_X = [59, 195, 332, 468, 605, 741]
/** 中央大注音兩側：左右各 2 欄 */
const SIDE_X: ReadonlyArray<[number, 'left' | 'right']> = [
  [60, 'left'],
  [175, 'left'],
  [625, 'right'],
  [740, 'right'],
]
/** 8 排，間距 119：上 2 排整排、中間 4 排在大注音兩側、下 2 排整排 */
const ROWS: ReadonlyArray<[number, CircleZone | 'side']> = [
  [208, 'top'],
  [327, 'top'],
  [446, 'side'],
  [565, 'side'],
  [684, 'side'],
  [803, 'side'],
  [922, 'bottom'],
  [1041, 'bottom'],
]

/**
 * 40 個圓圈位置：上 2 排 × 6、中間左右各 2 × 4 排、下 2 排 × 6，
 * 每題再以 seeded random 做 ±4 的微調，讓排版自然但不重疊。
 */
export const CIRCLE_SLOTS: ReadonlyArray<{ x: number; y: number; zone: CircleZone }> = ROWS.flatMap(([y, zone]) =>
  zone === 'side'
    ? SIDE_X.map(([x, side]) => ({ x, y, zone: side }))
    : FULL_ROW_X.map((x) => ({ x, y, zone })),
)

/** 進度（HTML overlay），位於標題區右半部 */
export const PROGRESS_BAND = { x: 420, y: 22, w: 350, h: 120 } as const

export const INK = '#1f1f1f'

export const FONT_STACK =
  '"Yuanti TC", "jf-openhuninn-2.0", "PingFang TC", "Noto Sans TC", "Noto Sans CJK TC", "Microsoft JhengHei", sans-serif'
