<script setup lang="ts">
/**
 * 學習單 Canvas：三張疊合的 canvas
 *   base    ── Layer 1：紙張、標題、裝飾（靜態）
 *   drawing ── Layer 2–4：注音遮罩內的自由塗色＋黑色外框
 *   circles ── Layer 5–6：注音圓圈、填色動畫、互動提示
 *
 * 指標事件統一由外層 div 接收，換算成邏輯座標後分流：
 *   1. 命中圓圈 → 視為「點擊」（放開時仍在同一圓圈內才觸發，避免滑動誤觸）
 *   2. 命中中央注音 → 開始畫筆（setPointerCapture，之後移到圓圈上也不會答題）
 *   3. 其他區域 → 不做任何事
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type {
  BrushSettings,
  DrawingPoint,
  DrawingStroke,
  DrawingTool,
  ZhuyinCircle,
  ZhuyinWorksheet,
} from '../types/worksheet'
import { PORTRAIT_LAYOUT, type SheetLayout } from '../canvas/layout'
import { clientToLogical, computeBackingSize } from '../canvas/coordinateUtils'
import { findCircleAt, isPointInCircle } from '../canvas/hitTesting'
import { isPointInGlyph, layoutGlyph } from '../canvas/glyphGeometry'
import { renderBase } from '../canvas/renderWorksheet'
import { renderCircles } from '../canvas/renderCircles'
import { lookupImage } from '../canvas/imageCache'
import { assetUrl } from '../utils/assetUrl'
import { useCanvasDrawing } from '../composables/useCanvasDrawing'
import { defaultCanvasFactory, type StrokeTransform } from '../canvas/drawingMask'
import {
  isPointInGlyphImage,
  placeGlyphImage,
  processGlyphImage,
  strokeTransformBetween,
  type PlacedGlyphImage,
  type ProcessedGlyphImage,
} from '../canvas/glyphImage'
import { getGlyphImageUrl } from '../data/zhuyinGlyphImages'
import { placeCircles } from '../data/worksheets'
import { loadImage } from '../canvas/imageCache'

const props = defineProps<{
  worksheet: ZhuyinWorksheet
  foundIds: readonly string[]
  strokes: readonly DrawingStroke[]
  brush: BrushSettings
  /** CSS 像素 / 邏輯單位 */
  scale: number
  dpr: number
  activeCircleId: string | null
  /** Popup 開啟中：不接受點擊與畫筆 */
  locked: boolean
  /** 彩色電子紙模式 */
  epaper: boolean
  /** 版面（直式／橫式／手機窄版） */
  layout: SheetLayout
  /** 聽音模式：隱藏中央大注音（泡泡字＋外框），只保留圓圈 */
  hideGlyph?: boolean
}>()

const emit = defineEmits<{
  (e: 'circle-tap', circle: ZhuyinCircle): void
  (e: 'stroke-commit', stroke: DrawingStroke): void
  /** 筆刷音效用 */
  (e: 'stroke-start', tool: DrawingTool): void
  (e: 'stroke-move', distance: number): void
  (e: 'stroke-end'): void
}>()

/** 點擊圓圈時，手指移動超過這個距離（邏輯單位）就視為滑動、不觸發 */
const TAP_MOVE_TOLERANCE = 26
/** 點擊判定容錯：手指稍微點在圓外也算 */
const TAP_SLOP = 4

const root = ref<HTMLDivElement | null>(null)
const baseCanvas = ref<HTMLCanvasElement | null>(null)
const drawCanvas = ref<HTMLCanvasElement | null>(null)
const circleCanvas = ref<HTMLCanvasElement | null>(null)

const backing = computed(() =>
  computeBackingSize(props.scale, props.dpr, {}, props.layout.width, props.layout.height),
)
const glyphLayout = computed(() => layoutGlyph(props.worksheet.targetSymbol, props.layout.glyphBox))
const foundSet = computed(() => new Set(props.foundIds))
/** 這個版面上的圓圈（直式 40 個；橫式、手機窄版比較少，但正確的圓圈都在） */
const circleViews = computed<ZhuyinCircle[]>(() =>
  placeCircles(props.worksheet, props.layout).map((c) => ({ ...c, isFound: foundSet.value.has(c.id) })),
)

// ───────── 繪製排程（rAF 合併多次請求） ─────────
const dirty = { base: true, drawing: true, circles: true }
let frame = 0
const fillAnimations = new Map<string, number>()

function requestRender(part: 'base' | 'drawing' | 'circles' | 'all' = 'all'): void {
  if (part === 'all') {
    dirty.base = dirty.drawing = dirty.circles = true
  } else {
    dirty[part] = true
  }
  if (!frame) frame = requestAnimationFrame(renderFrame)
}

