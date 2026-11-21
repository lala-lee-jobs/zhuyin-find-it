import { describe, expect, it } from 'vitest'
import { displayColor } from '../src/core/palette'
import { BRUSH_COLORS } from '../src/core/strokes'
import { CIRCLE_FILL_COLORS } from '../src/data/worksheets'

function saturation(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

/** WCAG 相對亮度（人眼感受的明暗） */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function hsl(hex: string): { h: number; l: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  return { h: (h * 60 + 360) % 360, l: (max + min) / 2 }
}

describe('彩色電子紙配色', () => {
  it('任兩個畫筆顏色在電子紙上都分得開：色相差很多，或色相稍近但深淺差很多', () => {
    const colors = BRUSH_COLORS.map((c) => ({ name: c.name, hex: displayColor(c.value, true) }))
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const x = hsl(colors[i].hex)
        const y = hsl(colors[j].hex)
        const hueGap = Math.min(Math.abs(x.h - y.h), 360 - Math.abs(x.h - y.h))
        const [hi, lo] = [luminance(colors[i].hex), luminance(colors[j].hex)].sort((m, n) => n - m)
        const contrast = (hi + 0.05) / (lo + 0.05)
        const ok = hueGap >= 50 || (hueGap >= 25 && contrast >= 2)
        expect(ok, `${colors[i].name} vs ${colors[j].name}：色相差 ${hueGap.toFixed(0)}°、明暗 ${contrast.toFixed(2)}`).toBe(true)
      }
    }
  })

  it('一般模式維持原色', () => {
    for (const c of BRUSH_COLORS) expect(displayColor(c.value, false)).toBe(c.value)
  })

  it('所有畫筆與圓圈填色都有更飽和的電子紙版本', () => {
    const all = [...BRUSH_COLORS.map((c) => c.value), ...CIRCLE_FILL_COLORS]
    for (const c of all) {
      const e = displayColor(c, true)
      expect(e).not.toBe(c)
      expect(e).toMatch(/^#[0-9A-F]{6}$/i)
      expect(saturation(e)).toBeGreaterThan(saturation(c))
    }
    // 不分大小寫
    expect(displayColor('#ff8fb1', true)).toBe(displayColor('#FF8FB1', true))
  })

  it('不認得的顏色原樣保留', () => {
    expect(displayColor('#123456', true)).toBe('#123456')
  })
})
