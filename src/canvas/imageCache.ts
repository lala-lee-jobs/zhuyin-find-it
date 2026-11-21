/** 插畫圖片快取：載入完成或失敗時通知重繪；失敗時改畫 placeholder */
type Status = 'loading' | 'loaded' | 'error'

interface Entry {
  img: HTMLImageElement
  status: Status
  listeners: Set<() => void>
}

const cache = new Map<string, Entry>()

export function loadImage(url: string, onSettled?: () => void): void {
  if (typeof Image === 'undefined') return
  let entry = cache.get(url)
  if (!entry) {
    const img = new Image()
    img.decoding = 'async'
    entry = { img, status: 'loading', listeners: new Set() }
    cache.set(url, entry)
    const e = entry
    img.onload = () => {
      e.status = 'loaded'
      e.listeners.forEach((fn) => fn())
      e.listeners.clear()
    }
    img.onerror = () => {
      e.status = 'error'
      e.listeners.forEach((fn) => fn())
      e.listeners.clear()
    }
    img.src = url
  }
  if (onSettled) {
    if (entry.status === 'loading') entry.listeners.add(onSettled)
    else onSettled()
  }
}

/** 回傳可繪製的圖片、'error'（顯示 placeholder），或 null（尚在載入） */
export function lookupImage(url: string): HTMLImageElement | 'error' | null {
  const entry = cache.get(url)
  if (!entry) return null
  if (entry.status === 'loaded') return entry.img
  if (entry.status === 'error') return 'error'
  return null
}
