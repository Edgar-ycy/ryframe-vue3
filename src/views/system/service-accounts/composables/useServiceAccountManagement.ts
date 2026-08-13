import {
  computed,
  getCurrentScope,
  nextTick,
  onActivated,
  onDeactivated,
  onScopeDispose,
  reactive,
  ref,
} from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  createServiceAccount,
  createServiceCredential,
  deleteServiceAccount,
  getServiceAccount,
  listServiceAccessAudits,
  listServiceAccounts,
  listServiceCredentials,
  listServiceDelegations,
  replaceServiceAccountRoles,
  revokeServiceCredential,
  revokeServiceDelegation,
  updateServiceAccount,
  updateServiceAccountStatus,
  type CreateServiceAccountInput,
  type CreateServiceCredentialInput,
  type CreatedServiceCredential,
  type ServiceAccessAudit,
  type ServiceAccessAuditQuery,
  type ServiceAccount,
  type ServiceAccountDetail,
  type ServiceAccountQuery,
  type ServiceAccountStatus,
  type ServiceCredential,
  type ServiceDelegation,
  type ServiceDelegationQuery,
  type UpdateServiceAccountInput,
} from '@/api/modules/serviceAccount'
import { usePermission } from '@/hooks/usePermission'
import { HttpError, requireOperationData } from '@/shared/http/client'
import {
  createIdempotencyKey,
  shouldReuseIdempotencyKey,
} from '@/shared/http/idempotency'
import type { PageResponse } from '@/shared/http/types'
import { queryClient, tenantQueryKey } from '@/shared/query/client'
import {
  createIdentityOperationScope,
  type IdentityOperationGuard,
} from '@/shared/query/createIdentityOperationScope'
import { useUserStore } from '@/stores/user'
import {
  SERVICE_ACCESS_AUDITS_RESOURCE,
  SERVICE_ACCOUNT_RESOURCES,
  SERVICE_ACCOUNTS_RESOURCE,
  SERVICE_CREDENTIALS_RESOURCE,
  SERVICE_DELEGATIONS_RESOURCE,
} from '../queryResources'

const DEFAULT_PAGE_SIZE = 20
const QUERY_GC_TIME = 10 * 60_000

interface ServiceAccountIdentity {
  tenantId: string
  userId: string
}

type SaveServiceAccountInput = CreateServiceAccountInput | UpdateServiceAccountInput
type ServiceResourcePageState = { page: number; page_size: number }

export type ServiceAccountIdentityGuard = IdentityOperationGuard

function sameIdentity(
  left: ServiceAccountIdentity | undefined,
  right: ServiceAccountIdentity | undefined,
): boolean {
  return left?.tenantId === right?.tenantId && left?.userId === right?.userId
}

function samePageQuery(
  left: ServiceAccountQuery,
  right: ServiceAccountQuery,
): boolean {
  return left.page === right.page && left.page_size === right.page_size
}

function queryCopy<T extends { page?: number; page_size?: number }>(query: T): T {
  return { ...query }
}

