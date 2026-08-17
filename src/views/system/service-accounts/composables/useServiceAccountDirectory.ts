import { nextTick, ref } from 'vue'
import {
  createServiceAccount,
  deleteServiceAccount,
  updateServiceAccount,
  updateServiceAccountStatus,
  type CreateServiceAccountInput,
  type ServiceAccount,
  type ServiceAccountDetail,
  type ServiceAccountStatus,
  type UpdateServiceAccountInput,
} from '@/api/modules/serviceAccount'
import { requireOperationData } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import {
  copyServiceAccountQuery,
  sameServiceAccountPageQuery,
  useServiceAccountContext,
} from './useServiceAccountContext'

type SaveServiceAccountInput = CreateServiceAccountInput | UpdateServiceAccountInput

/** 服务账号目录查询与账号生命周期命令。 */
export function useServiceAccountDirectory(context: ReturnType<typeof useServiceAccountContext>) {
  const {
    accountsQuery, activeQueryParams, beginController, canListAccounts,
    captureIdentity, credentialsKey, currentIdentity, detailKey, detailQuery,
    ensureOperationContext, finishController,
    pageActive, queryParams, removeAccountFromPage, requireIdentity,
    requireOperationContext, roleIds, selectedAccount, featureAvailable,
    updateAccountPage,
  } = context
  const savePending = ref(false)
  const statusPending = ref(false)
  const removePending = ref(false)

  async function fetchAccounts(): Promise<void> {
    if (
      !pageActive.value
      || !featureAvailable.value
      || !currentIdentity()
      || !canListAccounts.value
    ) return
    const next = copyServiceAccountQuery(queryParams)
    if (!sameServiceAccountPageQuery(next, activeQueryParams)) {
      Object.assign(activeQueryParams, next)
      await nextTick()
    }
    await accountsQuery.refetch({ throwOnError: true })
  }

  async function resetAccountFilters(): Promise<void> {
    queryParams.page = 1
    queryParams.page_size = queryParams.page_size ?? 20
    await fetchAccounts()
  }

  async function selectAccount(account: ServiceAccount | null): Promise<void> {
    const identity = currentIdentity()
    const previousId = selectedAccount.value?.id ?? null
    const nextId = account?.id ?? null
    if (identity && previousId && previousId !== nextId) {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey(identity, previousId), exact: true }),
        queryClient.cancelQueries({
          queryKey: credentialsKey(identity, previousId),
          exact: true,
        }),
      ])
    }
    const sameAccount = previousId !== null && previousId === nextId
    selectedAccount.value = account
    roleIds.value = account
      ? queryClient.getQueryData<ServiceAccountDetail>(detailKey(identity, account.id))
        ?.role_ids ?? []
      : []
    if (sameAccount && pageActive.value) {
      await detailQuery.refetch({ throwOnError: true })
    }
  }

  async function refresh(): Promise<void> {
    if (!pageActive.value || !featureAvailable.value || !currentIdentity()) return
    const requests: Promise<unknown>[] = []
    if (canListAccounts.value) requests.push(accountsQuery.refetch({ throwOnError: true }))
    if (selectedAccount.value && canListAccounts.value) {
      requests.push(detailQuery.refetch({ throwOnError: true }))
    }
    await Promise.all(requests)
  }

  async function saveAccount(
    input: SaveServiceAccountInput,
    id?: string,
    expectedIdentity = captureIdentity(),
  ): Promise<ServiceAccount> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const controller = beginController()
    savePending.value = true
    try {
      const response = id
        ? await updateServiceAccount(id, input as UpdateServiceAccountInput, controller.signal)
        : await createServiceAccount(input as CreateServiceAccountInput, controller.signal)
      const account = requireOperationData(response)
      ensureOperationContext(identity, operationContext)
      updateAccountPage(identity, account, id ? 'update' : 'create')
      if (id && selectedAccount.value?.id === id) {
        void detailQuery.refetch({ throwOnError: false })
      }
      return account
    }
    finally {
      finishController(controller)
      savePending.value = false
    }
  }

  async function setAccountStatus(
    account: ServiceAccount,
    status: ServiceAccountStatus,
    expectedIdentity = captureIdentity(),
  ): Promise<void> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const controller = beginController()
    statusPending.value = true
    try {
      await updateServiceAccountStatus(account.id, status, controller.signal)
      ensureOperationContext(identity, operationContext)
      updateAccountPage(identity, {
        ...account,
        status: status === 'enabled' ? '1' : '0',
      }, 'update')
      void accountsQuery.refetch({ throwOnError: false })
      if (selectedAccount.value?.id === account.id) {
        void detailQuery.refetch({ throwOnError: false })
      }
    }
    finally {
      finishController(controller)
      statusPending.value = false
    }
  }

  async function removeAccount(
    account: ServiceAccount,
    expectedIdentity = captureIdentity(),
  ): Promise<void> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const controller = beginController()
    removePending.value = true
    try {
      await deleteServiceAccount(account.id, controller.signal)
      ensureOperationContext(identity, operationContext)
      removeAccountFromPage(identity, account.id)
      if (selectedAccount.value?.id === account.id) selectedAccount.value = null
      void accountsQuery.refetch({ throwOnError: false })
    }
    finally {
      finishController(controller)
      removePending.value = false
    }
  }

  return {
    fetchAccounts, refresh, removeAccount, removePending, resetAccountFilters,
    saveAccount, savePending, selectAccount, setAccountStatus, statusPending,
  }
}
