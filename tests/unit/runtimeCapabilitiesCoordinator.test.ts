import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getApiVersion: vi.fn() }))

vi.mock('@/api/modules/version', () => api)

import { ensureRuntimeCapabilitiesLoaded } from '@/app/runtime-capabilities/coordinator'
import { useRuntimeCapabilitiesStore } from '@/stores/runtimeCapabilities'
import { DEFAULT_TENANT_ID, getTenantId, setTenantId } from '@/utils/auth'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, resolve, reject }
}

describe('运行能力协调器', () => {
  const values = new Map<string, string>()
  const setItem = vi.fn((key: string, value: string) => values.set(key, value))

  beforeEach(() => {
    setActivePinia(createPinia())
    values.clear()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem,
      },
    })
    setTenantId('tenant-old')
    setItem.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('并发调用共享一次 API 请求及加载结果，加载成功后不重复探测', async () => {
    const response = deferred<{ data: { multi_tenancy_enabled: boolean } }>()
    api.getApiVersion.mockReturnValue(response.promise)

    const first = ensureRuntimeCapabilitiesLoaded()
    const second = ensureRuntimeCapabilitiesLoaded()
    expect(api.getApiVersion).toHaveBeenCalledOnce()
    expect(useRuntimeCapabilitiesStore().loaded).toBe(false)

    response.resolve({ data: { multi_tenancy_enabled: true } })
    await Promise.all([first, second])

    expect(useRuntimeCapabilitiesStore().$state).toEqual({
      loaded: true,
      multiTenancyEnabled: true,
    })
    await ensureRuntimeCapabilitiesLoaded()
    expect(api.getApiVersion).toHaveBeenCalledOnce()
  })

  it('请求失败后释放 pending，保留租户选择并允许重试', async () => {
    const response = deferred<{ data: { multi_tenancy_enabled: boolean } }>()
    const failure = new Error('网络不可用')
    api.getApiVersion.mockReturnValueOnce(response.promise)

    const first = ensureRuntimeCapabilitiesLoaded()
    const second = ensureRuntimeCapabilitiesLoaded()
    const settled = Promise.allSettled([first, second])
    response.reject(failure)
    expect(await settled).toEqual([
      { status: 'rejected', reason: failure },
      { status: 'rejected', reason: failure },
    ])

    expect(useRuntimeCapabilitiesStore().$state).toEqual({
      loaded: false,
      multiTenancyEnabled: false,
    })
    expect(getTenantId()).toBe('tenant-old')
    expect(setItem).not.toHaveBeenCalled()

    api.getApiVersion.mockResolvedValueOnce({ data: { multi_tenancy_enabled: true } })
    const retry = ensureRuntimeCapabilitiesLoaded()
    await retry
    expect(api.getApiVersion).toHaveBeenCalledTimes(2)
    expect(useRuntimeCapabilitiesStore().loaded).toBe(true)
  })

  it('缺少 multi_tenancy_enabled 时拒绝响应，不发布能力且允许重试', async () => {
    api.getApiVersion.mockResolvedValueOnce({ data: {} })

    await expect(ensureRuntimeCapabilitiesLoaded()).rejects.toThrow(
      '服务端版本响应缺少 multi_tenancy_enabled',
    )

    expect(useRuntimeCapabilitiesStore().$state).toEqual({
      loaded: false,
      multiTenancyEnabled: false,
    })
    expect(getTenantId()).toBe('tenant-old')
    expect(setItem).not.toHaveBeenCalled()

    api.getApiVersion.mockResolvedValueOnce({ data: { multi_tenancy_enabled: false } })
    await ensureRuntimeCapabilitiesLoaded()
    expect(api.getApiVersion).toHaveBeenCalledTimes(2)
    expect(useRuntimeCapabilitiesStore().$state).toEqual({
      loaded: true,
      multiTenancyEnabled: false,
    })
    expect(getTenantId()).toBe(DEFAULT_TENANT_ID)
  })

  it('仅在单租户探测成功后将旧租户清理为默认租户', async () => {
    const response = deferred<{ data: { multi_tenancy_enabled: boolean } }>()
    api.getApiVersion.mockReturnValueOnce(response.promise)

    const pending = ensureRuntimeCapabilitiesLoaded()
    expect(getTenantId()).toBe('tenant-old')
    expect(setItem).not.toHaveBeenCalled()

    response.resolve({ data: { multi_tenancy_enabled: false } })
    await pending

    expect(useRuntimeCapabilitiesStore().$state).toEqual({
      loaded: true,
      multiTenancyEnabled: false,
    })
    expect(getTenantId()).toBe(DEFAULT_TENANT_ID)
    expect(setItem).toHaveBeenCalledOnce()
    expect(setItem.mock.calls[0]?.[1]).toBe(DEFAULT_TENANT_ID)
  })

  it('多租户探测成功后保留原有租户选择且不写入存储', async () => {
    api.getApiVersion.mockResolvedValueOnce({ data: { multi_tenancy_enabled: true } })

    await ensureRuntimeCapabilitiesLoaded()

    expect(useRuntimeCapabilitiesStore().$state).toEqual({
      loaded: true,
      multiTenancyEnabled: true,
    })
    expect(getTenantId()).toBe('tenant-old')
    expect(setItem).not.toHaveBeenCalled()
  })
})
