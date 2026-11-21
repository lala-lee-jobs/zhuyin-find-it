/**
 * 彩色電子紙模式的配色。
 *
 * 彩色電子紙（如 Kaleido）的色彩飽和度低、亮度高，粉嫩淡色幾乎會變成白色。
 * 電子紙模式只在「畫出來的時候」把顏色換成飽和、偏深的版本；
 * 存檔裡的筆畫與圓圈仍是原本的顏色，切回一般模式就恢復原樣。
 */

/*
 * 電子紙會把顏色再洗淡一層，所以這裡刻意選「比螢幕上看起來更深、更純」的顏色，
 * 並讓六個顏色在色相環上盡量分開，色相接近的再用深淺拉開：
 *   黃 55° 亮 → 橘 24° 中亮 → 粉紅 330° 中 → 紫 278° 很暗 → 藍 200° 中 → 綠 145° 中
 * - 紫色偏紅紫、很暗；藍色偏天藍、較亮 → 不會像同一個藍
 * - 粉紅偏洋紅；橘色是純橘（不偏紅）→ 不會像同一個紅
 */
const EPAPER_COLORS: Readonly<Record<string, string>> = {
  // 畫筆
  '#FF8FB1': '#D6006E', // 粉紅 → 洋紅
  '#FFD23F': '#F5DC00', // 黃色 → 檸檬黃
  '#5EC2FF': '#0090E0', // 天空藍 → 天藍
  '#62D6A4': '#008C3A', // 薄荷綠 → 草綠
  '#A98BFF': '#6A00A8', // 紫色 → 深紫
  '#FF9F4A': '#F06000', // 橘色 → 純橘
  // 答對圓圈的填色（上面還有黑色注音，所以比畫筆稍亮一點）
  '#FFEB99': '#F5DC00',
  '#FFC9D6': '#F03C86',
  '#BFE3FF': '#2AA8F0',
  '#C4F0DA': '#1FA855',
  '#E2D4FF': '#9A45D8',
}

/** 電子紙模式下的互動中圓圈外框 */
export const EPAPER_ACTIVE_RING = '#FF8A00'

export function displayColor(color: string, epaper: boolean): string {
  if (!epaper) return color
  return EPAPER_COLORS[color.toUpperCase()] ?? color
}
