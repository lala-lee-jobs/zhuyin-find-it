import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'
import type { AnswerKind, InteractionState } from '../types/worksheet'
import {
  CircleInteractionController,
  type InteractionAudio,
  type InteractionTimings,
  type PopupState,
  type TapTarget,
} from '../core/CircleInteractionController'

export interface UseCircleInteractionOptions {
  audio: InteractionAudio
  evaluate: (circleId: string) => AnswerKind
  onCorrect: (circleId: string) => { completed: boolean }
  onRecognitionComplete?: () => void
  timings?: Partial<InteractionTimings>
}

/** 把框架無關的狀態機包成 Vue 響應式狀態 */
export function useCircleInteraction(options: UseCircleInteractionOptions) {
  const popup = shallowRef<PopupState | null>(null)
  const phase = ref<InteractionState>('idle')

  const controller = new CircleInteractionController({
    ...options,
    onChange: (p, ph) => {
      popup.value = p
      phase.value = ph
    },
  })

  if (getCurrentScope()) onScopeDispose(() => controller.dispose())

  return {
    popup,
    phase,
    isBusy: computed(() => phase.value !== 'idle'),
    activeCircleId: computed(() => popup.value?.circleId ?? null),
    tap: (target: TapTarget) => controller.tap(target),
    close: () => controller.close(),
    cancel: () => controller.cancel(),
  }
}
