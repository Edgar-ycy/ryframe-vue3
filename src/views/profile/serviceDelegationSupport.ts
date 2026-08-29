export const PROFILE_SERVICE_DELEGATIONS_RESOURCE = 'profile-service-delegations'
export const PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE = 'profile-service-delegation-targets'
export const QUERY_GC_TIME = 10 * 60_000

export type ProfileDelegationScope = ServerStateScope

export type ProfileDelegationIdentityGuard = string

export function sameIdentity(
  left: ProfileDelegationScope | undefined,
  right: ProfileDelegationScope | undefined,
): boolean {
  return sameServerStateScope(left, right)
}
import { sameServerStateScope, type ServerStateScope } from '@/shared/query/scope'
