/**
 * 19.3 Canvas
 * Node 環境沒有真正的 Canvas，這裡用「記錄繪圖指令的假 Canvas」驗證合成管線：
 * 遮罩、橡皮擦、外框順序、resize 重繪。實際像素結果另以瀏覽器驗證（見 README）。
 */
import { describe, expect, it } from 'vitest'
import { GlyphPaintSurface, type CanvasLike } from '../src/canvas/drawingMask'
import { GLYPH_BOX, GLYPH_STYLE, WORKSHEET_HEIGHT, WORKSHEET_WIDTH } from '../src/canvas/layout'
import {
  glyphBounds,
  isPointInGlyph,
  isPointInPaintableArea,
  layoutGlyph,
  parseSkeletonPath,
} from '../src/canvas/glyphGeometry'
import { clientToLogical, computeBackingSize, computeFitScale } from '../src/canvas/coordinateUtils'
import { findCircleAt, isPointInCircle } from '../src/canvas/hitTesting'
import { WORKSHEETS, findWorksheet } from '../src/data/worksheets'
import type { DrawingStroke } from '../src/types/worksheet'
import { displayColor } from '../src/core/palette'
import type { ProcessedGlyphImage } from '../src/canvas/glyphImage'

// ───────── 假 Canvas ─────────
interface Op {
  canvas: string
  op: string
  gco?: string
  arg?: string
  style?: string
}

function createFakeFactory(log: Op[]) {
  const names = ['paint', 'mask', 'ring', 'scratch']
  let n = 0
  const created: Array<{ name: string; width: number; height: number }> = []
  const factory = (width: number, height: number): CanvasLike => {
    const name = names[n % names.length] + (n >= names.length ? `#${Math.floor(n / names.length)}` : '')
    n++
    const canvas = { name, width, height } as unknown as CanvasLike & { name: string }
    created.push({ name, width, height })
    const stack: string[] = []
    const ctx = {
      globalCompositeOperation: 'source-over',
      strokeStyle: '#000',
      fillStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      save() {
        stack.push(this.globalCompositeOperation)
      },
      restore() {
        this.globalCompositeOperation = stack.pop() ?? 'source-over'
      },
      setTransform() {},
      clearRect() {
        log.push({ canvas: name, op: 'clear' })
      },
      beginPath() {},
      moveTo() {},
      lineTo() {},
      quadraticCurveTo() {},
      arc() {},
      fill() {
        log.push({ canvas: name, op: 'fill', gco: this.globalCompositeOperation })
      },
      stroke() {
        log.push({
          canvas: name,
          op: 'stroke',
          gco: this.globalCompositeOperation,
          arg: String(this.lineWidth),
          style: String(this.strokeStyle),
        })
      },
      drawImage(src: { name: string }) {
        log.push({ canvas: name, op: 'drawImage', gco: this.globalCompositeOperation, arg: src.name })
      },
    }
    ;(canvas as unknown as { getContext: () => unknown }).getContext = () => ctx
    return canvas
  }
  return { factory, created }
}

function createTarget(log: Op[]) {
  const { factory } = createFakeFactory(log)
  const c = factory(1, 1) as unknown as { name: string; getContext: () => CanvasRenderingContext2D }
  c.name = 'screen'
  const ctx = c.getContext()
  // 重新命名紀錄
  const loose = ctx as unknown as { drawImage: (s: { name: string }) => void }
  const origDraw = loose.drawImage.bind(ctx)
  loose.drawImage = (s: { name: string }) => {
    origDraw(s)
    log[log.length - 1].canvas = 'screen'
  }
  const origClear = ctx.clearRect.bind(ctx)
  ctx.clearRect = (...a: [number, number, number, number]) => {
    origClear(...a)
    log[log.length - 1].canvas = 'screen'
  }
  return ctx
}

