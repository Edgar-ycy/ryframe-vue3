import { createPinia, setActivePinia } from 'pinia'
import { effectScope, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Runtime {
  getPackage: ReturnType<typeof vi.fn>
  getTransfer: ReturnType<typeof vi.fn>
  mergePackage: ReturnType<typeof vi.fn>
  selectedPackage?: Ref
  selectedTransfer?: Ref
}

const runtime = vi.hoisted<Runtime>(() => ({
  getPackage: vi.fn(),
  getTransfer: vi.fn(),
  mergePackage: vi.fn(),
}))

vi.mock('@/api/modules/tenantConfigTransfer', () => ({
  getTenantConfigPackage: runtime.getPackage,
  getTenantConfigTransfer: runtime.getTransfer,
}))
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}))
vi.mock('@/views/system/config-transfer/composables/useTenantConfigTransferActiveTracking', () => ({
  useTenantConfigTransferActiveTracking: () => ({
    abortActiveRequest: vi.fn(),
    scheduleActiveCycle: vi.fn(),
    stopActiveCycle: vi.fn(),
  }),
}))
vi.mock('@/views/system/config-transfer/composables/useTenantConfigTransferCommands', () => ({
  useTenantConfigTransferCommands: () => ({
    applyPending: ref(false),
    applyTransfer: vi.fn(),
    clearPendingIntents: vi.fn(),
    createFromPackage: vi.fn(),
    createPackage: vi.fn(),
    createPackagePending: ref(false),
    createTransferPending: ref(false),
    downloadPackage: vi.fn(),
    downloadingPackageId: ref(),
    ensureOperationContext: vi.fn(),
    mergeTransfer: vi.fn(),
    operationKind: ref(),
    previewTransfer: vi.fn(),
    requireIdentity: () => ({ tenantId: 'tenant-a', subjectId: 'user-a', sessionEpoch: 1 }),
    requireOperationContext: () => 'guard-a',
    rollbackTransfer: vi.fn(),
    uploadPackage: vi.fn(),
  }),
}))
vi.mock('@/views/system/config-transfer/composables/useTenantConfigTransferLifecycle', () => ({
  useTenantConfigTransferLifecycle: vi.fn(),
}))
vi.mock('@/views/system/config-transfer/composables/useTenantConfigTransferQueries', () => ({
  useTenantConfigTransferQueries: () => {
    runtime.selectedPackage = ref()
    runtime.selectedTransfer = ref()
    return {
      activePackageQueryParams: ref({ page: 1, page_size: 10 }),
      activeQueryParams: ref({ page: 1, page_size: 10 }),
      itemQueryParams: ref({ page: 1, page_size: 20 }),
      itemsQuery: { data: ref(), error: ref(), isFetching: ref(false), refetch: vi.fn() },
      mergePackage: runtime.mergePackage,
      mergeTransfer: vi.fn(),
      packageQueryParams: ref({ page: 1, page_size: 10 }),
      packagesQuery: { data: ref(), error: ref(), isFetching: ref(false), refetch: vi.fn() },
      queryEnabled: () => true,
      queryParams: ref({ page: 1, page_size: 10 }),
      samePageQuery: () => true,
      selectedPackage: runtime.selectedPackage!,
      selectedTransfer: runtime.selectedTransfer!,
      transfersQuery: { data: ref(), error: ref(), isFetching: ref(false), refetch: vi.fn() },
    }
  },
}))

import type { TenantConfigBundle } from '@/api/modules/tenantConfigTransfer'
import type { ApiResponse } from '@/shared/http/types'
import { deactivateServerStateScope, transitionServerStateScope } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { useTenantConfigTransferManagement } from '@/views/system/config-transfer/composables/useTenantConfigTransferManagement'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function bundle(id: string): TenantConfigBundle {
  return {
    created_at: '2026-08-29T00:00:00.000Z',
    id,
    item_count: 1,
    origin: 'generated',
    package_schema_version: '1',
    resource_counts: { config: 1 },
    source_app_version: '1',
    source_tenant_key: 'tenant-a',
    source_tenant_name: 'Tenant A',
    status: 'ready',
    updated_at: '2026-08-29T00:00:00.000Z',
  }
}

function response<T>(data: T): ApiResponse<T> {
  return { code: 200, data, message: 'ok', request_id: 'request-1' }
}

beforeEach(() => {
  setActivePinia(createPinia())
  useUserStore().$patch({
    sessionStatus: 'authenticated',
    tenantId: 'tenant-a',
    userId: 'user-a',
  })
  transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId: 'user-a',
      authorizationFingerprint: 'authorization-a',
    },
    () => undefined,
    { force: true },
  )
  runtime.getPackage.mockReset()
  runtime.mergePackage.mockReset()
})

afterEach(() => {
  deactivateServerStateScope()
})

describe('配置包选择所有权', () => {
  it('同 scope 快速选择 A/B 时中止 A 且迟到响应不覆盖 B', async () => {
    const requestA = deferred<ApiResponse<TenantConfigBundle>>()
    const requestB = deferred<ApiResponse<TenantConfigBundle>>()
    runtime.getPackage.mockReturnValueOnce(requestA.promise).mockReturnValueOnce(requestB.promise)
    const scope = effectScope()
    const management = scope.run(() => useTenantConfigTransferManagement())!
    const bundleA = bundle('bundle-a')
    const bundleB = bundle('bundle-b')

    const selectA = management.selectPackage(bundleA)
    const selectB = management.selectPackage(bundleB)
    const signalA = runtime.getPackage.mock.calls[0]?.[1] as AbortSignal
    expect(signalA.aborted).toBe(true)

    requestB.resolve(response(bundleB))
    await selectB
    requestA.resolve(response(bundleA))
    await expect(selectA).rejects.toMatchObject({ kind: 'cancelled' })

    expect(runtime.selectedPackage!.value).toEqual(bundleB)
    expect(runtime.mergePackage).toHaveBeenCalledOnce()
    expect(runtime.mergePackage).toHaveBeenCalledWith(expect.any(Object), bundleB)
    scope.stop()
  })
})
