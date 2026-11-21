/**
 * 中央大注音的 PNG 圖檔（黑框＋白色字身＋虛線筆順）。
 * 有列在這裡的注音改用圖片；沒有的仍使用骨架路徑畫的泡泡字。
 * 圖片位置會依不透明範圍自動置中，不需要手動對位（見 canvas/glyphImage.ts）。
 *
 * 注意：只列出已換成新風格、且檔名與內容一致的圖。
 * 資料夾裡 ㄝ ㄞ ㄟ ㄠ ㄡ ㄢ ㄣ ㄤ ㄥ ㄦ 還是舊圖，有些檔名與實際字形不符，換成新圖後再加進來。
 */
import b from './zhuyinGlyphs/ㄅ.png'
import p from './zhuyinGlyphs/ㄆ.png'
import m from './zhuyinGlyphs/ㄇ.png'
import f from './zhuyinGlyphs/ㄈ.png'
import d from './zhuyinGlyphs/ㄉ.png'
import t from './zhuyinGlyphs/ㄊ.png'
import n from './zhuyinGlyphs/ㄋ.png'
import l from './zhuyinGlyphs/ㄌ.png'
import g from './zhuyinGlyphs/ㄍ.png'
import k from './zhuyinGlyphs/ㄎ.png'
import h from './zhuyinGlyphs/ㄏ.png'
import j from './zhuyinGlyphs/ㄐ.png'
import q from './zhuyinGlyphs/ㄑ.png'
import x from './zhuyinGlyphs/ㄒ.png'
import zh from './zhuyinGlyphs/ㄓ.png'
import ch from './zhuyinGlyphs/ㄔ.png'
import sh from './zhuyinGlyphs/ㄕ.png'
import r from './zhuyinGlyphs/ㄖ.png'
import z from './zhuyinGlyphs/ㄗ.png'
import c from './zhuyinGlyphs/ㄘ.png'
import s from './zhuyinGlyphs/ㄙ.png'
import a from './zhuyinGlyphs/ㄚ.png'
import o from './zhuyinGlyphs/ㄛ.png'
import e from './zhuyinGlyphs/ㄜ.png'
import i from './zhuyinGlyphs/ㄧ.png'
import u from './zhuyinGlyphs/ㄨ.png'
import yu from './zhuyinGlyphs/ㄩ.png'

export const GLYPH_IMAGE_URLS: Readonly<Record<string, string>> = {
  'ㄅ': b,
  'ㄆ': p,
  'ㄇ': m,
  'ㄈ': f,
  'ㄉ': d,
  'ㄊ': t,
  'ㄋ': n,
  'ㄌ': l,
  'ㄍ': g,
  'ㄎ': k,
  'ㄏ': h,
  'ㄐ': j,
  'ㄑ': q,
  'ㄒ': x,
  'ㄓ': zh,
  'ㄔ': ch,
  'ㄕ': sh,
  'ㄖ': r,
  'ㄗ': z,
  'ㄘ': c,
  'ㄙ': s,
  'ㄚ': a,
  'ㄛ': o,
  'ㄜ': e,
  'ㄧ': i,
  'ㄨ': u,
  'ㄩ': yu,
}

export function getGlyphImageUrl(symbol: string): string | null {
  return GLYPH_IMAGE_URLS[symbol] ?? null
}
