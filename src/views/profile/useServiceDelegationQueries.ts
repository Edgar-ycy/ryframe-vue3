import type { ComputedRef } from 'vue'
import {
  listProfileServiceDelegations,
  listProfileServiceDelegationTargets,
  type ProfileServiceDelegation,
  type ProfileServiceDelegationTarget,
} from '@/api/modules/profileServiceDelegation'
import { requireOperationData } from '@/shared/http/client'
import { serverStateQueryKeyForIdentity } from '@/shared/query/client'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import {
  PROFILE_SERVICE_DELEGATIONS_RESOURCE,
  PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE,
  QUERY_GC_TIME,
  type ProfileDelegationIdentity,
} from './serviceDelegationSupport'

/** 个人服务委托与候选服务账号的只读查询。 */
export function useServiceDelegationQueries(
  enabled: ComputedRef<boolean>,
  currentIdentity: () => ProfileDelegationIdentity | undefined,
) {
  function delegationsKey(identity = currentIdentity()) {
    return serverStateQueryKeyForIdentity(
      identity?.tenantId,
      identity?.userId,
      PROFILE_SERVICE_DELEGATIONS_RESOURCE,
      { scope: 'self', userId: identity?.userId ?? 'anonymous' },
    )
  }

  function targetsKey(identity = currentIdentity()) {
    return serverStateQueryKeyForIdentity(
      identity?.tenantId,
      identity?.userId,
      PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE,
      { scope: 'self', userId: identity?.userId ?? 'anonymous' },
    )
  }

  const delegationsQuery = useServerStateQuery<readonly ProfileServiceDelegation[]>(
    enabled,
    PROFILE_SERVICE_DELEGATIONS_RESOURCE,
    () => ({ scope: 'self', userId: currentIdentity()?.userId ?? 'anonymous' }),
    async (signal) => requireOperationData(await listProfileServiceDelegations(signal)),
    {
      initialData: () => [],
      staleTime: 0,
      gcTime: QUERY_GC_TIME,
      retry: false,
      refetchInterval: false,
      refetchOnMount: 'always',
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  )

  const targetsQuery = useServerStateQuery<readonly ProfileServiceDelegationTarget[]>(
    enabled,
    PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE,
    () => ({ scope: 'self', userId: currentIdentity()?.userId ?? 'anonymous' }),
    async (signal) => requireOperationData(await listProfileServiceDelegationTargets(signal)),
    {
      initialData: () => [],
      staleTime: 0,
      gcTime: QUERY_GC_TIME,
      retry: false,
      refetchInterval: false,
      refetchOnMount: 'always',
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  )

  return { delegationsKey, delegationsQuery, targetsKey, targetsQuery }
}
