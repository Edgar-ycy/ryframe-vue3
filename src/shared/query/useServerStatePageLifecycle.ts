import { onActivated, onDeactivated, onScopeDispose, readonly, ref, watch, type Ref } from 'vue'
import { useServerStateScope } from './client'
import type { OwnsServerStateOperation } from './scopedConfirmation'

export interface ServerStatePageLifecycle {
  pageActive: Readonly<Ref<boolean>>
  captureOwnership: () => OwnsServerStateOperation
  resetPageState: () => void
}

/** 统一失效页面本地投影，并将 KeepAlive 可见性纳入异步操作 ownership。 */
export function useServerStatePageLifecycle(resetLocalState: () => void): ServerStatePageLifecycle {
  const pageActive = ref(true)
  let generation = 0

  function resetPageState(): void {
    generation += 1
    resetLocalState()
  }

  const stopScopeWatch = watch(useServerStateScope(), resetPageState, { flush: 'sync' })

  onActivated(() => {
    pageActive.value = true
  })
  onDeactivated(() => {
    pageActive.value = false
    resetPageState()
  })
  onScopeDispose(() => {
    pageActive.value = false
    resetPageState()
    stopScopeWatch()
  })

  function captureOwnership(): OwnsServerStateOperation {
    const expectedGeneration = generation
    return () => pageActive.value && generation === expectedGeneration
  }

  return { pageActive: readonly(pageActive), captureOwnership, resetPageState }
}
