/**
 * 學習單版面：使用邏輯座標，畫面縮放只改變「邏輯 → 螢幕像素」的倍率。
 *
 * 依螢幕形狀有三種版面（見 SHEET_LAYOUTS／chooseLayout）：
 *   portrait  ：800 × 1100，平板直向（40 個圓圈）
 *   landscape ：1160 × 800，平板／手機橫向（38 個圓圈）
 *   narrow    ：600 × 1000，手機直向（26 個圓圈，圓圈在小螢幕上比較大）
 * 下面的 WORKSHEET_WIDTH、HEADER、CIRCLE_SLOTS 等常數是 portrait 版面。
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

export type CircleZone = 'top' | 'left' | 'right' | 'bottom'

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
export const CIRCLE_SLOTS: ReadonlyArray<CircleSlot> = ROWS.flatMap(([y, zone]) =>
  zone === 'side'
    ? SIDE_X.map(([x, side]) => ({ x, y, zone: side }))
    : FULL_ROW_X.map((x) => ({ x, y, zone })),
)

/** 進度（HTML overlay），位於標題區右半部 */
export const PROGRESS_BAND = { x: 420, y: 22, w: 350, h: 120 } as const

// ───────── 三種版面 ─────────

export interface CircleSlot {
  x: number
  y: number
  zone: CircleZone
}

export type LayoutId = 'portrait' | 'landscape' | 'narrow'

export interface SheetLayout {
  id: LayoutId
  width: number
  height: number
  /** 圓圈區（圓圈含微調都要落在這裡） */
  board: { top: number; bottom: number }
  header: {
    titleLeftX: number
    titleBaselineY: number
    titleFontSize: number
    titleGlyphSize: number
    speaker: { x: number; y: number; size: number }
  }
  /** 進度（HTML overlay） */
  progress: { x: number; y: number; w: number; h: number; fontSize: number }
  /** 泡泡字（骨架）用的方塊 */
  glyphBox: { x: number; y: number; size: number }
  /** PNG 注音可用的範圍 */
  glyphImageArea: { cx: number; cy: number; maxW: number; maxH: number }
  slots: readonly CircleSlot[]
  /** 圓圈之間的小星星／愛心／花 */
  decorations: ReadonlyArray<{ x: number; y: number }>
}

export const PORTRAIT_LAYOUT: SheetLayout = {
  id: 'portrait',
  width: WORKSHEET_WIDTH,
  height: WORKSHEET_HEIGHT,
  board: REGIONS.board,
  header: HEADER,
  progress: { ...PROGRESS_BAND, fontSize: 28 },
  glyphBox: GLYPH_BOX,
  glyphImageArea: GLYPH_IMAGE_AREA,
  slots: CIRCLE_SLOTS,
  decorations: [267, 981].flatMap((y) => [130, 400, 670].map((x) => ({ x, y }))),
}

/**
 * 橫向：10 欄 × 5 排，中間 4 欄 × 3 排留給大注音 → 38 個圓圈。
 * 左 3 欄 = left、右 3 欄 = right、中間 4 欄的第一排 = top、最後一排 = bottom。
 */
const LANDSCAPE_COLS = [59, 175, 291, 406, 522, 638, 754, 869, 985, 1101]
const LANDSCAPE_ROWS = [187, 326, 464, 603, 741]
export const LANDSCAPE_LAYOUT: SheetLayout = {
  id: 'landscape',
  width: 1160,
  height: 800,
  board: { top: 130, bottom: 798 },
  header: {
    titleLeftX: 40,
    titleBaselineY: 92,
    titleFontSize: 58,
    titleGlyphSize: 62,
    speaker: { x: 344, y: 70, size: 76 },
  },
  progress: { x: 770, y: 10, w: 350, h: 118, fontSize: 28 },
  glyphBox: { x: 430, y: 314, size: 300 },
  glyphImageArea: { cx: 580, cy: 464, maxW: 440, maxH: 430 },
  slots: LANDSCAPE_ROWS.flatMap((y, r) =>
    LANDSCAPE_COLS.flatMap((x, c): CircleSlot[] => {
      if (c <= 2) return [{ x, y, zone: 'left' }]
      if (c >= 7) return [{ x, y, zone: 'right' }]
      if (r === 0) return [{ x, y, zone: 'top' }]
      if (r === LANDSCAPE_ROWS.length - 1) return [{ x, y, zone: 'bottom' }]
      return [] // 大注音
    }),
  ),
  decorations: [
    { x: 233, y: 256 },
    { x: 927, y: 256 },
    { x: 233, y: 672 },
    { x: 927, y: 672 },
  ],
}

