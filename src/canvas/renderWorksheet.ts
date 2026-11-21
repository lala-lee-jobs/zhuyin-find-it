/** Layer 1：紙張、外框、雲朵標題、插畫、裝飾 */
import type { ZhuyinWorksheet } from '../types/worksheet'
import { hashString, mulberry32 } from '../core/random'
import {
  FONT_STACK,
  HEADER,
  ILLUSTRATION_SLOTS,
  INK,
  WORKSHEET_HEIGHT,
  WORKSHEET_WIDTH,
} from './layout'
import {
  drawBush,
  drawCloud,
  drawDashedBorder,
  drawFlower,
  drawHeart,
  drawSparkLines,
  drawStar,
  setInk,
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
  drawDashedBorder(ctx)

  const rand = mulberry32(hashString(`${worksheet.id}:decor`))
  drawHeaderDecorations(ctx, rand)
  drawTitle(ctx, worksheet)
  drawIllustrations(ctx, worksheet, opts)
  drawBoardDecorations(ctx, rand)
  drawFooterDecorations(ctx, rand)

  ctx.restore()
}

function drawTitle(ctx: Ctx2D, worksheet: ZhuyinWorksheet): void {
  const { cloud } = HEADER
  drawCloud(ctx, cloud.cx, cloud.cy, cloud.w, cloud.h, 3.5)

  const label = '找找看'
  ctx.save()
  ctx.font = `900 ${HEADER.titleFontSize}px ${FONT_STACK}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const textWidth = Math.min(ctx.measureText(label).width, HEADER.titleFontSize * 3.4)
  const gap = 14
  const total = textWidth + gap + HEADER.titleGlyphSize
  const startX = HEADER.titleCenterX - total / 2
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

function drawIllustrations(ctx: Ctx2D, worksheet: ZhuyinWorksheet, opts: BaseRenderOptions): void {
  const { centersX, imageTop, imageSize, labelY, labelFontSize } = ILLUSTRATION_SLOTS
  worksheet.illustrations.slice(0, 4).forEach((item, i) => {
    const cx = centersX[i]
    const x = cx - imageSize / 2
    const img = opts.images(opts.resolveUrl(item.imageUrl))
    if (img && img !== 'error') {
      ctx.drawImage(img, x, imageTop, imageSize, imageSize)
    } else if (img === 'error') {
      drawIllustrationPlaceholder(ctx, x, imageTop, imageSize)
    }
    ctx.save()
    ctx.font = `700 ${labelFontSize}px ${FONT_STACK}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = INK
    ctx.fillText(item.word, cx, labelY, 180)
    ctx.restore()
  })
}

/** 插畫缺檔時的線稿 placeholder（虛線框＋小圖示），不用 Emoji */
export function drawIllustrationPlaceholder(ctx: Ctx2D, x: number, y: number, size: number): void {
  ctx.save()
  setInk(ctx, 3)
  ctx.setLineDash([8, 7])
  const r = 22
  ctx.beginPath()
  ctx.moveTo(x + r, y + 8)
  ctx.arcTo(x + size - 8, y + 8, x + size - 8, y + size - 8, r)
  ctx.arcTo(x + size - 8, y + size - 8, x + 8, y + size - 8, r)
  ctx.arcTo(x + 8, y + size - 8, x + 8, y + 8, r)
  ctx.arcTo(x + 8, y + 8, x + size - 8, y + 8, r)
  ctx.closePath()
  ctx.stroke()
  ctx.setLineDash([])
  // 小山與太陽
  const cx = x + size / 2
  const cy = y + size / 2
  ctx.beginPath()
  ctx.moveTo(cx - 34, cy + 24)
  ctx.lineTo(cx - 10, cy - 6)
  ctx.lineTo(cx + 6, cy + 12)
  ctx.lineTo(cx + 16, cy + 2)
  ctx.lineTo(cx + 34, cy + 24)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx + 18, cy - 20, 8, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
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

function drawHeaderDecorations(ctx: Ctx2D, rand: () => number): void {
  drawCloud(ctx, 78, 54, 104, 48, 3)
  drawCloud(ctx, 724, 50, 100, 46, 3)
  pick(rand, smallDecos)(ctx, 150, 118, 12)
  pick(rand, smallDecos)(ctx, 46, 120, 11)
  pick(rand, smallDecos)(ctx, 684, 122, 12)
  pick(rand, smallDecos)(ctx, 760, 116, 11)
  drawStar(ctx, 140, 30, 9, 2.4)
}

function drawBoardDecorations(ctx: Ctx2D, rand: () => number): void {
  // 插畫與圓圈之間的草叢與小花
  for (const x of [40, 208, 400, 592, 760]) drawBush(ctx, x, 412, 54, 2.6)
  for (const x of [208, 400, 592]) pick(rand, smallDecos)(ctx, x, 346, 11)

  // 上排圓圈之間
  for (const x of [163, 479]) pick(rand, smallDecos)(ctx, x, 520, 9)
  for (const x of [321, 637]) pick(rand, smallDecos)(ctx, x, 436, 9)

  // 中央大注音旁的強調線
  drawSparkLines(ctx, 262, 566, (-3 * Math.PI) / 4, 16)
  drawSparkLines(ctx, 540, 566, -Math.PI / 4, 16)
  drawSparkLines(ctx, 540, 858, Math.PI / 4, 14)

  // 下排圓圈之間
  for (const x of [163, 479]) pick(rand, smallDecos)(ctx, x, 900, 9)
  for (const x of [321, 637]) pick(rand, smallDecos)(ctx, x, 986, 8)
}

function drawFooterDecorations(ctx: Ctx2D, rand: () => number): void {
  pick(rand, smallDecos)(ctx, 70, 1050, 14)
  pick(rand, smallDecos)(ctx, 140, 1062, 10)
  pick(rand, smallDecos)(ctx, 660, 1062, 10)
  pick(rand, smallDecos)(ctx, 730, 1050, 14)
}
