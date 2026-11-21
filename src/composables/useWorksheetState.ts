/**
 * 學習單狀態：目前題目、每題進度、畫筆設定、靜音，並自動存進 localStorage。
 * 題庫只開放到 unlockedUntilId（含）為止，跟著學校進度由大人調整；
 * 未開放的題目不會出現在題目列，也無法切換過去（已有的進度仍保留）。
 * 筆畫陣列使用 markRaw，避免 Vue 對成千上萬個座標點做深層響應式追蹤。
 */
import { computed, getCurrentScope, markRaw, onScopeDispose, reactive, ref } from 'vue'
import type { BrushSettings, DrawingStroke, WorksheetProgress, ZhuyinWorksheet, AnswerKind } from '../types/worksheet'
import { DEFAULT_UNLOCKED_UNTIL_ID, DEFAULT_WORKSHEET_ID, WORKSHEETS } from '../data/worksheets'
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

  // ───────── 開放題目 ─────────
  const has = (id: string | null | undefined): id is string => !!id && worksheets.some((w) => w.id === id)
  /** 存檔裡的設定 → 預設值 → 全部開放 */
  function resolveUnlocked(id: string | null): string {
    if (has(id)) return id
    if (has(DEFAULT_UNLOCKED_UNTIL_ID)) return DEFAULT_UNLOCKED_UNTIL_ID
    return worksheets[worksheets.length - 1].id
  }
  const unlockedUntilId = ref(resolveUnlocked(loaded.unlockedUntilId))
  const available = computed(() =>
    worksheets.slice(0, worksheets.findIndex((w) => w.id === unlockedUntilId.value) + 1),
  )
  const isAvailable = (id: string) => available.value.some((w) => w.id === id)

  const initialId =
    has(loaded.lastWorksheetId) && isAvailable(loaded.lastWorksheetId)
      ? loaded.lastWorksheetId
      : isAvailable(DEFAULT_WORKSHEET_ID)
        ? DEFAULT_WORKSHEET_ID
        : available.value[0].id

  const currentId = ref(initialId)
  const brush = reactive<BrushSettings>({ ...loaded.brush })
  const muted = ref(loaded.muted)
  const epaper = ref(loaded.epaper)
  const brushSound = ref(loaded.brushSound)

  /** 在已開放題目中的位置 */
  const currentIndex = computed(() => available.value.findIndex((w) => w.id === currentId.value))
  const worksheet = computed(() => worksheets.find((w) => w.id === currentId.value) ?? available.value[0])
  const progress = computed(() => progressMap[currentId.value])
  const hasPrev = computed(() => currentIndex.value > 0)
  const hasNext = computed(() => currentIndex.value < available.value.length - 1)
  const completedIds = computed(() =>
    available.value.filter((w) => progressMap[w.id]?.recognitionCompleted).map((w) => w.id),
  )

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
      unlockedUntilId: unlockedUntilId.value,
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
    if (!isAvailable(id) || id === currentId.value) return
    saveNow() // 切換前先儲存
    currentId.value = id
    saveNow()
  }
  function goNext(wrap = false): void {
    const list = available.value
    const i = currentIndex.value
    if (i < list.length - 1) selectWorksheet(list[i + 1].id)
    else if (wrap) selectWorksheet(list[0].id)
  }
  function goPrev(): void {
    const list = available.value
    const i = currentIndex.value
    if (i > 0) selectWorksheet(list[i - 1].id)
  }

  /** 大人設定：開放到 id 這一題（含）。目前題目被關閉時，跳到最後一個開放的題目 */
  function setUnlockedUntil(id: string): void {
    if (!has(id) || id === unlockedUntilId.value) return
    unlockedUntilId.value = id
    if (!isAvailable(currentId.value)) {
      const list = available.value
      currentId.value = list[list.length - 1].id
    }
    saveNow()
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
  /** 全部重置：清除所有題目（含未開放）的找注音與塗色；大人設定與畫筆保留 */
  function resetAllProgress(): void {
    for (const ws of worksheets) progressMap[ws.id] = rawStrokes(restartPure(ws))
    saveNow()
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
    available,
    unlockedUntilId,
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
    resetAllProgress,
    setBrush,
    setMuted,
    setEpaper,
    setBrushSound,
    setUnlockedUntil,
    saveNow,
  }
}

export type WorksheetState = ReturnType<typeof useWorksheetState>
