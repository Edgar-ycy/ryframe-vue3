import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  applyServerSettings: vi.fn(),
  getConfigByKey: vi.fn(),
  queryCalls: [] as unknown[][],
  refetch: vi.fn(),
}))

vi.mock('@/api/modules/config', () => ({ getConfigByKey: mocks.getConfigByKey }))
vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ applyServerSettings: mocks.applyServerSettings }),
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ tenantId: 'tenant-a', sessionStatus: 'authenticated' }),
}))
vi.mock('@/shared/query/useTenantQuery', () => ({
  useTenantQuery: (...args: unknown[]) => {
    mocks.queryCalls.push(args)
    return {
      data: { value: undefined },
      isFetching: { value: false },
      refetch: mocks.refetch,
    }
  },
}))

import { useShellSettingsQuery } from './shellSettingsQuery'

describe('外壳设置 Query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryCalls.length = 0
    mocks.getConfigByKey
      .mockResolvedValueOnce({ data: 'theme-dark' })
      .mockResolvedValueOnce({ data: 'skin-blue' })
    mocks.refetch.mockResolvedValue({})
  })

  it('使用租户配置资源键并以同一 AbortSignal 读取两项设置', async () => {
    useShellSettingsQuery()
    const query = mocks.queryCalls[0]!
    const controller = new AbortController()

    expect((query[0] as () => string)()).toBe('tenant-a')
    expect((query[1] as () => boolean)()).toBe(true)
    expect(query[2]).toBe('configs')
    expect((query[3] as () => unknown)()).toEqual({ scope: 'shell-theme' })
    await expect(
      (query[4] as (signal: AbortSignal) => Promise<unknown>)(controller.signal),
    ).resolves.toEqual({ sideTheme: 'theme-dark', skinName: 'skin-blue' })

    expect(mocks.getConfigByKey).toHaveBeenNthCalledWith(
      1,
      'sys.index.sideTheme',
      controller.signal,
    )
    expect(mocks.getConfigByKey).toHaveBeenNthCalledWith(
      2,
      'sys.index.skinName',
      controller.signal,
    )
  })

  it('显式刷新时让 Query 错误继续向调用方传播', async () => {
    const error = new Error('settings failed')
    mocks.refetch.mockRejectedValueOnce(error)
    const settingsQuery = useShellSettingsQuery()

    await expect(settingsQuery.refresh()).rejects.toBe(error)
  })
})
