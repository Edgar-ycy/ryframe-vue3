import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  serverStateQueryKey,
  transitionServerStateScope,
} from '@/shared/query/client'
import {
  invalidateProductPlanResources,
  PRODUCT_PLAN_VERSIONS_RESOURCE,
  PRODUCT_PLANS_RESOURCE,
} from '@/views/platform/product-plans/productPlanMutationScope'
import {
  invalidateTenantMigrationResources,
  TENANT_DATA_MIGRATIONS_RESOURCE,
  TENANT_DATA_PLACEMENT_RESOURCE,
} from '@/views/platform/tenant/components/tenantDataMigrationCommand'
import {
  invalidateTenantProductContext,
  TENANT_PRODUCT_CONTEXT_RESOURCE,
} from '@/views/platform/tenant/components/tenantProductChangeCommands'

function seed(resource: string, variant: string) {
  const scope = getServerStateScope()
  if (!scope) throw new Error('测试会话范围未激活')
  const key = serverStateQueryKey(scope, resource, { variant })
  queryClient.setQueryData(key, { cached: true })
  return key
}

describe('页面写操作的完整 scope 资源失效', () => {
  beforeEach(() => {
    queryClient.clear()
    deactivateServerStateScope()
    transitionServerStateScope(
      { tenantId: 'tenant-a', subjectId: 'user-a', authorizationFingerprint: 'auth-a' },
      () => undefined,
      { force: true },
    )
  })

  afterEach(() => {
    queryClient.clear()
    deactivateServerStateScope()
  })

  it('套餐版本写入同时失效套餐和版本的所有缓存变体', async () => {
    const scope = getServerStateScope()!
    const planKey = seed(PRODUCT_PLANS_RESOURCE, 'list-other-page')
    const versionKey = seed(PRODUCT_PLAN_VERSIONS_RESOURCE, 'other-plan')

    await invalidateProductPlanResources(scope, true, () => undefined)

    expect(queryClient.getQueryState(planKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(versionKey)?.isInvalidated).toBe(true)
  })

  it('迁移写入同时失效 placement 与 migration 的所有缓存变体', async () => {
    const scope = getServerStateScope()!
    const placementKey = seed(TENANT_DATA_PLACEMENT_RESOURCE, 'tenant-b')
    const migrationKey = seed(TENANT_DATA_MIGRATIONS_RESOURCE, 'tenant-b')

    await invalidateTenantMigrationResources(scope)

    expect(queryClient.getQueryState(placementKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(migrationKey)?.isInvalidated).toBe(true)
  })

  it('租户套餐应用失效完整 scope 下的其他 context 变体', async () => {
    const scope = getServerStateScope()!
    const contextKey = seed(TENANT_PRODUCT_CONTEXT_RESOURCE, 'tenant-b')

    await invalidateTenantProductContext(scope)

    expect(queryClient.getQueryState(contextKey)?.isInvalidated).toBe(true)
  })
})
