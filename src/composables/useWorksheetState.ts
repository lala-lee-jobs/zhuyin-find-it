/**
 * 學習單狀態：目前題目、每題進度、畫筆設定、靜音，並自動存進 localStorage。
 * 筆畫陣列使用 markRaw，避免 Vue 對成千上萬個座標點做深層響應式追蹤。
 */
import { computed, getCurrentScope, markRaw, onScopeDispose, reactive, ref } from 'vue'
import type { BrushSettings, DrawingStroke, WorksheetProgress, ZhuyinWorksheet, AnswerKind } from '../types/worksheet'
import { DEFAULT_WORKSHEET_ID, WORKSHEETS } from '../data/worksheets'
import {
  addStroke as addStrokePure,
  clearDrawing as clearDrawingPure,
  evaluateTap,
  markCircleFound,
  normalizeProgress,
  resetRecognition,
  restartWorksheet as restartPure,
  undoLastStroke,
} from '../core/progress'
import { StorageService, safeLocalStorage } from '../services/StorageService'

export interface WorksheetStateOptions {
  worksheets?: readonly ZhuyinWorksheet[]
  storage?: StorageService
  saveDelayMs?: number
}

function rawStrokes(progress: WorksheetProgress): WorksheetProgress {
  return { ...progress, drawingStrokes: markRaw(progress.drawingStrokes.slice()) }
}

export function useWorksheetState(options: WorksheetStateOptions = {}) {
  const worksheets = options.worksheets ?? WORKSHEETS
  const storage = options.storage ?? new StorageService(safeLocalStorage())
  const saveDelay = options.saveDelayMs ?? 400
  const loaded = storage.load()

  const progressMap = reactive<Record<string, WorksheetProgress>>({})
  for (const ws of worksheets) {
    progressMap[ws.id] = rawStrokes(normalizeProgress(ws, loaded.progress[ws.id]))
  }

  const initialId =
    loaded.lastWorksheetId && worksheets.some((w) => w.id === loaded.lastWorksheetId)
      ? loaded.lastWorksheetId
      : worksheets.some((w) => w.id === DEFAULT_WORKSHEET_ID)
        ? DEFAULT_WORKSHEET_ID
        : worksheets[0].id

  const currentId = ref(initialId)
  const brush = reactive<BrushSettings>({ ...loaded.brush })
  const muted = ref(loaded.muted)
  const epaper = ref(loaded.epaper)
  const brushSound = ref(loaded.brushSound)

  const currentIndex = computed(() => worksheets.findIndex((w) => w.id === currentId.value))
  const worksheet = computed(() => worksheets[Math.max(0, currentIndex.value)])
  const progress = computed(() => progressMap[currentId.value])
  const hasPrev = computed(() => currentIndex.value > 0)
  const hasNext = computed(() => currentIndex.value < worksheets.length - 1)
  const completedIds = computed(() => worksheets.filter((w) => progressMap[w.id]?.recognitionCompleted).map((w) => w.id))

  // ───────── 儲存 ─────────
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function saveNow(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    storage.save({
      version: 1,
      lastWorksheetId: currentId.value,
      brush: { ...brush },
      muted: muted.value,
      epaper: epaper.value,
      brushSound: brushSound.value,
      progress: { ...progressMap },
    })
  }

  function scheduleSave(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(saveNow, saveDelay)
  }

  const onHide = () => {
    if (document.visibilityState === 'hidden') saveNow()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', saveNow)
    document.addEventListener('visibilitychange', onHide)
  }
  if (getCurrentScope()) {
    onScopeDispose(() => {
      saveNow()
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', saveNow)
        document.removeEventListener('visibilitychange', onHide)
      }
    })
  }

  function setProgress(id: string, next: WorksheetProgress): void {
    progressMap[id] = next.drawingStrokes === progressMap[id]?.drawingStrokes ? next : rawStrokes(next)
    scheduleSave()
  }

  // ───────── 題目切換 ─────────
  function selectWorksheet(id: string): void {
    if (!worksheets.some((w) => w.id === id) || id === currentId.value) return
    saveNow() // 切換前先儲存
    currentId.value = id
    saveNow()
  }
  function goNext(wrap = false): void {
    const i = currentIndex.value
    if (i < worksheets.length - 1) selectWorksheet(worksheets[i + 1].id)
    else if (wrap) selectWorksheet(worksheets[0].id)
  }
  function goPrev(): void {
    const i = currentIndex.value
    if (i > 0) selectWorksheet(worksheets[i - 1].id)
  }

  // ───────── 找注音 ─────────
  function evaluate(circleId: string): AnswerKind {
    return evaluateTap(worksheet.value, progress.value, circleId)
  }
  function markFound(circleId: string): { completed: boolean } {
    const ws = worksheet.value
    const result = markCircleFound(ws, progressMap[ws.id], circleId)
    if (result.scored) setProgress(ws.id, result.progress)
    return { completed: result.completedNow }
  }
  function replayRecognition(): void {
    const ws = worksheet.value
    setProgress(ws.id, resetRecognition(ws, progressMap[ws.id]))
  }

  // ───────── 塗色 ─────────
  function addStroke(stroke: DrawingStroke): void {
    const id = currentId.value
    setProgress(id, addStrokePure(progressMap[id], stroke))
  }
  function undoStroke(): void {
    const id = currentId.value
    setProgress(id, undoLastStroke(progressMap[id]))
  }
  function clearDrawing(): void {
    const id = currentId.value
    setProgress(id, clearDrawingPure(progressMap[id]))
  }
  function restartWorksheet(): void {
    const ws = worksheet.value
    setProgress(ws.id, restartPure(ws))
  }

  // ───────── 設定 ─────────
  function setBrush(patch: Partial<BrushSettings>): void {
    Object.assign(brush, patch)
    scheduleSave()
  }
  function setMuted(value: boolean): void {
    muted.value = value
    scheduleSave()
  }
  function setEpaper(value: boolean): void {
    epaper.value = value
    scheduleSave()
  }
  function setBrushSound(value: boolean): void {
    brushSound.value = value
    scheduleSave()
  }

  return {
    worksheets,
    currentId,
    currentIndex,
    worksheet,
    progress,
    progressMap,
    completedIds,
    hasPrev,
    hasNext,
    brush,
    muted,
    epaper,
    brushSound,
    selectWorksheet,
    goNext,
    goPrev,
    evaluate,
    markFound,
    replayRecognition,
    addStroke,
    undoStroke,
    clearDrawing,
    restartWorksheet,
    setBrush,
    setMuted,
    setEpaper,
    setBrushSound,
    saveNow,
  }
}

export type WorksheetState = ReturnType<typeof useWorksheetState>