function renderFrame(now: number): void {
  frame = 0
  const { width, height, k } = backing.value
  if (dirty.base && baseCanvas.value) {
    dirty.base = false
    const ctx = baseCanvas.value.getContext('2d')
    if (ctx)
      renderBase(ctx, props.worksheet, {
        k,
        width,
        height,
        images: lookupImage,
        resolveUrl: assetUrl,
        layout: props.layout,
        hideGlyph: props.hideGlyph,
      })
  }
  if (dirty.drawing && drawCanvas.value) {
    dirty.drawing = false
    const ctx = drawCanvas.value.getContext('2d')
    if (ctx) {
      if (props.hideGlyph) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, drawCanvas.value.width, drawCanvas.value.height)
      } else {
        drawing.compose(ctx)
      }
    }
  }
  if (dirty.circles && circleCanvas.value) {
    dirty.circles = false
    const ctx = circleCanvas.value.getContext('2d')
    if (ctx) {
      const animating = renderCircles(ctx, circleViews.value, {
        k,
        now,
        animations: fillAnimations,
        activeCircleId: props.activeCircleId,
        width,
        height,
        epaper: props.epaper,
      })
      if (animating) requestRender('circles')
      else fillAnimations.clear()
    }
  }
}

const drawing = useCanvasDrawing({
  getBrush: () => props.brush,
  onCommit: (stroke) => emit('stroke-commit', stroke),
  requestRender: () => requestRender('drawing'),
  onStrokeStart: (tool) => emit('stroke-start', tool),
  onStrokeMove: (distance) => emit('stroke-move', distance),
  onStrokeEnd: () => emit('stroke-end'),
})

// ───────── 中央注音圖片（PNG） ─────────
/** 處理過的圖片快取（每個網址只處理一次）；null 代表處理失敗、改用泡泡字 */
const processedImages = new Map<string, ProcessedGlyphImage | null>()
const processedImage = shallowRef<ProcessedGlyphImage | null>(null)
const glyphImage = computed<PlacedGlyphImage | null>(() => {
  const image = processedImage.value
  if (!image) return null
  return { image, rect: placeGlyphImage(image.bounds, image.width, image.height, props.layout.glyphImageArea) }
})

/**
 * 筆畫以直式版面的座標儲存；其他版面依大注音的位置與大小換算。
 * 有圖片時以圖片的放置位置對齊，沒有圖片時以泡泡字方塊對齊。
 */
const strokeTransform = computed<StrokeTransform>(() =>
  strokeTransformBetween(processedImage.value, PORTRAIT_LAYOUT, props.layout),
)
/** 版面座標 → 儲存用（直式）座標 */
function toStored(p: DrawingPoint): DrawingPoint {
  const { a, tx, ty } = strokeTransform.value
  return { x: (p.x - tx) / a, y: (p.y - ty) / a }
}

/** 換題時呼叫：有圖片就載入；載入前、失敗時都顯示原本的泡泡字 */
function loadGlyphImage(): void {
  processedImage.value = null
  const url = getGlyphImageUrl(props.worksheet.targetSymbol)
  if (!url) return
  const id = props.worksheet.id
  const ready = (): void => {
    if (props.worksheet.id !== id) return
    if (!processedImages.has(url)) {
      const img = lookupImage(url)
      let processed: ProcessedGlyphImage | null = null
      if (img && img !== 'error') {
        try {
          processed = processGlyphImage(img, defaultCanvasFactory)
        } catch {
          processed = null
        }
      }
      processedImages.set(url, processed)
    }
    const processed = processedImages.get(url)
    if (processed) {
      processedImage.value = processed
      applySize()
    }
  }
  if (processedImages.has(url)) ready()
  else loadImage(url, ready)
}

// ───────── 尺寸 ─────────
function applySize(): void {
  const { width, height, k } = backing.value
  for (const c of [baseCanvas.value, drawCanvas.value, circleCanvas.value]) {
    if (!c) continue
    if (c.width !== width) c.width = width
    if (c.height !== height) c.height = height
  }
  // 以向量筆畫重建：resize 後塗色不會遺失
  drawing.setEpaper(props.epaper)
  drawing.configure(width, height, k, glyphLayout.value, glyphImage.value, strokeTransform.value)
  drawing.sync(props.strokes)
  requestRender('all')
}

onMounted(() => {
  applySize()
  loadGlyphImage()
  // 系統字型載入完成後重繪標題文字
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(() => requestRender('base')).catch(() => undefined)
  }
})

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
})

watch(backing, applySize)
watch(() => props.hideGlyph, () => requestRender('all'))
// 換版面（轉螢幕）：圓圈、大注音位置都變了，整個重畫
watch(
  () => props.layout,
  () => {
    drawing.discard()
    pendingTap = null
    fillAnimations.clear()
    applySize()
  },
)

watch(
  () => props.worksheet.id,
  () => {
    drawing.discard()
    pendingTap = null
    fillAnimations.clear()
    applySize()
    loadGlyphImage()
  },
)

