import { getCurrentScope, onActivated, onDeactivated, onScopeDispose } from 'vue'
import { queryClient } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { SERVICE_ACCOUNT_RESOURCES } from '../queryResources'
import {
  sameServiceAccountIdentity,
  useServiceAccountContext,
  type ServiceAccountIdentity,
} from './useServiceAccountContext'

interface ServiceAccountLifecycleOptions {
  clearPendingCredentialKeys: () => void
  context: ReturnType<typeof useServiceAccountContext>
  refresh: () => Promise<void>
}

/** 服务账号页面的身份切换与 KeepAlive Query 清理。 */
export function useServiceAccountLifecycle(options: ServiceAccountLifecycleOptions) {
  const userStore = useUserStore()
  const { currentIdentity, operationScope, pageActive, roleIds, selectedAccount } = options.context
  let trackedIdentity = currentIdentity()

  function cancelIdentityQueries(identity: ServiceAccountIdentity, remove: boolean): void {
    for (const resource of SERVICE_ACCOUNT_RESOURCES) {
      const prefix = ['server-state', identity.tenantId, resource]
      void queryClient.cancelQueries({ queryKey: prefix })
      if (remove) queryClient.removeQueries({ queryKey: prefix })
    }
  }

  const unsubscribeUser = userStore.$subscribe(
    () => {
      const nextIdentity = currentIdentity()
      if (sameServiceAccountIdentity(trackedIdentity, nextIdentity)) return
      const previousIdentity = trackedIdentity
      trackedIdentity = nextIdentity
      operationScope.invalidate()
      options.clearPendingCredentialKeys()
      selectedAccount.value = null
      roleIds.value = []
      if (previousIdentity) cancelIdentityQueries(previousIdentity, true)
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
    const identity = currentIdentity()
    if (identity) cancelIdentityQueries(identity, false)
  })
  if (getCurrentScope()) {
    onScopeDispose(() => {
      pageActive.value = false
      operationScope.dispose()
      options.clearPendingCredentialKeys()
      unsubscribeUser()
    })
  }
}
