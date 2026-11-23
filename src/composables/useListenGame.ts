import { computed, ref } from 'vue'
import type { AnswerKind, ZhuyinWorksheet } from '../types/worksheet'
import { buildListenBoard } from '../data/listenBoard'

/**
 * 聽音遊戲狀態：
 * 1. 棋盤一次含所有已學注音的圓圈
 * 2. 每輪找完當前符號的所有圓圈後換下一個符號
 * 3. 全部符號找完 → isAllDone = true
 */
export function useListenGame(symbols: readonly string[]) {
  const board = buildListenBoard(symbols)
  const foundCircleIds = ref<string[]>([])
  const completedSymbols = ref<string[]>([])
  const currentSymbol = ref<string>('')
  const isAllDone = ref(false)

  const allSymbols = [...new Set(board.circles.map((c) => c.symbol))]

  const worksheet = computed<ZhuyinWorksheet>(() => ({
    ...board,
    targetSymbol: currentSymbol.value,
  }))

  const roundTotal = computed(
    () => board.circles.filter((c) => c.symbol === currentSymbol.value).length,
  )

  const roundFound = computed(
    () =>
      foundCircleIds.value.filter(
        (id) => board.circles.find((c) => c.id === id)?.symbol === currentSymbol.value,
      ).length,
  )

  function pickNextSymbol(): void {
    const remaining = allSymbols.filter((s) => !completedSymbols.value.includes(s))
    if (remaining.length === 0) {
      isAllDone.value = true
      return
    }
    const idx = Math.floor(Math.random() * remaining.length)
    currentSymbol.value = remaining[idx]
  }

  function evaluate(circleId: string): AnswerKind {
    const circle = board.circles.find((c) => c.id === circleId)
    if (!circle || circle.symbol !== currentSymbol.value) return 'wrong'
    return foundCircleIds.value.includes(circleId) ? 'already' : 'correct'
  }

  function markFound(circleId: string): { completed: boolean } {
    if (!foundCircleIds.value.includes(circleId)) {
      foundCircleIds.value = [...foundCircleIds.value, circleId]
    }
    const newRoundFound = foundCircleIds.value.filter(
      (id) => board.circles.find((c) => c.id === id)?.symbol === currentSymbol.value,
    ).length
    return { completed: newRoundFound >= roundTotal.value }
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
    totalCircles: board.circles.length,
    completedSymbols,
    isAllDone,
    evaluate,
    markFound,
    advanceToNextSymbol,
    start,
  }
}
