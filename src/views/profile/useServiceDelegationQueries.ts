import type { ComputedRef } from 'vue'
import {
  listProfileServiceDelegations,
  listProfileServiceDelegationTargets,
  type ProfileServiceDelegation,
  type ProfileServiceDelegationTarget,
} from '@/api/modules/profileServiceDelegation'
import { requireOperationData } from '@/shared/http/client'
import { serverStateQueryKey } from '@/shared/query/client'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import {
  PROFILE_SERVICE_DELEGATIONS_RESOURCE,
  PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE,
  QUERY_GC_TIME,
  type ProfileDelegationScope,
} from './serviceDelegationSupport'

/** 个人服务委托与候选服务账号的只读查询。 */
export function useServiceDelegationQueries(
  enabled: ComputedRef<boolean>,
  currentIdentity: () => ProfileDelegationScope | undefined,
) {
  function delegationsKey(scope: ProfileDelegationScope) {
    return serverStateQueryKey(scope, PROFILE_SERVICE_DELEGATIONS_RESOURCE, {
      scope: 'self',
      userId: scope.subjectId,
    })
  }

  function targetsKey(scope: ProfileDelegationScope) {
    return serverStateQueryKey(scope, PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE, {
      scope: 'self',
      userId: scope.subjectId,
    })
  }

  const delegationsQuery = useServerStateQuery<readonly ProfileServiceDelegation[]>(
    enabled,
    PROFILE_SERVICE_DELEGATIONS_RESOURCE,
    () => ({ scope: 'self', userId: currentIdentity()?.subjectId ?? 'anonymous' }),
    async (signal) => requireOperationData(await listProfileServiceDelegations(signal)),
    {
      initialData: () => [],
      staleTime: 0,
      gcTime: QUERY_GC_TIME,
      retry: false,
      meta: { errorMode: 'silent' },
      refetchInterval: false,
      refetchOnMount: 'always',
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  )

  const targetsQuery = useServerStateQuery<readonly ProfileServiceDelegationTarget[]>(
    enabled,
    PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE,
    () => ({ scope: 'self', userId: currentIdentity()?.subjectId ?? 'anonymous' }),
    async (signal) => requireOperationData(await listProfileServiceDelegationTargets(signal)),
    {
      initialData: () => [],
      staleTime: 0,
      gcTime: QUERY_GC_TIME,
      retry: false,
      meta: { errorMode: 'silent' },
      refetchInterval: false,
      refetchOnMount: 'always',
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  )

  return { delegationsKey, delegationsQuery, targetsKey, targetsQuery }
}
