import { nextTick, ref } from 'vue'
import { revokeServiceDelegation, type ServiceDelegation } from '@/api/modules/serviceAccount'
import type { PageResponse } from '@/shared/http/types'
import { queryClient } from '@/shared/query/client'
import {
  copyServiceAccountQuery,
  sameServiceAccountPageQuery,
  useServiceAccountContext,
} from './useServiceAccountContext'

/** 管理员委托列表与撤销命令。 */
export function useServiceAccountDelegations(context: ReturnType<typeof useServiceAccountContext>) {
  const {
    activeDelegationsQueryParams, beginController, canListDelegations,
    captureIdentity, currentIdentity, delegationsKey, delegationsQuery,
    delegationsQueryParams, ensureOperationContext,
    finishController, pageActive, requireIdentity, requireOperationContext,
  } = context
  const revokingDelegationId = ref<string>()

  async function fetchDelegations(): Promise<void> {
    if (!pageActive.value || !currentIdentity() || !canListDelegations.value) return
    const next = copyServiceAccountQuery(delegationsQueryParams)
    if (!sameServiceAccountPageQuery(next, activeDelegationsQueryParams)) {
      Object.assign(activeDelegationsQueryParams, next)
      await nextTick()
    }
    await delegationsQuery.refetch({ throwOnError: true })
  }

  async function revokeDelegation(
    delegation: ServiceDelegation,
    expectedIdentity = captureIdentity(),
  ): Promise<void> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const controller = beginController()
    revokingDelegationId.value = delegation.id
    try {
      await revokeServiceDelegation(delegation.id, controller.signal)
      ensureOperationContext(identity, operationContext)
      queryClient.setQueryData<PageResponse<ServiceDelegation>>(
        delegationsKey(identity),
        current => current ? {
          ...current,
          items: current.items.map(item => item.id === delegation.id
            ? { ...item, revoked_at: new Date().toISOString(), status: 'revoked' }
            : item),
        } : current,
      )
      void delegationsQuery.refetch({ throwOnError: false })
    }
    finally {
      finishController(controller)
      if (revokingDelegationId.value === delegation.id) {
        revokingDelegationId.value = undefined
      }
    }
  }

  return { fetchDelegations, revokeDelegation, revokingDelegationId }
}
