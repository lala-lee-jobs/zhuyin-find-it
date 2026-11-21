import { onBeforeUnmount, onMounted, ref, shallowRef, type Ref } from 'vue'
import { PORTRAIT_LAYOUT, chooseLayout, layoutScale, type SheetLayout } from '../canvas/layout'

/**
 * 量測舞台大小：依螢幕形狀選版面（直式／橫式／手機窄版），
 * 算出等比例縮放倍率；同時回報螢幕方向與是否為小螢幕。
 */
export function useStageFit(stage: Ref<HTMLElement | null>) {
  const scale = ref(0)
  const layout = shallowRef<SheetLayout>(PORTRAIT_LAYOUT)
  const landscape = ref(false)
  const compact = ref(false)
  const dpr = ref(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

  let observer: ResizeObserver | null = null
  let dprQuery: MediaQueryList | null = null

  function measure(): void {
    const el = stage.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    landscape.value = window.innerWidth > window.innerHeight * 1.08
    compact.value = Math.min(window.innerWidth, window.innerHeight) < 600
    const next = chooseLayout(rect.width, rect.height, compact.value)
    if (next !== layout.value) layout.value = next
    scale.value = layoutScale(next, rect.width, rect.height)
    dpr.value = window.devicePixelRatio || 1
  }

  function watchDpr(): void {
    dprQuery?.removeEventListener('change', onDprChange)
    if (typeof window.matchMedia !== 'function') return
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
    dprQuery.addEventListener('change', onDprChange)
  }
  function onDprChange(): void {
    measure()
    watchDpr()
  }

  onMounted(() => {
    measure()
    observer = new ResizeObserver(measure)
    if (stage.value) observer.observe(stage.value)
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    watchDpr()
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    window.removeEventListener('resize', measure)
    window.removeEventListener('orientationchange', measure)
    dprQuery?.removeEventListener('change', onDprChange)
  })

  return { scale, layout, landscape, compact, dpr, measure }
}
