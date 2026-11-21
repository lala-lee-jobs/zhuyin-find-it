import type { IllustrationItem, ZhuyinCircle, ZhuyinWorksheet } from '../types/worksheet'
import { CIRCLE_JITTER, CIRCLE_RADIUS, CIRCLE_SLOTS } from '../canvas/layout'
import { hashString, mulberry32, seededShuffle } from '../core/random'
import { ZHUYIN_AUDIO } from './zhuyinAudioMap'

/** 答對後的圓圈填色（柔和色） */
export const CIRCLE_FILL_COLORS = ['#FFEB99', '#FFC9D6', '#BFE3FF', '#C4F0DA', '#E2D4FF'] as const

export interface WorksheetSeed {
  id: string
  target: string
  /** 正確圓圈數（8–10） */
  correctCount: number
  /** 干擾注音（形狀相近者優先） */
  distractors: string[]
  /** [插畫檔名, 詞彙] */
  illustrations: Array<[string, string]>
}

/**
 * 題庫種子。新增注音時：
 * 1. 在這裡加一筆種子
 * 2. 在 data/zhuyinGlyphs.ts 加入骨架路徑
 * 3. 把插畫放進 public/illustrations/、音檔放進 public/audio/zhuyin/
 */
export const WORKSHEET_SEEDS: readonly WorksheetSeed[] = [
  {
    id: 'zhuyin-b',
    target: 'ㄅ',
    correctCount: 9,
    distractors: ['ㄆ', 'ㄉ', 'ㄌ', 'ㄇ'],
    illustrations: [
      ['bun', '包子'],
      ['cup', '杯子'],
      ['pudding', '布丁'],
      ['popsicle', '冰棒'],
    ],
  },
  {
    id: 'zhuyin-p',
    target: 'ㄆ',
    correctCount: 8,
    distractors: ['ㄅ', 'ㄊ', 'ㄈ', 'ㄇ'],
    illustrations: [
      ['apple', '蘋果'],
      ['grapes', '葡萄'],
      ['crab', '螃蟹'],
      ['plate', '盤子'],
    ],
  },
  {
    id: 'zhuyin-m',
    target: 'ㄇ',
    correctCount: 10,
    distractors: ['ㄈ', 'ㄋ', 'ㄅ', 'ㄆ'],
    illustrations: [
      ['cat', '貓咪'],
      ['hat', '帽子'],
      ['bread', '麵包'],
      ['door', '門'],
    ],
  },
  {
    id: 'zhuyin-f',
    target: 'ㄈ',
    correctCount: 9,
    distractors: ['ㄇ', 'ㄅ', 'ㄊ', 'ㄉ'],
    illustrations: [
      ['airplane', '飛機'],
      ['tomato', '番茄'],
      ['sofa', '沙發'],
      ['bee', '蜜蜂'],
    ],
  },
  {
    id: 'zhuyin-d',
    target: 'ㄉ',
    correctCount: 9,
    distractors: ['ㄌ', 'ㄅ', 'ㄊ', 'ㄋ'],
    illustrations: [
      ['cake', '蛋糕'],
      ['bulb', '燈泡'],
      ['elephant', '大象'],
      ['butterfly', '蝴蝶'],
    ],
  },
  {
    id: 'zhuyin-t',
    target: 'ㄊ',
    correctCount: 10,
    distractors: ['ㄅ', 'ㄇ', 'ㄈ', 'ㄉ'],
    illustrations: [
      ['candy', '糖果'],
      ['lamp', '檯燈'],
      ['donut', '甜甜圈'],
      ['rabbit', '兔子'],
    ],
  },
  {
    id: 'zhuyin-n',
    target: 'ㄋ',
    correctCount: 8,
    distractors: ['ㄅ', 'ㄇ', 'ㄊ', 'ㄈ', 'ㄉ'],
    illustrations: [
      ['milk', '牛奶'],
      ['bird', '小鳥'],
      ['clock', '鬧鐘'],
      ['lemon', '檸檬'],
    ],
  },
  {
    id: 'zhuyin-l',
    target: 'ㄌ',
    correctCount: 9,
    distractors: ['ㄉ', 'ㄇ', 'ㄈ', 'ㄋ', 'ㄊ'],
    illustrations: [
      ['mouse', '老鼠'],
      ['crayon', '蠟筆'],
      ['gift', '禮物'],
      ['candle', '蠟燭'],
    ],
  },
  {
    id: 'zhuyin-g',
    target: 'ㄍ',
    correctCount: 9,
    distractors: ['ㄑ', 'ㄎ', 'ㄐ', 'ㄏ'],
    illustrations: [
      ['dog', '狗'],
      ['drum', '鼓'],
      ['pigeon', '鴿子'],
      ['juice', '果汁'],
    ],
  },
  {
    id: 'zhuyin-k',
    target: 'ㄎ',
    correctCount: 8,
    distractors: ['ㄍ', 'ㄞ', 'ㄏ', 'ㄋ'],
    illustrations: [
      ['pants', '褲子'],
      ['dinosaur', '恐龍'],
      ['mask', '口罩'],
      ['chopsticks', '筷子'],
    ],
  },
  {
    id: 'zhuyin-h',
    target: 'ㄏ',
    correctCount: 10,
    distractors: ['ㄕ', 'ㄈ', 'ㄎ', 'ㄗ'],
    illustrations: [
      ['monkey', '猴子'],
      ['flower', '花'],
      ['train', '火車'],
      ['butterfly', '蝴蝶'],
    ],
  },
  {
    id: 'zhuyin-j',
    target: 'ㄐ',
    correctCount: 9,
    distractors: ['ㄑ', 'ㄒ', 'ㄩ', 'ㄍ'],
    illustrations: [
      ['chicken', '雞'],
      ['orange', '橘子'],
      ['scissors', '剪刀'],
      ['mirror', '鏡子'],
    ],
  },
]

