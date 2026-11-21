import { getCurrentScope, onScopeDispose, ref, watch, watchEffect, type Ref } from 'vue'
import { AudioService, type PlayOutcome } from '../services/AudioService'
import { BrushSound } from '../services/BrushSound'

let shared: AudioService | null = null
let sharedBrush: BrushSound | null = null

/** 塗色的筆刷音效（全站共用一個 AudioContext） */
export function getBrushSound(): BrushSound {
  if (!sharedBrush) sharedBrush = new BrushSound()
  return sharedBrush
}

/** 全站共用一個 AudioService（一個共用的 audio 元素，iOS 解鎖後持續有效） */
export function getAudioService(): AudioService {
  if (!shared) shared = new AudioService()
  return shared
}

export function useAudio(
  muted: Ref<boolean>,
  /** 筆刷音效開關（預設關閉）；靜音時一律不出聲 */
  brushSoundOn: Ref<boolean> = ref(false),
  service: AudioService = getAudioService(),
  brush: BrushSound = getBrushSound(),
) {
  const speakerPlaying = ref(false)
  let speakerAbort: AbortController | null = null

  watch(
    muted,
    (m) => {
      service.setMuted(m)
      if (m) stopSpeaker()
    },
    { immediate: true },
  )

  watchEffect(() => brush.setMuted(muted.value || !brushSoundOn.value))

  /** 標題喇叭：播放目標注音；不改變任何進度 */
  async function playTarget(symbol: string): Promise<PlayOutcome> {
    stopSpeaker()
    const ac = new AbortController()
    speakerAbort = ac
    speakerPlaying.value = true
    try {
      return await service.playSymbol(symbol, ac.signal)
    } finally {
      if (speakerAbort === ac) {
        speakerAbort = null
        speakerPlaying.value = false
      }
    }
  }

  function stopSpeaker(): void {
    if (speakerAbort) {
      speakerAbort.abort()
      speakerAbort = null
    }
    speakerPlaying.value = false
  }

  function playCompletion(): Promise<PlayOutcome> {
    return service.playFeedback('completed')
  }

  if (getCurrentScope())
    onScopeDispose(() => {
      service.stop()
      brush.stop(true)
    })

  return { service, brush, speakerPlaying, playTarget, stopSpeaker, playCompletion }
}
