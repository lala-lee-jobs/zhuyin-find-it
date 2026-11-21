/**
 * 中央大注音的 PNG 圖檔（黑框＋白色字身＋虛線筆順）。
 * 有列在這裡的注音改用圖片；沒有的仍使用骨架路徑畫的泡泡字。
 * 圖片位置會依不透明範圍自動置中，不需要手動對位（見 canvas/glyphImage.ts）。
 */
import bUrl from './zhuyinGlyphs/ㄅ.png'

export const GLYPH_IMAGE_URLS: Readonly<Record<string, string>> = {
  'ㄅ': bUrl,
}

export function getGlyphImageUrl(symbol: string): string | null {
  return GLYPH_IMAGE_URLS[symbol] ?? null
}
