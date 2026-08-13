import { computed, reactive, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  getServiceAccount,
  listServiceAccessAudits,
  listServiceAccounts,
  listServiceCredentials,
  listServiceDelegations,
  type ServiceAccessAudit,
  type ServiceAccessAuditQuery,
  type ServiceAccount,
  type ServiceAccountDetail,
  type ServiceAccountQuery,
  type ServiceCredential,
  type ServiceDelegation,
  type ServiceDelegationQuery,
} from '@/api/modules/serviceAccount'
import { usePermission } from '@/hooks/usePermission'
import { HttpError, requireOperationData } from '@/shared/http/client'
import type { PageResponse } from '@/shared/http/types'
import { queryClient, tenantQueryKey } from '@/shared/query/client'
import {
  createIdentityOperationScope,
  type IdentityOperationGuard,
} from '@/shared/query/createIdentityOperationScope'
import { useUserStore } from '@/stores/user'
import {
  SERVICE_ACCESS_AUDITS_RESOURCE,
  SERVICE_ACCOUNTS_RESOURCE,
  SERVICE_CREDENTIALS_RESOURCE,
  SERVICE_DELEGATIONS_RESOURCE,
} from '../queryResources'

const DEFAULT_PAGE_SIZE = 20
const QUERY_GC_TIME = 10 * 60_000

export interface ServiceAccountIdentity {
  tenantId: string
  userId: string
}

export type ServiceResourcePageState = { page: number, page_size: number }
export type ServiceAccountIdentityGuard = IdentityOperationGuard

export function sameServiceAccountIdentity(
  left: ServiceAccountIdentity | undefined,
  right: ServiceAccountIdentity | undefined,
): boolean {
  return left?.tenantId === right?.tenantId && left?.userId === right?.userId
}

export function sameServiceAccountPageQuery(
  left: ServiceAccountQuery,
  right: ServiceAccountQuery,
): boolean {
  return left.page === right.page && left.page_size === right.page_size
}

export function copyServiceAccountQuery<T extends { page?: number, page_size?: number }>(query: T): T {
  return { ...query }
}

/** 服务账号管理的身份、权限、Query Key 与服务端 Query 上下文。 */
export function useServiceAccountContext() {
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
    sameIdentity: sameServiceAccountIdentity,
  })

  function requireIdentity(): ServiceAccountIdentity {
    const identity = currentIdentity()
    if (!identity) {
      throw new HttpError('当前登录身份已失效', { status: 401, kind: 'http' })
    }
    return identity
  }

  function ensureCurrentIdentity(identity: ServiceAccountIdentity): void {
    if (!sameServiceAccountIdentity(identity, currentIdentity())) {
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
      query: copyServiceAccountQuery(query),
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
      query: copyServiceAccountQuery(query),
      scope: 'list',
    })
  }

  function auditsKey(
    identity = currentIdentity(),
    query: ServiceAccessAuditQuery = activeAuditsQueryParams,
  ) {
    return tenantQueryKey(identity?.tenantId, SERVICE_ACCESS_AUDITS_RESOURCE, {
      ...identityParams(identity),
      query: copyServiceAccountQuery(query),
      scope: 'list',
    })
  }

  const accountsQuery = useQuery<PageResponse<ServiceAccount>, HttpError>({
    queryKey: computed(() => accountsKey()),
    enabled: computed(() => (
      pageActive.value && currentIdentity() !== undefined && canListAccounts.value
    )),
    queryFn: async ({ signal }) => requireOperationData(
      await listServiceAccounts(copyServiceAccountQuery(activeQueryParams), signal),
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
      await listServiceDelegations(copyServiceAccountQuery(activeDelegationsQueryParams), signal),
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
      await listServiceAccessAudits(copyServiceAccountQuery(activeAuditsQueryParams), signal),
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


  return {
    accounts,
    accountsKey,
    accountsQuery,
    activeAuditsQueryParams,
    activeDelegationsQueryParams,
    activeQueryParams,
    audits,
    auditsKey,
    auditsQuery,
    auditsQueryParams,
    beginController,
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
    currentIdentity,
    credentials,
    credentialsKey,
    credentialsQuery,
    delegations,
    delegationsKey,
    delegationsQuery,
    delegationsQueryParams,
    detail,
    detailKey,
    detailQuery,
    ensureCurrentIdentity,
    ensureOperationContext,
    finishController,
    identityMatches,
    onIdentityChanged,
    operationScope,
    pageActive,
    queryParams,
    removeAccountFromPage,
    requireIdentity,
    requireOperationContext,
    roleIds,
    selectedAccount,
    updateAccountPage,
  }
}
