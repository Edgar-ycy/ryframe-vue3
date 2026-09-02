import {
  assertServerStateScopeCurrent,
  invalidateServerStateResource,
  reportServerStatePageError,
} from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'

export const PRODUCT_PLANS_RESOURCE = 'platform-product-plans'
export const PRODUCT_PLAN_VERSIONS_RESOURCE = 'platform-product-plan-versions'
export type AssertProductPlanPageCurrent = () => void

export function propagateProductPlanMutationError(
  error: unknown,
  scope: ServerStateScope,
  assertPageCurrent: AssertProductPlanPageCurrent,
): never {
  assertServerStateScopeCurrent(scope, error)
  assertPageCurrent()
  throw reportServerStatePageError(error)
}

export async function invalidateProductPlanResources(
  scope: ServerStateScope,
  includeVersions: boolean,
  assertPageCurrent: AssertProductPlanPageCurrent,
): Promise<void> {
  assertServerStateScopeCurrent(scope)
  assertPageCurrent()
  const resources = includeVersions
    ? [PRODUCT_PLANS_RESOURCE, PRODUCT_PLAN_VERSIONS_RESOURCE]
    : [PRODUCT_PLANS_RESOURCE]
  await Promise.all(resources.map((resource) => invalidateServerStateResource(scope, resource)))
  assertServerStateScopeCurrent(scope)
  assertPageCurrent()
}