/** 服务账号管理页的服务端状态与写操作。一次性 Secret 不进入任何响应式缓存。 */
export function useServiceAccountManagement() {
  const userStore = useUserStore()
  const { hasPermission } = usePermission()
  const pageActive = ref(true)
  const queryParams = reactive<ServiceResourcePageState>({
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
  })
  const activeQueryParams = reactive<ServiceResourcePageState>({ ...queryParams })
  const delegationsQueryParams = reactive<ServiceResourcePageState>({
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
  })
  const activeDelegationsQueryParams = reactive<ServiceResourcePageState>({
    ...delegationsQueryParams,
  })
  const auditsQueryParams = reactive<ServiceResourcePageState>({
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
  })
  const activeAuditsQueryParams = reactive<ServiceResourcePageState>({
    ...auditsQueryParams,
  })
  const selectedAccount = ref<ServiceAccount | null>(null)
  const roleIds = ref<readonly string[]>([])
  const savePending = ref(false)
  const statusPending = ref(false)
  const removePending = ref(false)
  const rolesPending = ref(false)
  const issueCredentialPending = ref(false)
  const revokingCredentialId = ref<string>()
  const revokingDelegationId = ref<string>()
  const pendingCredentialKeys = new Map<string, string>()
  let trackedIdentity = currentIdentity()

  const canListAccounts = computed(() => hasPermission('system:service-account:list'))
  const canAddAccount = computed(() => hasPermission('system:service-account:add'))
  const canEditAccount = computed(() => hasPermission('system:service-account:edit'))
  const canRemoveAccount = computed(() => hasPermission('system:service-account:remove'))
  const canListDepartments = computed(() => hasPermission('system:dept:list'))
  const canListRoles = computed(() => hasPermission('system:role:list'))
  const canManageRoles = computed(() => (
    hasPermission('system:service-account:role') && canListRoles.value
  ))
  const canRotateKey = computed(() => (
    hasPermission('system:service-account:key-rotate')
  ))
  const canRevokeKey = computed(() => (
    hasPermission('system:service-account:key-revoke')
  ))
  const canListDelegations = computed(() => (
    hasPermission('system:service-delegation:list')
  ))
  const canRevokeDelegation = computed(() => (
    hasPermission('system:service-delegation:revoke')
  ))
  const canListAudits = computed(() => (
    hasPermission('system:service-access-audit:list')
  ))

  function currentIdentity(): ServiceAccountIdentity | undefined {
    if (
      userStore.sessionStatus !== 'authenticated'
      || !userStore.tenantId
      || !userStore.userId
    ) return undefined
    return {
      tenantId: userStore.tenantId,
      userId: String(userStore.userId),
    }
  }

  const operationScope = createIdentityOperationScope({
    currentIdentity,
    isActive: () => pageActive.value,
    sameIdentity,
  })

  function requireIdentity(): ServiceAccountIdentity {
    const identity = currentIdentity()
    if (!identity) {
      throw new HttpError('当前登录身份已失效', { status: 401, kind: 'http' })
    }
    return identity
  }

  function ensureCurrentIdentity(identity: ServiceAccountIdentity): void {
    if (!sameIdentity(identity, currentIdentity())) {
      throw new HttpError('登录身份已经切换', { kind: 'cancelled' })
    }
  }

  /** 捕获不包含租户或用户信息的当前上下文守卫。 */
  function captureIdentity(): ServiceAccountIdentityGuard | undefined {
    return operationScope.capture()
  }

  function identityMatches(snapshot: ServiceAccountIdentityGuard | undefined): boolean {
    return operationScope.matches(snapshot)
  }

  function requireOperationContext(
    snapshot: ServiceAccountIdentityGuard | undefined,
  ): ServiceAccountIdentityGuard {
    if (!identityMatches(snapshot)) {
      throw new HttpError('页面或登录身份已经切换', { kind: 'cancelled' })
    }
    if (snapshot === undefined) {
      throw new HttpError('页面或登录身份已经切换', { kind: 'cancelled' })
    }
    return snapshot
  }

  function ensureOperationContext(
    identity: ServiceAccountIdentity,
    snapshot: ServiceAccountIdentityGuard,
  ): void {
    ensureCurrentIdentity(identity)
    requireOperationContext(snapshot)
  }

  /** 注册身份失效回调，供 UI 同步关闭并清空一次性安全材料。 */
  function onIdentityChanged(callback: () => void): () => void {
    return operationScope.onInvalidated(callback)
  }

  function identityParams(identity = currentIdentity()) {
    return {
      userId: identity?.userId ?? 'anonymous',
    }
  }

  function accountsKey(
    identity = currentIdentity(),
    query: ServiceAccountQuery = activeQueryParams,
  ) {
    return tenantQueryKey(identity?.tenantId, SERVICE_ACCOUNTS_RESOURCE, {
      ...identityParams(identity),
      query: queryCopy(query),
      scope: 'list',
    })
  }

  function detailKey(identity: ServiceAccountIdentity | undefined, accountId: string | null) {
    return tenantQueryKey(identity?.tenantId, SERVICE_ACCOUNTS_RESOURCE, {
      ...identityParams(identity),
      accountId,
      scope: 'detail',
    })
  }

  function credentialsKey(
    identity: ServiceAccountIdentity | undefined,
    accountId: string | null,
  ) {
    return tenantQueryKey(identity?.tenantId, SERVICE_CREDENTIALS_RESOURCE, {
      ...identityParams(identity),
      accountId,
      scope: 'list',
    })
  }

  function delegationsKey(
    identity = currentIdentity(),
    query: ServiceDelegationQuery = activeDelegationsQueryParams,
  ) {
    return tenantQueryKey(identity?.tenantId, SERVICE_DELEGATIONS_RESOURCE, {
      ...identityParams(identity),
      query: queryCopy(query),
      scope: 'list',
    })
  }

  function auditsKey(
    identity = currentIdentity(),
    query: ServiceAccessAuditQuery = activeAuditsQueryParams,
  ) {
    return tenantQueryKey(identity?.tenantId, SERVICE_ACCESS_AUDITS_RESOURCE, {
      ...identityParams(identity),
      query: queryCopy(query),
      scope: 'list',
    })
  }

  const accountsQuery = useQuery<PageResponse<ServiceAccount>, HttpError>({
    queryKey: computed(() => accountsKey()),
    enabled: computed(() => (
      pageActive.value && currentIdentity() !== undefined && canListAccounts.value
    )),
    queryFn: async ({ signal }) => requireOperationData(
      await listServiceAccounts(queryCopy(activeQueryParams), signal),
    ),
    staleTime: 0,
    gcTime: QUERY_GC_TIME,
    retry: false,
    refetchInterval: false,
    refetchOnMount: 'always',
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const detailQuery = useQuery<ServiceAccountDetail, HttpError>({
    queryKey: computed(() => detailKey(currentIdentity(), selectedAccount.value?.id ?? null)),
    enabled: computed(() => (
      pageActive.value
      && currentIdentity() !== undefined
      && canListAccounts.value
      && selectedAccount.value !== null
    )),
    queryFn: async ({ signal }) => {
      const identity = requireIdentity()
      const id = selectedAccount.value?.id
      if (!id) throw new HttpError('缺少服务账号标识', { kind: 'cancelled' })
      const result = requireOperationData(await getServiceAccount(id, signal))
      ensureCurrentIdentity(identity)
      if (selectedAccount.value?.id === id) roleIds.value = result.role_ids
      return result
    },
    staleTime: 0,
    gcTime: QUERY_GC_TIME,
    retry: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const credentialsQuery = useQuery<readonly ServiceCredential[], HttpError>({
    queryKey: computed(() => credentialsKey(
      currentIdentity(),
      selectedAccount.value?.id ?? null,
    )),
    enabled: false,
    queryFn: async ({ signal }) => {
      const id = selectedAccount.value?.id
      if (!id) throw new HttpError('缺少服务账号标识', { kind: 'cancelled' })
      return requireOperationData(await listServiceCredentials(id, signal))
    },
    staleTime: 0,
    gcTime: QUERY_GC_TIME,
    initialData: () => [],
    retry: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  // 这两个敏感分页只由页签事件显式拉取；没有权限时不会发出请求。
  const delegationsQuery = useQuery<PageResponse<ServiceDelegation>, HttpError>({
    queryKey: computed(() => delegationsKey()),
    enabled: false,
    queryFn: async ({ signal }) => requireOperationData(
      await listServiceDelegations(queryCopy(activeDelegationsQueryParams), signal),
    ),
    gcTime: QUERY_GC_TIME,
    retry: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const auditsQuery = useQuery<PageResponse<ServiceAccessAudit>, HttpError>({
    queryKey: computed(() => auditsKey()),
    enabled: false,
    queryFn: async ({ signal }) => requireOperationData(
      await listServiceAccessAudits(queryCopy(activeAuditsQueryParams), signal),
    ),
    gcTime: QUERY_GC_TIME,
    retry: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const accounts = accountsQuery.data
  const detail = detailQuery.data
  const credentials = credentialsQuery.data
  const delegations = delegationsQuery.data
  const audits = auditsQuery.data

  function beginController(): AbortController {
    return operationScope.beginController()
  }

  function finishController(controller: AbortController): void {
    operationScope.finishController(controller)
  }

  function updateAccountPage(
    identity: ServiceAccountIdentity,
    account: ServiceAccount,
    mode: 'create' | 'update',
  ): void {
    queryClient.setQueryData<PageResponse<ServiceAccount>>(
      accountsKey(identity),
      current => {
        if (!current) return current
        const existing = current.items.some(item => item.id === account.id)
        let items = current.items.map(item => item.id === account.id ? account : item)
        if (!existing && mode === 'create' && current.page === 1) {
          items = [account, ...items].slice(0, current.page_size)
        }
        const total = mode === 'create' && !existing ? current.total + 1 : current.total
        return {
          ...current,
          items,
          total,
          total_pages: total === 0 ? 0 : Math.ceil(total / current.page_size),
        }
      },
    )
    if (selectedAccount.value?.id === account.id) selectedAccount.value = account
  }

  function removeAccountFromPage(
    identity: ServiceAccountIdentity,
    accountId: string,
  ): void {
    queryClient.setQueryData<PageResponse<ServiceAccount>>(
      accountsKey(identity),
      current => {
        if (!current) return current
        const total = Math.max(0, current.total - 1)
        return {
          ...current,
          items: current.items.filter(item => item.id !== accountId),
          total,
          total_pages: total === 0 ? 0 : Math.ceil(total / current.page_size),
        }
      },
    )
  }

  async function fetchAccounts(): Promise<void> {
    if (!pageActive.value || !currentIdentity() || !canListAccounts.value) return
    const next = queryCopy(queryParams)
    if (!samePageQuery(next, activeQueryParams)) {
      Object.assign(activeQueryParams, next)
      await nextTick()
    }
    await accountsQuery.refetch({ throwOnError: true })
  }

  async function resetAccountFilters(): Promise<void> {
    queryParams.page = 1
    queryParams.page_size = queryParams.page_size ?? DEFAULT_PAGE_SIZE
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
    if (!pageActive.value || !currentIdentity()) return
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

  async function issueCredential(
    accountId: string,
    input: CreateServiceCredentialInput,
    expectedIdentity = captureIdentity(),
  ): Promise<CreatedServiceCredential> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const signature = JSON.stringify({ accountId, input })
    const idempotencyKey = pendingCredentialKeys.get(signature)
      ?? createIdempotencyKey('service-credential')
    const controller = beginController()
    issueCredentialPending.value = true
    try {
      const result = requireOperationData(await createServiceCredential(
        accountId,
        input,
        idempotencyKey,
        controller.signal,
      ))
      ensureOperationContext(identity, operationContext)
      // 只缓存不含 Secret 的元数据；完整结果仅经本次函数返回给局部对话框。
      queryClient.setQueryData<readonly ServiceCredential[]>(
        credentialsKey(identity, accountId),
        current => [
          result.credential,
          ...(current ?? []).filter(item => item.id !== result.credential.id),
        ],
      )
      pendingCredentialKeys.delete(signature)
      return result
    }
    catch (error) {
      if (sameIdentity(identity, currentIdentity()) && shouldReuseIdempotencyKey(error)) {
        pendingCredentialKeys.set(signature, idempotencyKey)
      }
      else {
        pendingCredentialKeys.delete(signature)
      }
      throw error
    }
    finally {
      finishController(controller)
      issueCredentialPending.value = false
    }
  }

  async function fetchCredentials(): Promise<void> {
    if (
      !pageActive.value
      || !currentIdentity()
      || !canListAccounts.value
      || !selectedAccount.value
    ) return
    await credentialsQuery.refetch({ throwOnError: true })
  }

  async function revokeCredential(
    accountId: string,
    credential: ServiceCredential,
    expectedIdentity = captureIdentity(),
  ): Promise<void> {
    const operationContext = requireOperationContext(expectedIdentity)
    const identity = requireIdentity()
    const controller = beginController()
    revokingCredentialId.value = credential.id
    try {
      await revokeServiceCredential(accountId, credential.id, controller.signal)
      ensureOperationContext(identity, operationContext)
      queryClient.setQueryData<readonly ServiceCredential[]>(
        credentialsKey(identity, accountId),
        current => current?.map(item => item.id === credential.id
          ? { ...item, revoked_at: new Date().toISOString(), status: 'revoked' }
          : item),
      )
      if (selectedAccount.value?.id === accountId) {
        void credentialsQuery.refetch({ throwOnError: false })
      }
    }
    finally {
      finishController(controller)
      if (revokingCredentialId.value === credential.id) {
        revokingCredentialId.value = undefined
      }
    }
  }

  async function fetchDelegations(): Promise<void> {
    if (!pageActive.value || !currentIdentity() || !canListDelegations.value) return
    const next = queryCopy(delegationsQueryParams)
    if (!samePageQuery(next, activeDelegationsQueryParams)) {
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

  async function fetchAudits(): Promise<void> {
    if (!pageActive.value || !currentIdentity() || !canListAudits.value) return
    const next = queryCopy(auditsQueryParams)
    if (!samePageQuery(next, activeAuditsQueryParams)) {
      Object.assign(activeAuditsQueryParams, next)
      await nextTick()
    }
    await auditsQuery.refetch({ throwOnError: true })
  }

  function cancelIdentityQueries(
    identity: ServiceAccountIdentity,
    remove: boolean,
  ): void {
    for (const resource of SERVICE_ACCOUNT_RESOURCES) {
      const prefix = ['server-state', identity.tenantId, resource]
      void queryClient.cancelQueries({ queryKey: prefix })
      if (remove) queryClient.removeQueries({ queryKey: prefix })
    }
  }

  const unsubscribeUser = userStore.$subscribe(() => {
    const nextIdentity = currentIdentity()
    if (sameIdentity(trackedIdentity, nextIdentity)) return
    const previousIdentity = trackedIdentity
    trackedIdentity = nextIdentity
    operationScope.invalidate()
    pendingCredentialKeys.clear()
    selectedAccount.value = null
    roleIds.value = []
    if (previousIdentity) cancelIdentityQueries(previousIdentity, true)
  }, { flush: 'sync' })

  onActivated(() => {
    if (pageActive.value) return
    pageActive.value = true
    void refresh()
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
      pendingCredentialKeys.clear()
      unsubscribeUser()
    })
  }

  return {
    accounts,
    accountsError: accountsQuery.error,
    accountsLoading: accountsQuery.isFetching,
    activeAuditsQueryParams,
    activeDelegationsQueryParams,
    activeQueryParams,
    audits,
    auditsError: auditsQuery.error,
    auditsLoading: auditsQuery.isFetching,
    auditsQueryParams,
    canAddAccount,
    canEditAccount,
    canListAccounts,
    canListAudits,
    canListDepartments,
    canListDelegations,
    canListRoles,
    canManageRoles,
    canRemoveAccount,
    canRevokeDelegation,
    canRevokeKey,
    canRotateKey,
    captureIdentity,
    credentials,
    credentialsError: credentialsQuery.error,
    credentialsLoading: credentialsQuery.isFetching,
    delegations,
    delegationsError: delegationsQuery.error,
    delegationsLoading: delegationsQuery.isFetching,
    delegationsQueryParams,
    detail,
    detailError: detailQuery.error,
    detailLoading: detailQuery.isFetching,
    error: accountsQuery.error,
    fetchAccounts,
    fetchAudits,
    fetchCredentials,
    fetchDelegations,
    issueCredential,
    issueCredentialPending,
    identityMatches,
    loading: accountsQuery.isFetching,
    onIdentityChanged,
    onIdentityInvalidated: onIdentityChanged,
    pageActive,
    queryParams,
    refresh,
    removeAccount,
    removePending,
    resetAccountFilters,
    revokeCredential,
    revokeDelegation,
    revokingCredentialId,
    revokingDelegationId,
    roleIds,
    rolesPending,
    saveAccount,
    savePending,
    saveRoles,
    selectAccount,
    selectedAccount,
    setAccountStatus,
    statusPending,
  }
}
