/**
 * 彩色電子紙模式的配色。
 *
 * 彩色電子紙（如 Kaleido）的色彩飽和度低、亮度高，粉嫩淡色幾乎會變成白色。
 * 電子紙模式只在「畫出來的時候」把顏色換成飽和、偏深的版本；
 * 存檔裡的筆畫與圓圈仍是原本的顏色，切回一般模式就恢復原樣。
 */

/*
 * 電子紙會把顏色再洗淡一層，所以這裡刻意選「比螢幕上看起來更深、更純」的顏色，
 * 並把容易混在一起的顏色拉開：
 * - 粉紅 → 洋紅（偏紅）；紫色 → 深藍紫（偏藍、明顯更暗）
 * - 黃色 → 純檸檬黃（不帶橘）；橘色 → 紅橘（明顯更深）
 */
const EPAPER_COLORS: Readonly<Record<string, string>> = {
  // 畫筆
  '#FF8FB1': '#D6005F', // 粉紅 → 洋紅
  '#FFD23F': '#F5DC00', // 黃色 → 檸檬黃
  '#5EC2FF': '#0050D0', // 天空藍 → 鈷藍
  '#62D6A4': '#008C3A', // 薄荷綠 → 草綠
  '#A98BFF': '#3F12A8', // 紫色 → 深藍紫
  '#FF9F4A': '#E04000', // 橘色 → 紅橘
  // 答對圓圈的填色（上面還有黑色注音，所以比畫筆稍亮一點）
  '#FFEB99': '#F5DC00',
  '#FFC9D6': '#F03C86',
  '#BFE3FF': '#3385F5',
  '#C4F0DA': '#1FA855',
  '#E2D4FF': '#7A4CEB',
}

/** 電子紙模式下的互動中圓圈外框 */
export const EPAPER_ACTIVE_RING = '#FF8A00'

export function displayColor(color: string, epaper: boolean): string {
  if (!epaper) return color
  return EPAPER_COLORS[color.toUpperCase()] ?? color
}
