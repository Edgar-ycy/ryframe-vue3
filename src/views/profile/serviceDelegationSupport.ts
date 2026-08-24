export const PROFILE_SERVICE_DELEGATIONS_RESOURCE = 'profile-service-delegations'
export const PROFILE_SERVICE_DELEGATION_TARGETS_RESOURCE = 'profile-service-delegation-targets'
export const QUERY_GC_TIME = 10 * 60_000

export interface ProfileDelegationIdentity {
  tenantId: string
  userId: string
}

export type ProfileDelegationIdentityGuard = string

export function sameIdentity(
  left: ProfileDelegationIdentity | undefined,
  right: ProfileDelegationIdentity | undefined,
): boolean {
  return left?.tenantId === right?.tenantId && left?.userId === right?.userId
}
