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
import { HttpError, requireOperationData } from '@/shared/http/client'
import type { PageResponse } from '@/shared/http/types'
import { tenantQueryKey } from '@/shared/query/client'
import {
  SERVICE_ACCESS_AUDITS_RESOURCE,
  SERVICE_ACCOUNTS_RESOURCE,
  SERVICE_CREDENTIALS_RESOURCE,
  SERVICE_DELEGATIONS_RESOURCE,
} from '../queryResources'
import {
  copyServiceAccountQuery,
  SERVICE_ACCOUNT_DEFAULT_PAGE_SIZE,
  SERVICE_ACCOUNT_QUERY_GC_TIME,
  type ServiceAccountIdentity,
  type ServiceResourcePageState,
} from './serviceAccountContextTypes'
import { useServiceAccountIdentityContext } from './useServiceAccountIdentityContext'

/** 服务账号、凭据、委托与审计的 Query 状态。 */
export function useServiceAccountQueries(
  identityContext: ReturnType<typeof useServiceAccountIdentityContext>,
) {
  const queryParams = reactive<ServiceResourcePageState>({
    page: 1,
    page_size: SERVICE_ACCOUNT_DEFAULT_PAGE_SIZE,
  })
  const activeQueryParams = reactive<ServiceResourcePageState>({ ...queryParams })
  const delegationsQueryParams = reactive<ServiceResourcePageState>({
    page: 1,
    page_size: SERVICE_ACCOUNT_DEFAULT_PAGE_SIZE,
  })
  const activeDelegationsQueryParams = reactive<ServiceResourcePageState>({
    ...delegationsQueryParams,
  })
  const auditsQueryParams = reactive<ServiceResourcePageState>({
    page: 1,
    page_size: SERVICE_ACCOUNT_DEFAULT_PAGE_SIZE,
  })
  const activeAuditsQueryParams = reactive<ServiceResourcePageState>({ ...auditsQueryParams })
  const selectedAccount = ref<ServiceAccount | null>(null)
  const roleIds = ref<readonly string[]>([])

  function identityParams(identity = identityContext.currentIdentity()) {
    return { userId: identity?.userId ?? 'anonymous' }
  }

  function accountsKey(
    identity = identityContext.currentIdentity(),
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
    identity = identityContext.currentIdentity(),
    query: ServiceDelegationQuery = activeDelegationsQueryParams,
  ) {
    return tenantQueryKey(identity?.tenantId, SERVICE_DELEGATIONS_RESOURCE, {
      ...identityParams(identity),
      query: copyServiceAccountQuery(query),
      scope: 'list',
    })
  }

  function auditsKey(
    identity = identityContext.currentIdentity(),
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
      identityContext.pageActive.value
      && identityContext.currentIdentity() !== undefined
      && identityContext.canListAccounts.value
      && identityContext.featureAvailable.value
    )),
    queryFn: async ({ signal }) => requireOperationData(
      await listServiceAccounts(copyServiceAccountQuery(activeQueryParams), signal),
    ),
    staleTime: 0,
    gcTime: SERVICE_ACCOUNT_QUERY_GC_TIME,
    retry: false,
    refetchInterval: false,
    refetchOnMount: 'always',
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const detailQuery = useQuery<ServiceAccountDetail, HttpError>({
    queryKey: computed(() => detailKey(
      identityContext.currentIdentity(),
      selectedAccount.value?.id ?? null,
    )),
    enabled: computed(() => (
      identityContext.pageActive.value
      && identityContext.currentIdentity() !== undefined
      && identityContext.canListAccounts.value
      && identityContext.featureAvailable.value
      && selectedAccount.value !== null
    )),
    queryFn: async ({ signal }) => {
      const identity = identityContext.requireIdentity()
      const id = selectedAccount.value?.id
      if (!id) throw new HttpError('缺少服务账号标识', { kind: 'cancelled' })
      const result = requireOperationData(await getServiceAccount(id, signal))
      identityContext.ensureCurrentIdentity(identity)
      if (selectedAccount.value?.id === id) roleIds.value = result.role_ids
      return result
    },
    staleTime: 0,
    gcTime: SERVICE_ACCOUNT_QUERY_GC_TIME,
    retry: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const credentialsQuery = useQuery<readonly ServiceCredential[], HttpError>({
    queryKey: computed(() => credentialsKey(
      identityContext.currentIdentity(),
      selectedAccount.value?.id ?? null,
    )),
    enabled: false,
    queryFn: async ({ signal }) => {
      const id = selectedAccount.value?.id
      if (!id) throw new HttpError('缺少服务账号标识', { kind: 'cancelled' })
      return requireOperationData(await listServiceCredentials(id, signal))
    },
    staleTime: 0,
    gcTime: SERVICE_ACCOUNT_QUERY_GC_TIME,
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
    gcTime: SERVICE_ACCOUNT_QUERY_GC_TIME,
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
    gcTime: SERVICE_ACCOUNT_QUERY_GC_TIME,
    retry: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  return {
    accounts: accountsQuery.data,
    accountsKey,
    accountsQuery,
    activeAuditsQueryParams,
    activeDelegationsQueryParams,
    activeQueryParams,
    audits: auditsQuery.data,
    auditsKey,
    auditsQuery,
    auditsQueryParams,
    credentials: credentialsQuery.data,
    credentialsKey,
    credentialsQuery,
    delegations: delegationsQuery.data,
    delegationsKey,
    delegationsQuery,
    delegationsQueryParams,
    detail: detailQuery.data,
    detailKey,
    detailQuery,
    queryParams,
    roleIds,
    selectedAccount,
  }
}
