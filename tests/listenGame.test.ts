import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { SHEET_LAYOUTS, type SheetLayout } from '../src/canvas/layout'
import { WORKSHEETS, placeCircles } from '../src/data/worksheets'
import { buildListenBoard } from '../src/data/listenBoard'
import { useListenGame } from '../src/composables/useListenGame'

const ALL_SYMBOLS = WORKSHEETS.map((w) => w.targetSymbol)
const LAYOUTS = Object.values(SHEET_LAYOUTS)
/** 已學注音數量的各種情況：1 個、少量、剛好等於/超過各版面圓圈數、全部 */
const SYMBOL_COUNTS = [...new Set([1, 2, 3, 5, 8, 13, 20, 26, 27, 37, ALL_SYMBOLS.length])].filter(
  (n) => n <= ALL_SYMBOLS.length,
)

/** 跑完整場遊戲，每一輪都檢查「畫面上的圓圈數」＝「進度顯示的總數」 */
function playThrough(symbols: readonly string[], layout: SheetLayout) {
  const game = useListenGame(symbols, layout)
  game.start()
  let rounds = 0
  while (!game.isAllDone.value) {
    const target = game.currentSymbol.value
    // 畫面實際畫出的圓圈（WorksheetCanvas 用 placeCircles）
    const rendered = placeCircles(game.worksheet.value, layout).filter((c) => c.symbol === target)
    expect(rendered.length, `${layout.id} ${target}`).toBe(game.roundTotal.value)
    expect(rendered.length).toBeGreaterThan(0)
    expect(game.roundFound.value).toBe(0)
    rendered.forEach((c, i) => {
      expect(game.evaluate(c.id)).toBe('correct')
      const { completed } = game.markFound(c.id)
      expect(game.evaluate(c.id)).toBe('already')
      expect(game.roundFound.value).toBe(i + 1)
      expect(completed).toBe(i === rendered.length - 1)
    })
    game.advanceToNextSymbol()
    rounds++
  }
  return { rounds, game }
}

describe('聽音找注音：圓圈與進度對應', () => {
  for (const layout of LAYOUTS) {
    for (const n of SYMBOL_COUNTS) {
      it(`${layout.id} 版面、${n} 個注音：每輪畫面圓圈數＝進度總數`, () => {
        const symbols = ALL_SYMBOLS.slice(0, n)
        const { rounds, game } = playThrough(symbols, layout)
        expect(rounds).toBe(Math.min(n, layout.slots.length))
        expect(game.totalFound.value).toBe(layout.slots.length)
      })
    }
  }

  it('棋盤圓圈依版面產生：數量＝槽位數、都在紙張內、不重疊、不蓋到中央「?」', () => {
    for (const layout of LAYOUTS) {
      const board = buildListenBoard(ALL_SYMBOLS, layout)
      expect(board.circles).toHaveLength(layout.slots.length)
      expect(placeCircles(board, layout)).toBe(board.circles)
      expect(new Set(board.circles.map((c) => c.id)).size).toBe(board.circles.length)
      const g = layout.glyphBox
      for (const c of board.circles) {
        expect(c.x - c.radius).toBeGreaterThanOrEqual(0)
        expect(c.x + c.radius).toBeLessThanOrEqual(layout.width)
        expect(c.y - c.radius).toBeGreaterThanOrEqual(layout.board.top)
        expect(c.y + c.radius).toBeLessThanOrEqual(layout.board.bottom)
        const insideGlyph = c.x > g.x && c.x < g.x + g.size && c.y > g.y && c.y < g.y + g.size
        expect(insideGlyph, `${layout.id} ${c.id}`).toBe(false)
      }
      for (let i = 0; i < board.circles.length; i++)
        for (let j = i + 1; j < board.circles.length; j++) {
          const a = board.circles[i]
          const b = board.circles[j]
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.radius + b.radius)
        }
    }
  })

  it('每個注音在棋盤上的數量最多只差 1 個（平均分配）', () => {
    for (const layout of LAYOUTS) {
      for (const n of SYMBOL_COUNTS) {
        const board = buildListenBoard(ALL_SYMBOLS.slice(0, n), layout)
        const counts = new Map<string, number>()
        board.circles.forEach((c) => counts.set(c.symbol, (counts.get(c.symbol) ?? 0) + 1))
        const values = [...counts.values()]
        expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('中途轉螢幕換版面：已完成的注音保持已找到，當前這輪重新計算且仍對應', async () => {
    const layout = ref<SheetLayout>(SHEET_LAYOUTS.portrait)
    const symbols = ALL_SYMBOLS.slice(0, 5)
    const game = useListenGame(symbols, layout)
    game.start()
    // 完成第一輪
    const first = game.currentSymbol.value
    for (const c of game.board.value.circles.filter((c) => c.symbol === first)) game.markFound(c.id)
    game.advanceToNextSymbol()
    // 第二輪找到一個後轉螢幕
    const second = game.currentSymbol.value
    game.markFound(game.board.value.circles.find((c) => c.symbol === second)!.id)

    for (const next of [SHEET_LAYOUTS.landscape, SHEET_LAYOUTS.narrow]) {
      layout.value = next
      await nextTick()
      expect(game.board.value.layoutId).toBe(next.id)
      expect(game.currentSymbol.value).toBe(second)
      expect(game.roundFound.value).toBe(0)
      const rendered = placeCircles(game.worksheet.value, next).filter((c) => c.symbol === second)
      expect(rendered.length).toBe(game.roundTotal.value)
      const firstIds = game.board.value.circles.filter((c) => c.symbol === first).map((c) => c.id)
      expect([...game.foundCircleIds.value].sort()).toEqual(firstIds.sort())
    }
  })
})
