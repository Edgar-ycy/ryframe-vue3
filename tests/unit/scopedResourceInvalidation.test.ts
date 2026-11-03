import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ServerStateScope } from '@/shared/query/scope'
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

function seed(scope: ServerStateScope, resource: string, variant: string) {
  const key = serverStateQueryKey(scope, resource, { variant })
  const data = {
    cached: true,
    tenantId: scope.tenantId,
    subjectId: scope.subjectId,
    sessionEpoch: scope.sessionEpoch,
  }
  queryClient.setQueryData(key, { ...data })
  return { key, data }
}

/** 同参数的其他会话与当前会话无关资源必须保持原值，不能被页面写入一起失效。 */
function seedUnaffectedCaches(scope: ServerStateScope, targets: [string, string][]) {
  const foreignScopes: ServerStateScope[] = [
    { ...scope, tenantId: 'tenant-b' },
    { ...scope, subjectId: 'user-b' },
    { ...scope, sessionEpoch: scope.sessionEpoch + 1 },
  ]
  return [
    ...targets.flatMap(([resource, variant]) =>
      foreignScopes.map((foreign) => seed(foreign, resource, variant)),
    ),
    seed(scope, 'unrelated-resource', 'unrelated-variant'),
  ]
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
    const { key: planKey } = seed(scope, PRODUCT_PLANS_RESOURCE, 'list-other-page')
    const { key: versionKey } = seed(scope, PRODUCT_PLAN_VERSIONS_RESOURCE, 'other-plan')
    const unaffected = seedUnaffectedCaches(scope, [
      [PRODUCT_PLANS_RESOURCE, 'list-other-page'],
      [PRODUCT_PLAN_VERSIONS_RESOURCE, 'other-plan'],
    ])

    await invalidateProductPlanResources(scope, true, () => undefined)

    expect(queryClient.getQueryState(planKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(versionKey)?.isInvalidated).toBe(true)
    for (const { key, data } of unaffected) {
      expect(queryClient.getQueryData(key)).toEqual(data)
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false)
    }
  })

  it('迁移写入同时失效 placement 与 migration 的所有缓存变体', async () => {
    const scope = getServerStateScope()!
    // 这里的参数是管理员查看的其他租户，不是当前登录会话的租户。
    const { key: placementKey } = seed(scope, TENANT_DATA_PLACEMENT_RESOURCE, 'managed-tenant-b')
    const { key: migrationKey } = seed(scope, TENANT_DATA_MIGRATIONS_RESOURCE, 'managed-tenant-b')
    const unaffected = seedUnaffectedCaches(scope, [
      [TENANT_DATA_PLACEMENT_RESOURCE, 'managed-tenant-b'],
      [TENANT_DATA_MIGRATIONS_RESOURCE, 'managed-tenant-b'],
    ])

    await invalidateTenantMigrationResources(scope)

    expect(queryClient.getQueryState(placementKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(migrationKey)?.isInvalidated).toBe(true)
    for (const { key, data } of unaffected) {
      expect(queryClient.getQueryData(key)).toEqual(data)
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false)
    }
  })

  it('租户套餐应用失效完整 scope 下的其他 context 变体', async () => {
    const scope = getServerStateScope()!
    const { key: contextKey } = seed(scope, TENANT_PRODUCT_CONTEXT_RESOURCE, 'managed-tenant-b')
    const unaffected = seedUnaffectedCaches(scope, [
      [TENANT_PRODUCT_CONTEXT_RESOURCE, 'managed-tenant-b'],
    ])

    await invalidateTenantProductContext(scope)

    expect(queryClient.getQueryState(contextKey)?.isInvalidated).toBe(true)
    for (const { key, data } of unaffected) {
      expect(queryClient.getQueryData(key)).toEqual(data)
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false)
    }
  })
})
