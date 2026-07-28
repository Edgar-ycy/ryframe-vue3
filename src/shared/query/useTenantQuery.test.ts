import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryHarness = vi.hoisted(() => ({
  useQuery: vi.fn(),
}))

vi.mock('@tanstack/vue-query', () => ({
  QueryClient: class QueryClient {},
  useQuery: queryHarness.useQuery,
}))

import { useTenantQuery } from './useTenantQuery'

interface CapturedQueryOptions {
  queryKey: { value: unknown }
  enabled: { value: boolean }
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
})