const layout = layoutGlyph('ㄌ', GLYPH_BOX)!
const brush = (id: string): DrawingStroke => ({
  id,
  color: '#FF8FB1',
  width: 26,
  tool: 'brush',
  points: [
    { x: 300, y: 600 },
    { x: 500, y: 800 },
  ],
})
const eraser = (id: string): DrawingStroke => ({ ...brush(id), tool: 'eraser', width: 39 })

describe('19.3 Canvas 合成管線', () => {
  it('塗色只透過遮罩顯示（destination-in mask），外框最後才畫', () => {
    const log: Op[] = []
    const { factory } = createFakeFactory(log)
    const surface = new GlyphPaintSurface(factory)
    surface.configure(800, 1100, 1, layout)
    surface.syncStrokes([brush('a')])
    log.length = 0
    surface.compose(createTarget(log), brush('active'))

    const maskOp = log.findIndex((o) => o.canvas === 'scratch' && o.op === 'drawImage' && o.arg === 'mask')
    expect(maskOp).toBeGreaterThan(-1)
    expect(log[maskOp].gco).toBe('destination-in')
    // 正在畫的筆畫在遮罩之前加入 scratch
    const activeStroke = log.findIndex((o) => o.canvas === 'scratch' && o.op === 'stroke')
    expect(activeStroke).toBeGreaterThan(-1)
    expect(activeStroke).toBeLessThan(maskOp)

    const screenDraws = log.filter((o) => o.canvas === 'screen' && o.op === 'drawImage').map((o) => o.arg)
    expect(screenDraws).toEqual(['scratch', 'ring'])
  })

  it('橡皮擦只在 paint 圖層使用 destination-out，不會碰到外框', () => {
    const log: Op[] = []
    const { factory } = createFakeFactory(log)
    const surface = new GlyphPaintSurface(factory)
    surface.configure(800, 1100, 1, layout)
    log.length = 0
    surface.syncStrokes([brush('a'), eraser('b')])
    const eraseOps = log.filter((o) => o.gco === 'destination-out')
    expect(eraseOps.length).toBeGreaterThan(0)
    expect(eraseOps.every((o) => o.canvas === 'paint')).toBe(true)
    expect(log.some((o) => o.canvas === 'ring')).toBe(false)
  })

  it('外框圖層：黑色粗線後再挖空內部（只留外框環）', () => {
    const log: Op[] = []
    const { factory } = createFakeFactory(log)
    new GlyphPaintSurface(factory).configure(800, 1100, 1, layout)
    const ringOps = log.filter((o) => o.canvas === 'ring' && o.op === 'stroke')
    expect(ringOps[0].gco).toBe('source-over')
    expect(Number(ringOps[0].arg)).toBe(GLYPH_STYLE.outerWidth)
    expect(ringOps[1].gco).toBe('destination-out')
    expect(Number(ringOps[1].arg)).toBe(layout.innerWidth)
  })

  it('Undo（陣列變短）會整張重畫；新增筆畫只畫新的一筆', () => {
    const log: Op[] = []
    const { factory } = createFakeFactory(log)
    const surface = new GlyphPaintSurface(factory)
    surface.configure(800, 1100, 1, layout)
    const a = brush('a')
    const b = brush('b')
    surface.syncStrokes([a])
    log.length = 0
    surface.syncStrokes([a, b])
    expect(log.filter((o) => o.canvas === 'paint' && o.op === 'stroke')).toHaveLength(1)
    expect(log.some((o) => o.op === 'clear')).toBe(false)

    log.length = 0
    surface.syncStrokes([a]) // undo
    expect(log.some((o) => o.canvas === 'paint' && o.op === 'clear')).toBe(true)
    expect(log.filter((o) => o.canvas === 'paint' && o.op === 'stroke')).toHaveLength(1)
    expect(surface.drawnStrokeCount).toBe(1)
  })

  it('彩色電子紙模式：用飽和色重畫既有筆畫，存檔顏色不變', () => {
    const log: Op[] = []
    const { factory } = createFakeFactory(log)
    const surface = new GlyphPaintSurface(factory)
    surface.configure(800, 1100, 1, layout)
    const strokes = [brush('a')]
    surface.syncStrokes(strokes)
    const paintStyles = () => log.filter((o) => o.canvas === 'paint' && o.op === 'stroke').map((o) => o.style)
    expect(paintStyles()).toEqual(['#FF8FB1'])

    log.length = 0
    surface.setEpaper(true)
    expect(paintStyles()).toEqual([displayColor('#FF8FB1', true)])
    expect(strokes[0].color).toBe('#FF8FB1')

    log.length = 0
    surface.setEpaper(true) // 沒變就不重畫
    expect(paintStyles()).toEqual([])
  })

  it('有注音圖片時：先畫原圖、遮罩改用圖片、最後疊上去白的黑框與筆順', () => {
    const log: Op[] = []
    const { factory } = createFakeFactory(log)
    const surface = new GlyphPaintSurface(factory)
    const image = {
      source: { name: 'glyphSource' },
      overlay: { name: 'glyphOverlay' },
      width: 100,
      height: 100,
      bounds: { x: 0, y: 0, w: 100, h: 100 },
      alpha: new Uint8ClampedArray(0),
    } as unknown as ProcessedGlyphImage
    surface.configure(800, 1100, 1, layout, { image, rect: { x: 250, y: 470, w: 300, h: 300 } })
    surface.syncStrokes([brush('a')])

    // 遮罩畫圖片、外框圖層畫去白後的 overlay，不再畫泡泡字的線條
    expect(log.filter((o) => o.canvas === 'mask' && o.op === 'drawImage').map((o) => o.arg)).toEqual(['glyphSource'])
    expect(log.filter((o) => o.canvas === 'ring' && o.op === 'drawImage').map((o) => o.arg)).toEqual(['glyphOverlay'])
    expect(log.some((o) => (o.canvas === 'mask' || o.canvas === 'ring') && o.op === 'stroke')).toBe(false)

    log.length = 0
    surface.compose(createTarget(log))
    const screen = log.filter((o) => o.canvas === 'screen' && o.op === 'drawImage').map((o) => o.arg)
    expect(screen).toEqual(['glyphSource', 'scratch', 'ring'])
  })

  it('Canvas resize 後筆畫仍存在（以向量資料重畫）', () => {
    const log: Op[] = []
    const { factory, created } = createFakeFactory(log)
    const surface = new GlyphPaintSurface(factory)
    surface.configure(400, 550, 0.5, layout)
    surface.syncStrokes([brush('a'), brush('b'), eraser('c')])
    log.length = 0
    surface.configure(1600, 2200, 2, layout)
    expect(created.slice(-4).every((c) => c.width === 1600 && c.height === 2200)).toBe(true)
    expect(log.filter((o) => o.canvas.startsWith('paint') && o.op === 'stroke')).toHaveLength(3)
    expect(surface.drawnStrokeCount).toBe(3)
    expect(surface.pixelSize).toEqual({ width: 1600, height: 2200, k: 2 })
  })
})

