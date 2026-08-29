import { nextTick, ref, type Ref } from 'vue'
import type { QueryKey } from '@tanstack/vue-query'
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
import { HttpError, requireOperationData } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import {
  copyServiceAccountQuery,
  sameServiceAccountPageQuery,
  type ServiceAccountIdentityGuard,
  type ServiceAccountScope,
  type ServiceResourcePageState,
} from './useServiceAccountContext'

type SaveServiceAccountInput = CreateServiceAccountInput | UpdateServiceAccountInput

interface DirectoryQuery {
  refetch: (options: { throwOnError: boolean }) => Promise<unknown>
}

interface ServiceAccountDirectoryContext {
  accountsQuery: DirectoryQuery
  activeQueryParams: ServiceResourcePageState
  beginController: () => AbortController
  canListAccounts: Readonly<Ref<boolean>>
  captureIdentity: () => ServiceAccountIdentityGuard | undefined
  credentialsKey: (scope: ServiceAccountScope, accountId: string | null) => QueryKey
  currentIdentity: () => ServiceAccountScope | undefined
  detailKey: (scope: ServiceAccountScope, accountId: string | null) => QueryKey
  detailQuery: DirectoryQuery
  ensureOperationContext: (scope: ServiceAccountScope, guard: ServiceAccountIdentityGuard) => void
  featureAvailable: Readonly<Ref<boolean>>
  finishController: (controller: AbortController) => void
  onIdentityChanged: (callback: () => void) => () => void
  pageActive: Ref<boolean>
  queryParams: ServiceResourcePageState
  removeAccountFromPage: (scope: ServiceAccountScope, accountId: string) => void
  requireIdentity: () => ServiceAccountScope
  requireOperationContext: (
    guard: ServiceAccountIdentityGuard | undefined,
  ) => ServiceAccountIdentityGuard
  roleIds: Ref<readonly string[]>
  selectedAccount: Ref<ServiceAccount | null>
  updateAccountPage: (
    scope: ServiceAccountScope,
    account: ServiceAccount,
    mode: 'create' | 'update',
  ) => void
}

/** 服务账号目录查询与账号生命周期命令。 */
export function useServiceAccountDirectory(context: ServiceAccountDirectoryContext) {
  const {
    accountsQuery,
    activeQueryParams,
    beginController,
    canListAccounts,
    captureIdentity,
    credentialsKey,
    currentIdentity,
    detailKey,
    detailQuery,
    ensureOperationContext,
    finishController,
    onIdentityChanged,
    pageActive,
    queryParams,
    removeAccountFromPage,
    requireIdentity,
    requireOperationContext,
    roleIds,
    selectedAccount,
    featureAvailable,
    updateAccountPage,
  } = context
  const savePending = ref(false)
  const statusPending = ref(false)
  const removePending = ref(false)
  let saveController: AbortController | undefined
  let statusController: AbortController | undefined
  let removeController: AbortController | undefined
  let selectionController: AbortController | undefined
  let selectionGeneration = 0

  onIdentityChanged(() => {
    saveController = undefined
    statusController = undefined
    removeController = undefined
    selectionController = undefined
    selectionGeneration += 1
    savePending.value = false
    statusPending.value = false
    removePending.value = false
  })

  async function fetchAccounts(): Promise<void> {
    if (
      !pageActive.value ||
      !featureAvailable.value ||
      !currentIdentity() ||
      !canListAccounts.value
    )
      return
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

  async function selectAccount(
    account: ServiceAccount | null,
    expectedIdentity = captureIdentity(),
  ): Promise<void> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    selectionController?.abort()
    const controller = beginController()
    selectionController = controller
    selectionGeneration += 1
    const generation = selectionGeneration
    const ensureSelectionCurrent = (): void => {
      ensureOperationContext(identity, operationContext)
      if (
        controller.signal.aborted ||
        selectionController !== controller ||
        selectionGeneration !== generation
      ) {
        throw new HttpError('账号选择已被更新操作取代', { kind: 'cancelled' })
      }
    }
    const previousId = selectedAccount.value?.id ?? null
    const nextId = account?.id ?? null
    try {
      if (previousId && previousId !== nextId) {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: detailKey(identity, previousId), exact: true }),
          queryClient.cancelQueries({
            queryKey: credentialsKey(identity, previousId),
            exact: true,
          }),
        ])
        ensureSelectionCurrent()
      }
      ensureSelectionCurrent()
      const sameAccount = previousId !== null && previousId === nextId
      selectedAccount.value = account
      roleIds.value = account
        ? (queryClient.getQueryData<ServiceAccountDetail>(detailKey(identity, account.id))
            ?.role_ids ?? [])
        : []
      if (sameAccount && pageActive.value) {
        await detailQuery.refetch({ throwOnError: true })
        ensureSelectionCurrent()
      }
    } finally {
      finishController(controller)
      if (selectionController === controller) selectionController = undefined
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
    saveController = controller
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
    } finally {
      finishController(controller)
      if (saveController === controller) {
        saveController = undefined
        savePending.value = false
      }
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
    statusController = controller
    statusPending.value = true
    try {
      await updateServiceAccountStatus(account.id, status, controller.signal)
      ensureOperationContext(identity, operationContext)
      updateAccountPage(
        identity,
        {
          ...account,
          status: status === 'enabled' ? '1' : '0',
        },
        'update',
      )
      void accountsQuery.refetch({ throwOnError: false })
      if (selectedAccount.value?.id === account.id) {
        void detailQuery.refetch({ throwOnError: false })
      }
    } finally {
      finishController(controller)
      if (statusController === controller) {
        statusController = undefined
        statusPending.value = false
      }
    }
  }

  async function removeAccount(
    account: ServiceAccount,
    expectedIdentity = captureIdentity(),
  ): Promise<void> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const controller = beginController()
    removeController = controller
    removePending.value = true
    try {
      await deleteServiceAccount(account.id, controller.signal)
      ensureOperationContext(identity, operationContext)
      removeAccountFromPage(identity, account.id)
      if (selectedAccount.value?.id === account.id) selectedAccount.value = null
      void accountsQuery.refetch({ throwOnError: false })
    } finally {
      finishController(controller)
      if (removeController === controller) {
        removeController = undefined
        removePending.value = false
      }
    }
  }

  return {
    fetchAccounts,
    refresh,
    removeAccount,
    removePending,
    resetAccountFilters,
    saveAccount,
    savePending,
    selectAccount,
    setAccountStatus,
    statusPending,
  }
}
