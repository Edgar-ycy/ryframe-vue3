import {
  getTenantConfigPackage,
  getTenantConfigTransfer,
  type TenantConfigTransfer,
} from '@/api/modules/tenantConfigTransfer'
import { HttpError, requireOperationData } from '@/shared/http/client'
import {
  isActiveTenantConfigPackage,
  isActiveTenantConfigTransfer,
} from '../presentation'
import {
  useTenantConfigTransferQueries,
  type TenantConfigIdentity,
} from './useTenantConfigTransferQueries'

const ACTIVE_REFRESH_INTERVAL_MS = 5_000
const MAX_CONCURRENT_DETAILS = 4

interface ActiveDetail {
  id: string
  kind: 'package' | 'transfer'
}

interface TenantConfigTransferActiveTrackingOptions {
  currentIdentity: () => TenantConfigIdentity | undefined
  isCurrentIdentity: (identity: TenantConfigIdentity) => boolean
  mergeTransfer: (identity: TenantConfigIdentity, transfer: TenantConfigTransfer) => void
  queries: ReturnType<typeof useTenantConfigTransferQueries>
}

/** 只跟踪当前页活跃详情；完整列表仍仅由页面事件刷新。 */
export function useTenantConfigTransferActiveTracking(
  options: TenantConfigTransferActiveTrackingOptions,
) {
  const {
    mergePackage,
    packagesQuery,
    queryEnabled,
    removePackage,
    removeTransfer,
    transfersQuery,
  } = options.queries
  let activeTimer: ReturnType<typeof globalThis.setTimeout> | undefined
  let activeCycleController: AbortController | undefined
  let activeCycleRunning = false

  async function refreshPackageDetail(
    identity: TenantConfigIdentity,
    id: string,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      mergePackage(identity, requireOperationData(await getTenantConfigPackage(id, signal)))
    }
    catch (error) {
      if (!options.isCurrentIdentity(identity) || !(error instanceof HttpError)) return
      if (error.kind === 'cancelled') return
      if (error.status === 403 || error.status === 404) {
        removePackage(identity, id)
      }
      else if (error.status === 409) {
        await packagesQuery.refetch({ throwOnError: false })
      }
    }
  }

  async function refreshTransferDetail(
    identity: TenantConfigIdentity,
    id: string,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      options.mergeTransfer(
        identity,
        requireOperationData(await getTenantConfigTransfer(id, signal)),
      )
    }
    catch (error) {
      if (!options.isCurrentIdentity(identity) || !(error instanceof HttpError)) return
      if (error.kind === 'cancelled') return
      if (error.status === 403 || error.status === 404) {
        removeTransfer(identity, id)
      }
      else if (error.status === 409) {
        try {
          options.mergeTransfer(
            identity,
            requireOperationData(await getTenantConfigTransfer(id, signal)),
          )
        }
        catch {
          await transfersQuery.refetch({ throwOnError: false })
        }
      }
    }
  }

  function activeDetails(): ActiveDetail[] {
    return [
      ...(packagesQuery.data.value?.items ?? [])
        .filter(isActiveTenantConfigPackage)
        .map(bundle => ({ kind: 'package' as const, id: bundle.id })),
      ...(transfersQuery.data.value?.items ?? [])
        .filter(isActiveTenantConfigTransfer)
        .map(transfer => ({ kind: 'transfer' as const, id: transfer.id })),
    ]
  }

  function canTrackActiveDetails(): boolean {
    return queryEnabled() && document.visibilityState !== 'hidden'
  }

  function abortActiveRequest(): void {
    activeCycleController?.abort()
    activeCycleController = undefined
  }

  function stopActiveCycle(): void {
    if (activeTimer !== undefined) globalThis.clearTimeout(activeTimer)
    activeTimer = undefined
    abortActiveRequest()
  }

  async function refreshActiveDetails(): Promise<void> {
    if (!canTrackActiveDetails() || activeCycleRunning) return
    const identity = options.currentIdentity()
    if (!identity) return
    const details = activeDetails()
    if (details.length === 0) return
    activeCycleRunning = true
    const controller = new AbortController()
    abortActiveRequest()
    activeCycleController = controller
    let cursor = 0
    try {
      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT_DETAILS, details.length) },
        async () => {
          while (cursor < details.length && !controller.signal.aborted) {
            const detail = details[cursor]
            cursor += 1
            if (!detail) continue
            if (detail.kind === 'package') {
              await refreshPackageDetail(identity, detail.id, controller.signal)
            }
            else {
              await refreshTransferDetail(identity, detail.id, controller.signal)
            }
          }
        },
      )
      await Promise.all(workers)
    }
    finally {
      if (activeCycleController === controller) activeCycleController = undefined
      activeCycleRunning = false
    }
  }

  function scheduleActiveCycle(immediate = false): void {
    if (activeTimer !== undefined) globalThis.clearTimeout(activeTimer)
    activeTimer = undefined
    if (!canTrackActiveDetails() || activeDetails().length === 0) return
    activeTimer = globalThis.setTimeout(async () => {
      activeTimer = undefined
      await refreshActiveDetails()
      scheduleActiveCycle()
    }, immediate ? 0 : ACTIVE_REFRESH_INTERVAL_MS)
  }

  return {
    abortActiveRequest,
    scheduleActiveCycle,
    stopActiveCycle,
  }
}
