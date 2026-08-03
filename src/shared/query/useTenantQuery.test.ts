import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryHarness = vi.hoisted(() => ({
  useQuery: vi.fn(),
}))

vi.mock('@tanstack/vue-query', () => ({
  useQuery: queryHarness.useQuery,
}))
vi.mock('./client', () => ({
  tenantQueryKey: (tenantId: string | undefined, resource: string, params?: unknown) => [
    'server-state',
    tenantId || 'anonymous',
    resource,
    params ?? null,
  ],
}))

import { useTenantQuery } from './useTenantQuery'

interface CapturedQueryOptions {
  queryKey: { value: unknown }
  enabled: { value: boolean }
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>
}

function capturedOptions(): CapturedQueryOptions {
  const options = queryHarness.useQuery.mock.calls.at(-1)?.[0] as CapturedQueryOptions | undefined
  if (!options) throw new Error('查询选项未传入 useQuery')
  return options
}

describe('租户查询封装', () => {
  beforeEach(() => {
    queryHarness.useQuery.mockReset()
  })

  it('使用调用方传入的响应式租户标识和鉴权状态', () => {
    const tenantId = ref('tenant-a')
    const isAuthenticated = ref(true)

    useTenantQuery(
      tenantId,
      isAuthenticated,
      'notices',
      () => ({ page: 1 }),
      async () => ({ rows: [] as string[] }),
    )

    const options = capturedOptions()
    expect(options.queryKey.value).toEqual(['server-state', 'tenant-a', 'notices', { page: 1 }])
    expect(options.enabled.value).toBe(true)

    tenantId.value = 'tenant-b'
    isAuthenticated.value = false

    expect(options.queryKey.value).toEqual(['server-state', 'tenant-b', 'notices', { page: 1 }])
    expect(options.enabled.value).toBe(false)
  })

  it('把 TanStack Query 的取消信号传给请求函数', async () => {
    const request = vi.fn(async (_signal: AbortSignal) => 'ok')
    useTenantQuery('tenant-a', true, 'roles', () => ({ limit: 50 }), request)

    const controller = new AbortController()
    await capturedOptions().queryFn({ signal: controller.signal })

    expect(request).toHaveBeenCalledWith(controller.signal)
  })
})