describe('19.3 幾何：遮罩區域、圓圈與畫筆互不干擾', () => {
  it('骨架路徑解析（M / L / Q）', () => {
    const lines = parseSkeletonPath('M0 0 L10 0 M5 5 Q10 10 20 5', 4)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ])
    expect(lines[1]).toHaveLength(5)
    expect(lines[1][4]).toEqual({ x: 20, y: 5 })
  })

  it('每一題的中央注音都完整落在注音方塊附近，不碰到任何圓圈', () => {
    for (const ws of WORKSHEETS) {
      const l = layoutGlyph(ws.targetSymbol, GLYPH_BOX)!
      expect(l).not.toBeNull()
      const b = glyphBounds(l)
      expect(b.minX).toBeGreaterThan(GLYPH_BOX.x - 10)
      expect(b.maxX).toBeLessThan(GLYPH_BOX.x + GLYPH_BOX.size + 10)
      for (const c of ws.circles) {
        // 圓心到注音骨架的距離 > 圓半徑 + 注音半寬 → 完全不重疊
        expect(isPointInGlyph({ x: c.x, y: c.y }, l, c.radius)).toBe(false)
      }
    }
  })

  it('圓圈點擊不會啟動畫筆：圓圈內的點都不在注音範圍', () => {
    const ws = findWorksheet('zhuyin-l')!
    for (const c of ws.circles) {
      for (let a = 0; a < 8; a++) {
        const p = { x: c.x + Math.cos(a) * c.radius * 0.9, y: c.y + Math.sin(a) * c.radius * 0.9 }
        expect(isPointInGlyph(p, layout, 6)).toBe(false)
      }
    }
  })

  it('畫筆不會誤觸圓圈：注音範圍內的點都不在任何圓圈內', () => {
    const ws = findWorksheet('zhuyin-l')!
    for (const line of layout.polylines) {
      for (const p of line) {
        expect(findCircleAt(p.x, p.y, ws.circles, 4)).toBeNull()
      }
    }
  })

  it('遮罩可塗區在注音外框之內', () => {
    const p0 = layout.polylines[0][0]
    expect(isPointInPaintableArea(p0, layout)).toBe(true)
    // 外框環上的點：在注音範圍內，但不可塗色
    const onRing = { x: p0.x, y: p0.y - (layout.outerWidth / 2 - 1) }
    expect(isPointInGlyph(onRing, layout)).toBe(true)
    expect(isPointInPaintableArea(onRing, layout)).toBe(false)
    expect(isPointInGlyph({ x: 30, y: 30 }, layout)).toBe(false)
  })
})

