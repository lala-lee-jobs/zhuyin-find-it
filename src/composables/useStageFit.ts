import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { computeFitScale } from '../canvas/coordinateUtils'

/** 量測舞台大小，算出學習單等比例縮放倍率；同時回報螢幕方向與是否為小螢幕 */
export function useStageFit(stage: Ref<HTMLElement | null>) {
  const scale = ref(0)
  const landscape = ref(false)
  const compact = ref(false)
  const dpr = ref(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

  let observer: ResizeObserver | null = null
  let dprQuery: MediaQueryList | null = null

  function measure(): void {
    const el = stage.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    scale.value = computeFitScale(rect.width, rect.height)
    landscape.value = window.innerWidth > window.innerHeight * 1.08
    compact.value = Math.min(window.innerWidth, window.innerHeight) < 600
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

  return { scale, landscape, compact, dpr, measure }
}
