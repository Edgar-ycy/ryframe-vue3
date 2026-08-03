import { effectScope, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SelectOption, SelectOptionList } from '@/api/modules/option'

const mocks = vi.hoisted(() => ({
  listRoleOptions: vi.fn(),
  queryData: { value: undefined as SelectOptionList | undefined },
  queryFetching: { value: false },
  tenantQueryArgs: [] as unknown[],
  userStore: {
    tenantId: 'tenant-a',
    sessionStatus: 'authenticated',
  },
}))

vi.mock('@/api/modules/role', () => ({
  listRoleOptions: mocks.listRoleOptions,
}))

vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.tenantQueryArgs = args
    return {
      data: mocks.queryData,
      isFetching: mocks.queryFetching,
    }
  },
}))

vi.mock('@/stores/user', () => ({
  useUserStore: () => mocks.userStore,
}))

import { useRoleOptions } from './useRoleOptions'

function option(value: string, label: string): SelectOption {
  return { value, label, disabled: false }
}

describe('角色远程候选项', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.queryData.value = { items: [], has_more: false }
    mocks.queryFetching.value = false
    mocks.tenantQueryArgs = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('使用包含 q 和 limit 的租户查询键，并在 275 毫秒后更新前缀', () => {
    const scope = effectScope()
    const result = scope.run(() => useRoleOptions(true))
    expect(result).toBeDefined()

    const tenantId = mocks.tenantQueryArgs[0] as () => string
    const enabled = mocks.tenantQueryArgs[1] as () => boolean
    const params = mocks.tenantQueryArgs[3] as () => unknown
    expect(tenantId()).toBe('tenant-a')
    expect(enabled()).toBe(true)
    expect(mocks.tenantQueryArgs[2]).toBe('role-options')
    expect(params()).toEqual({ q: undefined, limit: 50 })

    result?.remoteMethod('  adm  ')
    vi.advanceTimersByTime(274)
    expect(params()).toEqual({ q: undefined, limit: 50 })
    vi.advanceTimersByTime(1)
    expect(params()).toEqual({ q: 'adm', limit: 50 })
    scope.stop()
  })

  it('把取消信号传给 Axios 请求，并返回服务端候选结果', async () => {
    const scope = effectScope()
    scope.run(() => useRoleOptions(true))
    const params = mocks.tenantQueryArgs[3] as () => { q?: string, limit: number }
    const queryFn = mocks.tenantQueryArgs[4] as (signal: AbortSignal) => Promise<SelectOptionList>
    const controller = new AbortController()
    const payload = { items: [option('1', '管理员')], has_more: true }
    mocks.listRoleOptions.mockResolvedValue({ data: payload })

    await expect(queryFn(controller.signal)).resolves.toEqual(payload)
    expect(mocks.listRoleOptions).toHaveBeenCalledWith(params(), controller.signal)
    scope.stop()
  })

  it('合并已选角色并保持服务端稳定顺序', () => {
    const selected = ref([option('3', '已选角色'), option('2', '重复角色')])
    mocks.queryData.value = {
      items: [option('1', '远程角色'), option('2', '远程重复角色')],
      has_more: false,
    }
    const scope = effectScope()
    const result = scope.run(() => useRoleOptions(true, selected))

    expect(result?.options.value.map(item => item.value)).toEqual(['1', '2', '3'])
    expect(result?.options.value[1]?.label).toBe('远程重复角色')
    scope.stop()
  })
})
