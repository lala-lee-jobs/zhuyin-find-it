import type { ZhuyinCircle, ZhuyinWorksheet } from '../types/worksheet'
import { CIRCLE_JITTER, CIRCLE_RADIUS, CIRCLE_SLOTS } from '../canvas/layout'
import { hashString, mulberry32, seededShuffle } from '../core/random'
import { ZHUYIN_AUDIO } from './zhuyinAudioMap'
import { CIRCLE_FILL_COLORS } from './worksheets'

/**
 * 聽音模式棋盤：把多個符號（已學會的注音）均勻分配到所有圓圈槽位，
 * 使用同樣的種子讓每次開啟同一組注音時呈現相同的排列。
 */
export function buildListenBoard(symbols: readonly string[]): ZhuyinWorksheet {
  if (symbols.length === 0) throw new Error('buildListenBoard: symbols is empty')
  const rand = mulberry32(hashString('listen:' + symbols.join(',')))

  const rawAssigned = Array.from({ length: CIRCLE_SLOTS.length }, (_, i) => symbols[i % symbols.length])
  const assigned = seededShuffle(rawAssigned, rand)

  const circles: ZhuyinCircle[] = CIRCLE_SLOTS.map((slot, i) => {
    const jx = Math.round((rand() * 2 - 1) * CIRCLE_JITTER)
    const jy = Math.round((rand() * 2 - 1) * CIRCLE_JITTER)
    return {
      id: `listen-c${String(i + 1).padStart(2, '0')}`,
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
    targetSymbol: symbols[0],
    title: '聽音找注音',
    audioUrl: ZHUYIN_AUDIO[symbols[0]] ?? '',
    illustrations: [],
    circles,
  }
}