/** Phase 1 MVP 是「找找看 ㄌ」，第一次開啟時顯示這題 */
export const DEFAULT_WORKSHEET_ID = 'zhuyin-l'

const ZONES = ['top', 'left', 'right', 'bottom'] as const

/**
 * 以種子產生題目：位置固定於版面槽位、加上可重現的微調；
 * 正確注音保證分散在上、左、右、下四個區域。
 */
export function buildWorksheet(seed: WorksheetSeed): ZhuyinWorksheet {
  const rand = mulberry32(hashString(seed.id))
  const slotCount = CIRCLE_SLOTS.length

  const symbols: string[] = []
  for (let i = 0; i < seed.correctCount; i++) symbols.push(seed.target)
  for (let i = 0; i < slotCount - seed.correctCount; i++) {
    symbols.push(seed.distractors[i % seed.distractors.length])
  }

  let arranged = seededShuffle(symbols, rand)
  for (let attempt = 0; attempt < 200; attempt++) {
    if (isWellSpread(arranged, seed.target)) break
    arranged = seededShuffle(symbols, rand)
  }

  const circles: ZhuyinCircle[] = CIRCLE_SLOTS.map((slot, i) => {
    const jx = Math.round((rand() * 2 - 1) * CIRCLE_JITTER)
    const jy = Math.round((rand() * 2 - 1) * CIRCLE_JITTER)
    return {
      id: `${seed.id}-c${String(i + 1).padStart(2, '0')}`,
      symbol: arranged[i],
      x: slot.x + jx,
      y: slot.y + jy,
      radius: CIRCLE_RADIUS,
      isFound: false,
      fillColor: CIRCLE_FILL_COLORS[Math.floor(rand() * CIRCLE_FILL_COLORS.length)],
    }
  })

  const illustrations: IllustrationItem[] = seed.illustrations.map(([key, word]) => ({
    id: `${seed.id}-${key}`,
    word,
    imageUrl: `illustrations/${key}.svg`,
  }))

  return {
    id: seed.id,
    targetSymbol: seed.target,
    title: `找找看 ${seed.target}`,
    audioUrl: ZHUYIN_AUDIO[seed.target] ?? '',
    illustrations,
    circles,
  }
}

function isWellSpread(arranged: string[], target: string): boolean {
  const perZone: Record<string, number> = { top: 0, left: 0, right: 0, bottom: 0 }
  arranged.forEach((s, i) => {
    if (s === target) perZone[CIRCLE_SLOTS[i].zone]++
  })
  if (!ZONES.every((z) => perZone[z] >= 1)) return false
  // 避免左右、上下嚴重不平均
  return Math.abs(perZone.left - perZone.right) <= 2 && Math.abs(perZone.top - perZone.bottom) <= 2
}

export const WORKSHEETS: readonly ZhuyinWorksheet[] = WORKSHEET_SEEDS.map(buildWorksheet)

export function findWorksheet(id: string): ZhuyinWorksheet | undefined {
  return WORKSHEETS.find((w) => w.id === id)
}
