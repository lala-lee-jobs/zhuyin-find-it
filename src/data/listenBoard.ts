import type { ZhuyinCircle, ZhuyinWorksheet } from '../types/worksheet'
import { CIRCLE_JITTER, CIRCLE_RADIUS, PORTRAIT_LAYOUT, type SheetLayout } from '../canvas/layout'
import { hashString, mulberry32, seededShuffle } from '../core/random'
import { ZHUYIN_AUDIO } from './zhuyinAudioMap'
import { CIRCLE_FILL_COLORS } from './worksheets'

/**
 * 聽音模式棋盤：把多個符號（已學會的注音）均勻分配到「指定版面」的所有圓圈槽位，
 * 使用同樣的種子讓每次開啟同一組注音、同一版面時呈現相同的排列。
 *
 * 直接依版面產生（layoutId），placeCircles 不會再重排，
 * 所以畫面上的圓圈與進度計算用的圓圈永遠是同一組。
 */
export function buildListenBoard(
  symbols: readonly string[],
  layout: SheetLayout = PORTRAIT_LAYOUT,
): ZhuyinWorksheet {
  if (symbols.length === 0) throw new Error('buildListenBoard: symbols is empty')
  const slots = layout.slots
  const rand = mulberry32(hashString(`listen:${layout.id}:` + symbols.join(',')))

  const rawAssigned = Array.from({ length: slots.length }, (_, i) => symbols[i % symbols.length])
  const assigned = seededShuffle(rawAssigned, rand)

  const circles: ZhuyinCircle[] = slots.map((slot, i) => {
    const jx = Math.round((rand() * 2 - 1) * CIRCLE_JITTER)
    const jy = Math.round((rand() * 2 - 1) * CIRCLE_JITTER)
    return {
      id: `listen-${layout.id}-c${String(i + 1).padStart(2, '0')}`,
      symbol: assigned[i],
      x: slot.x + jx,
      y: slot.y + jy,
      radius: CIRCLE_RADIUS,
      isFound: false,
      fillColor: CIRCLE_FILL_COLORS[Math.floor(rand() * CIRCLE_FILL_COLORS.length)],
    }
  })

  return {
    id: 'listen-board',
    layoutId: layout.id,
    targetSymbol: symbols[0],
    title: '聽音找注音',
    audioUrl: ZHUYIN_AUDIO[symbols[0]] ?? '',
    illustrations: [],
    circles,
  }
}
