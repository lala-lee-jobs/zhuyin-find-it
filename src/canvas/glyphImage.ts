/**
 * 中央大注音改用 PNG 圖檔（黑框＋白色字身＋虛線筆順、起點、箭頭）。
 *
 * 圖片處理（載入後做一次）：
 *   mask    ：圖片本身的不透明區（destination-in 用），塗色不會超出字外
 *   overlay ：把圖片裡的「白色」去掉（color-to-alpha），只留下黑框、虛線、起點、箭頭
 *
 * 每一幀：原圖 → 塗色（遮罩後）→ overlay。
 * 所以塗色會蓋住白色字身，但黑框與筆順提示永遠在最上面、清楚可見。
 *
 * 位置：依圖片的不透明範圍自動縮放置中到 GLYPH_IMAGE_AREA，不需要逐張手動對位；
 * 點擊判定也直接看圖片的不透明區，不依賴骨架路徑。
 */
import type { CanvasLike, CanvasFactory, StrokeTransform } from './drawingMask'
import type { SheetLayout } from './layout'
import type { Ctx2D } from './renderDecorations'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface ProcessedGlyphImage {
  /** 原圖（已畫到 canvas 上） */
  source: CanvasLike
  /** 去白後的黑框與筆順提示 */
  overlay: CanvasLike
  width: number
  height: number
  /** 不透明區的範圍（圖片像素） */
  bounds: Rect
  /** 每個像素的 alpha，用於點擊判定 */
  alpha: Uint8ClampedArray
}

/** 已放到學習單上的注音圖片 */
export interface PlacedGlyphImage {
  image: ProcessedGlyphImage
  /** 整張圖片在學習單上的位置（邏輯座標） */
  rect: Rect
}

const ALPHA_THRESHOLD = 128

/** 不透明區的外框（alpha ≥ 128）；整張透明時回傳 null */
export function opaqueBounds(data: Uint8ClampedArray, width: number, height: number): Rect | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < ALPHA_THRESHOLD) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

/**
 * 去白（color-to-alpha）：白色 → 透明、黑色 → 不透明黑、灰色反鋸齒邊 → 半透明黑，
 * 黃色等彩色不受影響。結果疊在任何顏色上，看起來都和原圖疊在白底上一樣。
 */
export function removeWhite(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length)
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a === 0) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // 每個通道離白色多遠，取最大值當作不透明度
    const t = Math.max(255 - r, 255 - g, 255 - b) / 255
    if (t <= 0) continue
    out[i] = 255 - (255 - r) / t
    out[i + 1] = 255 - (255 - g) / t
    out[i + 2] = 255 - (255 - b) / t
    out[i + 3] = a * t
  }
  return out
}

export interface GlyphImageArea {
  cx: number
  cy: number
  maxW: number
  maxH: number
}

/** 把圖片的不透明範圍等比例縮放到 area 的最大寬高內，並置中於 area 中心 */
export function placeGlyphImage(bounds: Rect, imageWidth: number, imageHeight: number, area: GlyphImageArea): Rect {
  const s = Math.min(area.maxW / bounds.w, area.maxH / bounds.h)
  const { cx, cy } = area
  const bx = cx - (bounds.w * s) / 2
  const by = cy - (bounds.h * s) / 2
  return { x: bx - bounds.x * s, y: by - bounds.y * s, w: imageWidth * s, h: imageHeight * s }
}

/** 點擊判定：在 tolerance（邏輯單位）範圍內有任何不透明像素就算點在字上 */
export function isPointInGlyphImage(p: { x: number; y: number }, placed: PlacedGlyphImage, tolerance = 0): boolean {
  const { image, rect } = placed
  const sx = image.width / rect.w
  const sy = image.height / rect.h
  const offsets = tolerance > 0 ? [-tolerance, 0, tolerance] : [0]
  for (const dy of offsets) {
    for (const dx of offsets) {
      const px = Math.floor((p.x + dx - rect.x) * sx)
      const py = Math.floor((p.y + dy - rect.y) * sy)
      if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue
      if (image.alpha[(py * image.width + px) * 4 + 3] >= ALPHA_THRESHOLD) return true
    }
  }
  return false
}

/** 載入完成的圖片 → 原圖 canvas、去白 overlay、alpha；圖片全透明時回傳 null */
export function processGlyphImage(img: CanvasImageSource & { width: number; height: number }, factory: CanvasFactory): ProcessedGlyphImage | null {
  const width = img.width
  const height = img.height
  if (!width || !height) return null
  const source = factory(width, height)
  const sctx = source.getContext('2d') as Ctx2D | null
  if (!sctx) return null
  sctx.drawImage(img, 0, 0)
  const data = sctx.getImageData(0, 0, width, height)
  const bounds = opaqueBounds(data.data, width, height)
  if (!bounds) return null

  const overlay = factory(width, height)
  const octx = overlay.getContext('2d') as Ctx2D | null
  if (!octx) return null
  const cleaned = octx.createImageData(width, height)
  cleaned.data.set(removeWhite(data.data))
  octx.putImageData(cleaned, 0, 0)

  return { source, overlay, width, height, bounds, alpha: data.data }
}

/**
 * 筆畫從 from 版面換算到 to 版面的轉換（筆畫以直式版面座標儲存）。
 * 有圖片時對齊圖片的放置位置；沒有圖片時對齊泡泡字方塊。
 */
export function strokeTransformBetween(
  image: Pick<ProcessedGlyphImage, 'bounds' | 'width' | 'height'> | null,
  from: SheetLayout,
  to: SheetLayout,
): StrokeTransform {
  if (image) {
    const a0 = placeGlyphImage(image.bounds, image.width, image.height, from.glyphImageArea)
    const a1 = placeGlyphImage(image.bounds, image.width, image.height, to.glyphImageArea)
    const a = a1.w / a0.w
    return { a, tx: a1.x - a0.x * a, ty: a1.y - a0.y * a }
  }
  const a = to.glyphBox.size / from.glyphBox.size
  return { a, tx: to.glyphBox.x - from.glyphBox.x * a, ty: to.glyphBox.y - from.glyphBox.y * a }
}
