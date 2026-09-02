import type { ServiceAccountQuery } from '@/api/modules/serviceAccount'
import type { IdentityOperationGuard } from '@/shared/query/createIdentityOperationScope'
import { sameServerStateScope, type ServerStateScope } from '@/shared/query/scope'

export const SERVICE_ACCOUNT_DEFAULT_PAGE_SIZE = 20
export const SERVICE_ACCOUNT_QUERY_GC_TIME = 10 * 60_000

export type ServiceAccountScope = ServerStateScope

export type ServiceResourcePageState = { page: number; page_size: number }
export type ServiceAccountIdentityGuard = IdentityOperationGuard

export function sameServiceAccountScope(
  left: ServiceAccountScope | undefined,
  right: ServiceAccountScope | undefined,
): boolean {
  return sameServerStateScope(left, right)
}

export function sameServiceAccountPageQuery(
  left: ServiceAccountQuery,
  right: ServiceAccountQuery,
): boolean {
  return left.page === right.page && left.page_size === right.page_size
}

export function copyServiceAccountQuery<T extends { page?: number; page_size?: number }>(
  query: T,
): T {
  return { ...query }
}
