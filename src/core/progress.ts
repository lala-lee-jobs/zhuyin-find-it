/**
 * 進度的純函式。找注音與自由塗色是兩個完全獨立的欄位：
 * 任何辨識相關函式都不會碰 drawingStrokes，反之亦然。
 */
import type { AnswerKind, DrawingStroke, WorksheetProgress, ZhuyinWorksheet } from '../types/worksheet'

export function getCorrectCircleIds(worksheet: ZhuyinWorksheet): string[] {
  return worksheet.circles.filter((c) => c.symbol === worksheet.targetSymbol).map((c) => c.id)
}

export function createEmptyProgress(worksheet: ZhuyinWorksheet): WorksheetProgress {
  return {
    worksheetId: worksheet.id,
    foundCircleIds: [],
    totalCorrectCircles: getCorrectCircleIds(worksheet).length,
    recognitionCompleted: false,
    drawingStrokes: [],
    drawingModified: false,
  }
}

/** 判斷點擊結果（不改變進度） */
export function evaluateTap(
  worksheet: ZhuyinWorksheet,
  progress: WorksheetProgress,
  circleId: string,
): AnswerKind {
  const circle = worksheet.circles.find((c) => c.id === circleId)
  if (!circle || circle.symbol !== worksheet.targetSymbol) return 'wrong'
  return progress.foundCircleIds.includes(circleId) ? 'already' : 'correct'
}

export interface MarkFoundResult {
  progress: WorksheetProgress
  /** 這次是否有新增計分 */
  scored: boolean
  /** 這次點擊是否剛好完成全部 */
  completedNow: boolean
}

export function markCircleFound(
  worksheet: ZhuyinWorksheet,
  progress: WorksheetProgress,
  circleId: string,
): MarkFoundResult {
  if (evaluateTap(worksheet, progress, circleId) !== 'correct') {
    return { progress, scored: false, completedNow: false }
  }
  const foundCircleIds = [...progress.foundCircleIds, circleId]
  const total = getCorrectCircleIds(worksheet).length
  const recognitionCompleted = foundCircleIds.length >= total
  return {
    progress: {
      ...progress,
      foundCircleIds,
      totalCorrectCircles: total,
      recognitionCompleted,
    },
    scored: true,
    completedNow: recognitionCompleted && !progress.recognitionCompleted,
  }
}

export function addStroke(progress: WorksheetProgress, stroke: DrawingStroke): WorksheetProgress {
  return { ...progress, drawingStrokes: [...progress.drawingStrokes, stroke], drawingModified: true }
}

export function undoLastStroke(progress: WorksheetProgress): WorksheetProgress {
  if (progress.drawingStrokes.length === 0) return progress
  const drawingStrokes = progress.drawingStrokes.slice(0, -1)
  return { ...progress, drawingStrokes, drawingModified: drawingStrokes.length > 0 }
}

/** 清除塗色：只清中央畫筆，不影響找注音進度 */
export function clearDrawing(progress: WorksheetProgress): WorksheetProgress {
  return { ...progress, drawingStrokes: [], drawingModified: false }
}

/** 再玩一次：只重設找注音，保留塗色 */
export function resetRecognition(worksheet: ZhuyinWorksheet, progress: WorksheetProgress): WorksheetProgress {
  return {
    ...progress,
    foundCircleIds: [],
    totalCorrectCircles: getCorrectCircleIds(worksheet).length,
    recognitionCompleted: false,
  }
}

/** 重新開始本題：清除答題與塗色 */
export function restartWorksheet(worksheet: ZhuyinWorksheet): WorksheetProgress {
  return createEmptyProgress(worksheet)
}

/**
 * 讀取舊進度時校正：去掉題庫中已不存在或不是目標注音的圓圈 id、
 * 重新計算總數與完成狀態。題庫改版時不會因此壞掉。
 */
export function normalizeProgress(
  worksheet: ZhuyinWorksheet,
  progress: WorksheetProgress | undefined | null,
): WorksheetProgress {
  if (!progress || progress.worksheetId !== worksheet.id) return createEmptyProgress(worksheet)
  const correct = new Set(getCorrectCircleIds(worksheet))
  const foundCircleIds = Array.from(new Set(progress.foundCircleIds.filter((id) => correct.has(id))))
  return {
    worksheetId: worksheet.id,
    foundCircleIds,
    totalCorrectCircles: correct.size,
    recognitionCompleted: correct.size > 0 && foundCircleIds.length >= correct.size,
    drawingStrokes: progress.drawingStrokes,
    drawingModified: progress.drawingStrokes.length > 0,
  }
}
