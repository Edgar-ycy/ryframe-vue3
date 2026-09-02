import {
  getCurrentScope,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  watch,
  type Ref,
} from 'vue'
import { queryClient, serverStateResourcePrefix, useServerStateScope } from '@/shared/query/client'
import { sameServerStateScope } from '@/shared/query/scope'
import {
  TENANT_CONFIG_PACKAGES_RESOURCE,
  TENANT_CONFIG_TRANSFER_ITEMS_RESOURCE,
  TENANT_CONFIG_TRANSFERS_RESOURCE,
} from '../queryResources'
import type { TenantConfigIdentity } from './useTenantConfigTransferQueries'

interface LifecycleOperationScope {
  dispose: () => void
  invalidate: () => void
}

interface LifecycleActiveTracking {
  scheduleActiveCycle: (immediate?: boolean) => void
  stopActiveCycle: () => void
}

interface TenantConfigTransferLifecycleOptions {
  activeTracking: LifecycleActiveTracking
  clearPendingIntents: () => void
  currentIdentity: () => TenantConfigIdentity | undefined
  operationScope: LifecycleOperationScope
  pageActive: Ref<boolean>
  refresh: () => Promise<void>
  resetSelection: () => void
}

function sameIdentity(
  left: TenantConfigIdentity | undefined,
  right: TenantConfigIdentity | undefined,
): boolean {
  return sameServerStateScope(left, right)
}

/** 配置迁移页面的身份切换、Query 清理和 KeepAlive 生命周期接线。 */
export function useTenantConfigTransferLifecycle(options: TenantConfigTransferLifecycleOptions) {
  let trackedIdentity = options.currentIdentity()

  function handleResumeEvent(): void {
    if (!options.pageActive.value || !options.currentIdentity()) return
    if (document.visibilityState === 'hidden') return
    void options.refresh().catch(() => undefined)
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') options.activeTracking.stopActiveCycle()
    else handleResumeEvent()
  }

  function cancelIdentityQueries(identity: TenantConfigIdentity): void {
    for (const resource of [
      TENANT_CONFIG_PACKAGES_RESOURCE,
      TENANT_CONFIG_TRANSFERS_RESOURCE,
      TENANT_CONFIG_TRANSFER_ITEMS_RESOURCE,
    ]) {
      const prefix = serverStateResourcePrefix(identity, resource)
      void queryClient.cancelQueries({ queryKey: prefix })
      queryClient.removeQueries({ queryKey: prefix })
    }
  }

  const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
    const identity = options.currentIdentity()
    const key = event.query.queryKey
    if (
      !identity ||
      !options.pageActive.value ||
      key[0] !== 'server-state' ||
      key[1] !== identity.tenantId ||
      key[2] !== identity.subjectId ||
      key[3] !== identity.sessionEpoch ||
      ![TENANT_CONFIG_PACKAGES_RESOURCE, TENANT_CONFIG_TRANSFERS_RESOURCE].includes(String(key[4]))
    )
      return
    options.activeTracking.scheduleActiveCycle()
  })

  const stopScopeWatch = watch(
    useServerStateScope(),
    () => {
      const nextIdentity = options.currentIdentity()
      if (sameIdentity(trackedIdentity, nextIdentity)) return
      if (trackedIdentity) cancelIdentityQueries(trackedIdentity)
      options.operationScope.invalidate()
      options.clearPendingIntents()
      options.activeTracking.stopActiveCycle()
      options.resetSelection()
      trackedIdentity = nextIdentity
      if (nextIdentity && options.pageActive.value) {
        void nextTick()
          .then(() => options.refresh())
          .catch(() => undefined)
      }
    },
    { flush: 'sync' },
  )

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    globalThis.addEventListener('focus', handleResumeEvent)
    globalThis.addEventListener('online', handleResumeEvent)
    options.activeTracking.scheduleActiveCycle()
  })
  onActivated(() => {
    if (options.pageActive.value) return
    options.pageActive.value = true
    handleResumeEvent()
  })
  onDeactivated(() => {
    options.pageActive.value = false
    options.operationScope.invalidate()
    options.activeTracking.stopActiveCycle()
  })
  if (getCurrentScope()) {
    onScopeDispose(() => {
      options.activeTracking.stopActiveCycle()
      options.operationScope.dispose()
      unsubscribeCache()
      stopScopeWatch()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      globalThis.removeEventListener('focus', handleResumeEvent)
      globalThis.removeEventListener('online', handleResumeEvent)
    })
  }
}
