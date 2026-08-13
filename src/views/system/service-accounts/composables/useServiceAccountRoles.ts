import { ref } from 'vue'
import { replaceServiceAccountRoles, type ServiceAccountDetail } from '@/api/modules/serviceAccount'
import { queryClient } from '@/shared/query/client'
import { useServiceAccountContext } from './useServiceAccountContext'

/** 服务账号角色绑定命令。 */
export function useServiceAccountRoles(context: ReturnType<typeof useServiceAccountContext>) {
  const {
    accountsQuery, beginController, captureIdentity, detailKey, detailQuery, ensureOperationContext,
    finishController, requireIdentity, requireOperationContext, roleIds, selectedAccount,
  } = context
  const rolesPending = ref(false)

  async function saveRoles(
    accountId: string,
    nextRoleIds: readonly string[],
    expectedIdentity = captureIdentity(),
  ): Promise<void> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const controller = beginController()
    rolesPending.value = true
    try {
      await replaceServiceAccountRoles(accountId, nextRoleIds, controller.signal)
      ensureOperationContext(identity, operationContext)
      queryClient.setQueryData<ServiceAccountDetail>(
        detailKey(identity, accountId),
        current => current ? { ...current, role_ids: [...nextRoleIds] } : current,
      )
      if (selectedAccount.value?.id === accountId) roleIds.value = [...nextRoleIds]
      if (selectedAccount.value?.id === accountId) {
        void detailQuery.refetch({ throwOnError: false })
      }
      void accountsQuery.refetch({ throwOnError: false })
    }
    finally {
      finishController(controller)
      rolesPending.value = false
    }
  }

  return { rolesPending, saveRoles }
}