/**
 * 手機直向：上 2 排 × 5、大注音兩側左右各 1 欄 × 3 排、下 2 排 × 5 → 26 個圓圈。
 * 紙比較窄，所以同樣的手機螢幕上圓圈比較大。
 */
const NARROW_FULL_X = [59, 180, 300, 420, 541]
const NARROW_ROWS: ReadonlyArray<[number, CircleZone | 'side']> = [
  [207, 'top'],
  [329, 'top'],
  [451, 'side'],
  [573, 'side'],
  [695, 'side'],
  [817, 'bottom'],
  [939, 'bottom'],
]
export const NARROW_LAYOUT: SheetLayout = {
  id: 'narrow',
  width: 600,
  height: 1000,
  board: { top: 150, bottom: 996 },
  header: {
    titleLeftX: 28,
    titleBaselineY: 96,
    titleFontSize: 48,
    titleGlyphSize: 52,
    speaker: { x: 282, y: 78, size: 64 },
  },
  progress: { x: 336, y: 16, w: 252, h: 118, fontSize: 24 },
  glyphBox: { x: 150, y: 423, size: 300 },
  glyphImageArea: { cx: 300, cy: 573, maxW: 360, maxH: 370 },
  slots: NARROW_ROWS.flatMap(([y, zone]): CircleSlot[] =>
    zone === 'side'
      ? [
          { x: 59, y, zone: 'left' },
          { x: 541, y, zone: 'right' },
        ]
      : NARROW_FULL_X.map((x) => ({ x, y, zone })),
  ),
  decorations: [
    { x: 120, y: 268 },
    { x: 480, y: 268 },
    { x: 120, y: 878 },
    { x: 480, y: 878 },
  ],
}

export const SHEET_LAYOUTS: Readonly<Record<LayoutId, SheetLayout>> = {
  portrait: PORTRAIT_LAYOUT,
  landscape: LANDSCAPE_LAYOUT,
  narrow: NARROW_LAYOUT,
}

/** 版面放進 w × h 容器時的縮放倍率 */
export function layoutScale(layout: SheetLayout, w: number, h: number): number {
  if (w <= 0 || h <= 0) return 0
  return Math.min(w / layout.width, h / layout.height)
}

/**
 * 依可用空間選版面：
 * - 容器比較寬：直式、橫式取縮放倍率大的（圓圈在螢幕上比較大）
 * - 容器比較高：小螢幕（手機）用窄版，其他用直式
 */
export function chooseLayout(w: number, h: number, compact: boolean): SheetLayout {
  if (w >= h) {
    return layoutScale(LANDSCAPE_LAYOUT, w, h) > layoutScale(PORTRAIT_LAYOUT, w, h) ? LANDSCAPE_LAYOUT : PORTRAIT_LAYOUT
  }
  return compact ? NARROW_LAYOUT : PORTRAIT_LAYOUT
}

export const INK = '#1f1f1f'

export const FONT_STACK =
  '"Yuanti TC", "jf-openhuninn-2.0", "PingFang TC", "Noto Sans TC", "Noto Sans CJK TC", "Microsoft JhengHei", sans-serif'
