import type { ServiceAccountQuery } from '@/api/modules/serviceAccount'
import type { IdentityOperationGuard } from '@/shared/query/createIdentityOperationScope'

export const SERVICE_ACCOUNT_DEFAULT_PAGE_SIZE = 20
export const SERVICE_ACCOUNT_QUERY_GC_TIME = 10 * 60_000

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
