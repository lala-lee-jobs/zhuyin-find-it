import type { DrawingPoint } from '../types/worksheet'
import { WORKSHEET_HEIGHT, WORKSHEET_WIDTH } from './layout'

export interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

/**
 * 螢幕座標（clientX / clientY）→ 學習單邏輯座標。
 * 以元素實際顯示的 getBoundingClientRect 換算，
 * 因此 CSS 縮放、devicePixelRatio、頁面捲動都不會造成誤差。
 */
export function clientToLogical(
  clientX: number,
  clientY: number,
  rect: RectLike,
  logicalWidth = WORKSHEET_WIDTH,
  logicalHeight = WORKSHEET_HEIGHT,
): DrawingPoint {
  if (rect.width <= 0 || rect.height <= 0) return { x: -1, y: -1 }
  return {
    x: ((clientX - rect.left) / rect.width) * logicalWidth,
    y: ((clientY - rect.top) / rect.height) * logicalHeight,
  }
}

/** 學習單等比例放進容器中的 CSS 縮放倍率 */
export function computeFitScale(
  availableWidth: number,
  availableHeight: number,
  logicalWidth = WORKSHEET_WIDTH,
  logicalHeight = WORKSHEET_HEIGHT,
): number {
  if (availableWidth <= 0 || availableHeight <= 0) return 0
  return Math.min(availableWidth / logicalWidth, availableHeight / logicalHeight)
}

export interface BackingSize {
  /** canvas.width */
  width: number
  /** canvas.height */
  height: number
  /** 邏輯座標 → canvas 像素的倍率 */
  k: number
  cssWidth: number
  cssHeight: number
}

/**
 * 計算 canvas 背景緩衝區尺寸。
 * - 依 devicePixelRatio 提高解析度，但設上限避免平板記憶體爆掉。
 * - k = 邏輯 → 實際像素倍率；所有繪圖都用 setTransform(k, 0, 0, k, 0, 0)。
 */
export function computeBackingSize(
  scale: number,
  devicePixelRatio: number,
  options: { maxDpr?: number; maxPixels?: number } = {},
  logicalWidth = WORKSHEET_WIDTH,
  logicalHeight = WORKSHEET_HEIGHT,
): BackingSize {
  const maxDpr = options.maxDpr ?? 2.5
  const maxPixels = options.maxPixels ?? 4_200_000
  const cssWidth = Math.max(1, Math.round(logicalWidth * scale))
  const cssHeight = Math.max(1, Math.round(logicalHeight * scale))
  let dpr = Math.min(Math.max(devicePixelRatio || 1, 1), maxDpr)
  const pixels = cssWidth * cssHeight * dpr * dpr
  if (pixels > maxPixels) dpr = Math.max(1, Math.sqrt(maxPixels / (cssWidth * cssHeight)))
  const k = (cssWidth * dpr) / logicalWidth
  return {
    width: Math.max(1, Math.round(logicalWidth * k)),
    height: Math.max(1, Math.round(logicalHeight * k)),
    k,
    cssWidth,
    cssHeight,
  }
}