watch(
  () => props.strokes,
  (strokes) => {
    drawing.sync(strokes)
    requestRender('drawing')
  },
)

// 新找到的圓圈 → 播放填色動畫（換題或初次載入時不播）
watch(
  () => [props.worksheet.id, props.foundIds] as const,
  ([id, ids], old) => {
    if (old && old[0] === id) {
      const before = new Set(old[1])
      const now = performance.now()
      for (const cid of ids) if (!before.has(cid)) fillAnimations.set(cid, now)
    }
    requestRender('circles')
  },
)

watch(
  () => props.epaper,
  (epaper) => {
    drawing.setEpaper(epaper)
    fillAnimations.clear()
    requestRender('all')
  },
)

watch(
  () => props.activeCircleId,
  () => requestRender('circles'),
)

watch(
  () => props.locked,
  (locked) => {
    if (locked) pendingTap = null
  },
)

// ───────── 指標事件 ─────────
interface PendingTap {
  pointerId: number
  circle: ZhuyinCircle
  start: DrawingPoint
}
let pendingTap: PendingTap | null = null

function toLogical(e: PointerEvent): DrawingPoint {
  const rect = root.value?.getBoundingClientRect()
  if (!rect) return { x: -1, y: -1 }
  return clientToLogical(e.clientX, e.clientY, rect, props.layout.width, props.layout.height)
}

function onPointerDown(e: PointerEvent): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  // 正在畫畫時忽略第二根手指（避免手掌誤觸）
  if (drawing.isDrawing() || pendingTap) return
  if (props.locked) return
  const p = toLogical(e)

  // 1. 圓圈優先
  const circle = findCircleAt(p.x, p.y, circleViews.value, TAP_SLOP)
  if (circle) {
    pendingTap = { pointerId: e.pointerId, circle, start: p }
    e.preventDefault()
    return
  }

  // 2. 中央注音 → 畫筆
  const layout = glyphLayout.value
  const onGlyph = glyphImage.value ? isPointInGlyphImage(p, glyphImage.value, 6) : !!layout && isPointInGlyph(p, layout, 6)
  if (onGlyph) {
    e.preventDefault()
    try {
      root.value?.setPointerCapture(e.pointerId)
    } catch {
      /* 某些瀏覽器在合成事件上不允許 capture */
    }
    drawing.begin(e.pointerId, toStored(p))
  }
  // 3. 其他區域：不處理
}

function onPointerMove(e: PointerEvent): void {
  if (drawing.isDrawing(e.pointerId)) {
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : []
    const list = events.length > 0 ? events : [e]
    drawing.extend(
      e.pointerId,
      list.map((ev) => toStored(toLogical(ev))),
    )
    e.preventDefault()
    return
  }
  if (pendingTap && pendingTap.pointerId === e.pointerId) {
    const p = toLogical(e)
    if (Math.hypot(p.x - pendingTap.start.x, p.y - pendingTap.start.y) > TAP_MOVE_TOLERANCE) pendingTap = null
  }
}

function onPointerUp(e: PointerEvent): void {
  if (drawing.isDrawing(e.pointerId)) {
    drawing.end(e.pointerId)
    releaseCapture(e.pointerId)
    return
  }
  if (pendingTap && pendingTap.pointerId === e.pointerId) {
    const tap = pendingTap
    pendingTap = null
    const p = toLogical(e)
    if (!props.locked && isPointInCircle(p.x, p.y, tap.circle, TAP_SLOP + 6)) {
      // 同步 emit：讓發音在使用者手勢內開始（iOS 自動播放限制）
      emit('circle-tap', tap.circle)
    }
  }
}

function onPointerCancel(e: PointerEvent): void {
  if (drawing.isDrawing(e.pointerId)) {
    // 保留孩子已經畫的部分
    drawing.end(e.pointerId)
    releaseCapture(e.pointerId)
  }
  if (pendingTap?.pointerId === e.pointerId) pendingTap = null
}

function releaseCapture(pointerId: number): void {
  try {
    if (root.value?.hasPointerCapture(pointerId)) root.value.releasePointerCapture(pointerId)
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div
    ref="root"
    class="worksheet-canvas"
    :style="{ width: `${backing.cssWidth}px`, height: `${backing.cssHeight}px` }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
    @contextmenu.prevent
  >
    <canvas ref="baseCanvas" class="layer" aria-hidden="true" />
    <canvas ref="drawCanvas" class="layer" aria-hidden="true" />
    <canvas
      ref="circleCanvas"
      class="layer"
      role="img"
      :aria-label="`${worksheet.title} 學習單，中央大注音可以塗色，周圍有 ${circleViews.length} 個注音圓圈`"
    />
  </div>
</template>

<style scoped>
.worksheet-canvas {
  position: relative;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
</style>
