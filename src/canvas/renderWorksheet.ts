/** Layer 1：紙張、外框、標題、裝飾 */
import type { ZhuyinWorksheet } from '../types/worksheet'
import { hashString, mulberry32 } from '../core/random'
import {
  FONT_STACK,
  HEADER,
  INK,
  WORKSHEET_HEIGHT,
  WORKSHEET_WIDTH,
} from './layout'
import {
  drawFlower,
  drawHeart,
  drawStar,
  type Ctx2D,
} from './renderDecorations'
import { drawSolidGlyph } from './renderZhuyin'

export type ImageLookup = (url: string) => CanvasImageSource | 'error' | null

export interface BaseRenderOptions {
  k: number
  width: number
  height: number
  images: ImageLookup
  resolveUrl: (path: string) => string
}

export function renderBase(ctx: Ctx2D, worksheet: ZhuyinWorksheet, opts: BaseRenderOptions): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, opts.width, opts.height)
  ctx.setTransform(opts.k, 0, 0, opts.k, 0, 0)

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, WORKSHEET_WIDTH, WORKSHEET_HEIGHT)

  const rand = mulberry32(hashString(`${worksheet.id}:decor`))
  drawTitle(ctx, worksheet)
  drawBoardDecorations(ctx, rand)

  ctx.restore()
}

function drawTitle(ctx: Ctx2D, worksheet: ZhuyinWorksheet): void {
  const label = '找找看'
  ctx.save()
  ctx.font = `900 ${HEADER.titleFontSize}px ${FONT_STACK}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const textWidth = Math.min(ctx.measureText(label).width, HEADER.titleFontSize * 3.4)
  const gap = 14
  const startX = HEADER.titleLeftX
  ctx.fillStyle = INK
  ctx.fillText(label, startX, HEADER.titleBaselineY, HEADER.titleFontSize * 3.4)
  ctx.restore()

  const size = HEADER.titleGlyphSize
  drawSolidGlyph(
    ctx,
    worksheet.targetSymbol,
    { x: startX + textWidth + gap, y: HEADER.titleBaselineY - size + 6, size },
    13,
  )
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]
}

type Deco = (ctx: Ctx2D, x: number, y: number, s: number) => void
const smallDecos: Deco[] = [
  (c, x, y, s) => drawStar(c, x, y, s, 2.6),
  (c, x, y, s) => drawHeart(c, x, y, s * 0.85, 2.6),
  (c, x, y, s) => drawFlower(c, x, y, s, 2.4),
]

function drawBoardDecorations(ctx: Ctx2D, rand: () => number): void {
  // 上兩排、下兩排圓圈之間的小星星／愛心／花
  for (const y of [267, 981]) for (const x of [130, 400, 670]) pick(rand, smallDecos)(ctx, x, y, 8)
}
