import { effectScope, nextTick, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShellServerSettings } from '@/stores/settings'
import type { ServerStateScope } from '@/shared/query/scope'

interface ScopedSettings {
  scope: ServerStateScope
  settings: ShellServerSettings
}

type SettingsFetcher = (signal: AbortSignal) => Promise<ScopedSettings>

interface QueryHarness {
  data?: Ref<ScopedSettings | undefined>
  enabled?: () => boolean
  fetcher?: SettingsFetcher
  params?: () => { scope: string }
  resource?: string
}

const queryHarness = vi.hoisted((): QueryHarness => ({}))
const dependencies = vi.hoisted(() => ({
  applyServerSettings: vi.fn(),
  getServerStateScope: vi.fn(),
  isServerStateScopeCurrent: vi.fn(),
  getConfigByKey: vi.fn(),
  refetchQueries: vi.fn(),
  serverStateQueryKey: vi.fn(),
}))

vi.mock('@/api/modules/config', () => ({ getConfigByKey: dependencies.getConfigByKey }))
vi.mock('@/app/settings/coordinator', () => ({
  applyServerSettings: dependencies.applyServerSettings,
}))
vi.mock('@/shared/query/client', () => ({
  getServerStateScope: dependencies.getServerStateScope,
  isServerStateScopeCurrent: dependencies.isServerStateScopeCurrent,
  queryClient: { refetchQueries: dependencies.refetchQueries },
  serverStateQueryKey: dependencies.serverStateQueryKey,
}))
vi.mock('@/shared/query/useServerStateQuery', async () => {
  const { shallowRef } = await import('vue')
  return {
    useServerStateQuery: (
      enabled: () => boolean,
      resource: string,
      params: () => { scope: string },
      fetcher: SettingsFetcher,
    ) => {
      const data = shallowRef<ScopedSettings>()
      Object.assign(queryHarness, { data, enabled, fetcher, params, resource })
      return { data }
    },
  }
})
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ sessionStatus: 'authenticated' }),
}))

import { refreshShellSettings, useShellSettingsQuery } from '@/app/settings/shellSettingsQuery'

describe('Shell 设置查询', () => {
  beforeEach(() => {
    for (const key of Object.keys(queryHarness) as Array<keyof QueryHarness>) {
      delete queryHarness[key]
    }
    dependencies.getServerStateScope.mockReturnValue(undefined)
    dependencies.isServerStateScopeCurrent.mockReturnValue(true)
    dependencies.getConfigByKey.mockResolvedValue({ data: undefined })
    dependencies.refetchQueries.mockResolvedValue(undefined)
    dependencies.serverStateQueryKey.mockReturnValue(['server-state', 'settings'])
  })

  it('使用会话范围加载服务端设置并交给协调器', async () => {
    const activeScope = { sessionEpoch: 7, subjectId: 'user-a', tenantId: 'tenant-a' }
    dependencies.getServerStateScope.mockReturnValue(activeScope)
    dependencies.getConfigByKey.mockImplementation((key: string) =>
      Promise.resolve({ data: key === 'sys.index.sideTheme' ? 'theme-dark' : 'skin-blue' }),
    )
    const scope = effectScope()
    scope.run(() => useShellSettingsQuery())

    expect(queryHarness.enabled?.()).toBe(true)
    expect(queryHarness.resource).toBe('configs')
    expect(queryHarness.params?.()).toEqual({ scope: 'shell-theme' })
    const fetcher = queryHarness.fetcher
    if (!fetcher) throw new Error('测试未捕获 Shell 设置查询函数')
    const result = await fetcher(new AbortController().signal)
    expect(result).toEqual({
      scope: activeScope,
      settings: { sideTheme: 'theme-dark', skinName: 'skin-blue' },
    })

    if (!queryHarness.data) throw new Error('测试未捕获 Shell 设置查询数据')
    queryHarness.data.value = result
    await nextTick()
    expect(dependencies.applyServerSettings).toHaveBeenCalledWith(result.settings)
    scope.stop()
  })

  it('只在存在当前会话范围时刷新活动查询', async () => {
    await refreshShellSettings()
    expect(dependencies.refetchQueries).not.toHaveBeenCalled()

    const activeScope = { sessionEpoch: 7, subjectId: 'user-a', tenantId: 'tenant-a' }
    dependencies.getServerStateScope.mockReturnValue(activeScope)
    await refreshShellSettings()

    expect(dependencies.serverStateQueryKey).toHaveBeenCalledWith(activeScope, 'configs', {
      scope: 'shell-theme',
    })
    expect(dependencies.refetchQueries).toHaveBeenCalledWith(
      { queryKey: ['server-state', 'settings'], type: 'active' },
      { throwOnError: true },
    )
  })

  it('成功结果等待投影期间会话切换时不应用旧设置', async () => {
    const activeScope = { sessionEpoch: 7, subjectId: 'user-a', tenantId: 'tenant-a' }
    dependencies.getServerStateScope.mockReturnValue(activeScope)
    const scope = effectScope()
    scope.run(() => useShellSettingsQuery())
    const result = await queryHarness.fetcher!(new AbortController().signal)
    expect(result.settings).toEqual({ sideTheme: undefined, skinName: undefined })
    queryHarness.data!.value = result
    dependencies.isServerStateScopeCurrent.mockReturnValue(false)
    await nextTick()
    expect(dependencies.isServerStateScopeCurrent).toHaveBeenCalledWith(activeScope)
    expect(dependencies.applyServerSettings).not.toHaveBeenCalled()
    scope.stop()
  })

  it('无活动会话时请求取消且不访问 API', async () => {
    const scope = effectScope()
    scope.run(() => useShellSettingsQuery())
    await expect(queryHarness.fetcher!(new AbortController().signal)).rejects.toMatchObject({
      kind: 'cancelled',
    })
    expect(dependencies.getConfigByKey).not.toHaveBeenCalled()
    scope.stop()
  })
})
