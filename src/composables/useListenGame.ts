import { computed, isRef, ref, shallowRef, watch, type Ref } from 'vue'
import type { AnswerKind, ZhuyinWorksheet } from '../types/worksheet'
import { PORTRAIT_LAYOUT, type SheetLayout } from '../canvas/layout'
import { buildListenBoard } from '../data/listenBoard'

/**
 * 聽音遊戲狀態：
 * 1. 棋盤一次含所有已學注音的圓圈（依目前版面產生，畫面與進度用同一組圓圈）
 * 2. 每輪找完當前符號的所有圓圈後換下一個符號
 * 3. 全部符號找完 → isAllDone = true
 * 4. 換版面（轉螢幕）時重建棋盤：已完成的符號保持已找到，當前這輪重新找
 */
export function useListenGame(
  symbols: readonly string[],
  layoutInput: Ref<SheetLayout> | SheetLayout = PORTRAIT_LAYOUT,
) {
  const layout = isRef(layoutInput) ? layoutInput : ref(layoutInput)
  const board = shallowRef<ZhuyinWorksheet>(buildListenBoard(symbols, layout.value))
  const foundCircleIds = ref<string[]>([])
  const completedSymbols = ref<string[]>([])
  const currentSymbol = ref<string>('')
  const isAllDone = ref(false)

  /** 棋盤上實際出現的符號（版面圓圈比符號少時，沒有圓圈的符號不出題） */
  const allSymbols = computed(() => [...new Set(board.value.circles.map((c) => c.symbol))])

  watch(layout, (next) => {
    if (board.value.layoutId === next.id) return
    board.value = buildListenBoard(symbols, next)
    const done = new Set(completedSymbols.value)
    foundCircleIds.value = board.value.circles.filter((c) => done.has(c.symbol)).map((c) => c.id)
    if (!isAllDone.value && currentSymbol.value && !allSymbols.value.includes(currentSymbol.value)) {
      pickNextSymbol()
    }
  })

  const worksheet = computed<ZhuyinWorksheet>(() => ({
    ...board.value,
    targetSymbol: currentSymbol.value,
  }))

  function symbolOf(id: string): string | undefined {
    return board.value.circles.find((c) => c.id === id)?.symbol
  }

  const roundTotal = computed(
    () => board.value.circles.filter((c) => c.symbol === currentSymbol.value).length,
  )

  const roundFound = computed(
    () => foundCircleIds.value.filter((id) => symbolOf(id) === currentSymbol.value).length,
  )

  function pickNextSymbol(): void {
    const remaining = allSymbols.value.filter((s) => !completedSymbols.value.includes(s))
    if (remaining.length === 0) {
      isAllDone.value = true
      return
    }
    const idx = Math.floor(Math.random() * remaining.length)
    currentSymbol.value = remaining[idx]
  }

  function evaluate(circleId: string): AnswerKind {
    const symbol = symbolOf(circleId)
    if (!symbol || symbol !== currentSymbol.value) return 'wrong'
    return foundCircleIds.value.includes(circleId) ? 'already' : 'correct'
  }

  function markFound(circleId: string): { completed: boolean } {
    if (!foundCircleIds.value.includes(circleId)) {
      foundCircleIds.value = [...foundCircleIds.value, circleId]
    }
    return { completed: roundFound.value >= roundTotal.value }
  }

  function advanceToNextSymbol(): void {
    completedSymbols.value = [...completedSymbols.value, currentSymbol.value]
    pickNextSymbol()
  }

  function start(): void {
    foundCircleIds.value = []
    completedSymbols.value = []
    isAllDone.value = false
    currentSymbol.value = ''
    pickNextSymbol()
  }

  return {
    board,
    worksheet,
    foundCircleIds,
    currentSymbol,
    roundFound,
    roundTotal,
    totalFound: computed(() => foundCircleIds.value.length),
    totalCircles: computed(() => board.value.circles.length),
    completedSymbols,
    isAllDone,
    evaluate,
    markFound,
    advanceToNextSymbol,
    start,
  }
}
