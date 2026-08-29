import { getCurrentScope, onActivated, onDeactivated, onScopeDispose, watch } from 'vue'
import { queryClient, serverStateResourcePrefix, useServerStateScope } from '@/shared/query/client'
import { SERVICE_ACCOUNT_RESOURCES } from '../queryResources'
import {
  sameServiceAccountScope,
  useServiceAccountContext,
  type ServiceAccountScope,
} from './useServiceAccountContext'

interface ServiceAccountLifecycleOptions {
  clearPendingCredentialKeys: () => void
  context: ReturnType<typeof useServiceAccountContext>
  refresh: () => Promise<void>
}

/** 服务账号页面的身份切换与 KeepAlive Query 清理。 */
export function useServiceAccountLifecycle(options: ServiceAccountLifecycleOptions) {
  const { currentIdentity, operationScope, pageActive, roleIds, selectedAccount } = options.context
  let trackedScope = currentIdentity()

  function cancelScopeQueries(scope: ServiceAccountScope, remove: boolean): void {
    for (const resource of SERVICE_ACCOUNT_RESOURCES) {
      const prefix = serverStateResourcePrefix(scope, resource)
      void queryClient.cancelQueries({ queryKey: prefix })
      if (remove) queryClient.removeQueries({ queryKey: prefix })
    }
  }

  const stopScopeWatch = watch(
    useServerStateScope(),
    () => {
      const nextScope = currentIdentity()
      if (sameServiceAccountScope(trackedScope, nextScope)) return
      const previousScope = trackedScope
      trackedScope = nextScope
      operationScope.invalidate()
      options.clearPendingCredentialKeys()
      selectedAccount.value = null
      roleIds.value = []
      if (previousScope) cancelScopeQueries(previousScope, true)
    },
    { flush: 'sync' },
  )

  onActivated(() => {
    if (pageActive.value) return
    pageActive.value = true
    void options.refresh()
  })
  onDeactivated(() => {
    pageActive.value = false
    operationScope.invalidate()
    const scope = currentIdentity()
    if (scope) cancelScopeQueries(scope, false)
  })
  if (getCurrentScope()) {
    onScopeDispose(() => {
      pageActive.value = false
      operationScope.dispose()
      options.clearPendingCredentialKeys()
      stopScopeWatch()
    })
  }
}