describe('19.3 座標換算與 hit testing', () => {
  it('isPointInCircle 依規格計算', () => {
    const c = { x: 100, y: 100, radius: 46 }
    expect(isPointInCircle(100, 146, c)).toBe(true)
    expect(isPointInCircle(100, 147, c)).toBe(false)
  })

  it('縮放後 hit testing 仍正確（CSS 縮放、頁面位移、不同 devicePixelRatio）', () => {
    const ws = findWorksheet('zhuyin-l')!
    const target = ws.circles[7]
    for (const scale of [0.35, 0.47, 0.8, 1.3]) {
      // 畫布被放在頁面 (37, 81)，CSS 尺寸 = 邏輯尺寸 × scale
      const rect = { left: 37, top: 81, width: WORKSHEET_WIDTH * scale, height: WORKSHEET_HEIGHT * scale }
      for (const dpr of [1, 2, 3]) {
        const backing = computeBackingSize(scale, dpr)
        // dpr 只影響 canvas 像素，不影響指標座標換算
        expect(backing.k).toBeGreaterThan(0)
        const clientX = rect.left + target.x * scale
        const clientY = rect.top + target.y * scale
        const p = clientToLogical(clientX, clientY, rect)
        expect(p.x).toBeCloseTo(target.x, 6)
        expect(p.y).toBeCloseTo(target.y, 6)
        expect(findCircleAt(p.x, p.y, ws.circles)?.id).toBe(target.id)
      }
    }
  })

  it('等比例縮放與高解析度緩衝區', () => {
    expect(computeFitScale(400, 2000)).toBeCloseTo(0.5)
    expect(computeFitScale(2000, 550)).toBeCloseTo(0.5)
    const b = computeBackingSize(0.5, 2)
    expect(b.cssWidth).toBe(400)
    expect(b.width).toBe(800)
    expect(b.k).toBeCloseTo(1)
    // 超大螢幕會限制像素數量
    const big = computeBackingSize(2, 3)
    expect(big.width * big.height).toBeLessThanOrEqual(4_200_000 * 1.01)
  })
})
