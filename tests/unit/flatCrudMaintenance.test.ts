import { createPinia, setActivePinia } from 'pinia'
import { nextTick, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue')>()),
  onActivated: vi.fn(),
  onDeactivated: vi.fn(),
}))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))

import { useFlatCrudResource } from '@/components/business/flat-crud/useFlatCrudResource'
import { useTenantContextStore } from '@/stores/tenantContext'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import {
  configureServerStateErrorReporter,
  deactivateServerStateScope,
  queryClient,
} from '@/shared/query/client'
import {
  activate,
  deferred,
  resource,
  runComposable,
  type RecordValue,
} from './flatCrudScopeFixtures'

describe('租户数据生成页面的维护读取资格', () => {
  const scopes: EffectScope[] = []
  const reporter = vi.fn()
  function transition(state: 'active' | 'maintenance' | 'provisioning' | 'failed', epoch: string) {
    useTenantContextStore().$patch({ status: 'loaded', businessData: { state } })
    activate('user-a', epoch)
  }
  function mount(storage?: 'tenant_data' | 'control_row') {
    const current = resource('orders')
    current.definition.storage = storage
    const composable = runComposable(() =>
      useFlatCrudResource(current.definition, current.readPermission),
    )
    scopes.push(composable.scope)
    return { ...current, page: composable.result }
  }
  beforeEach(() => {
    setActivePinia(createPinia())
    queryClient.clear()
    deactivateServerStateScope()
    reporter.mockClear()
    configureServerStateErrorReporter(reporter)
    transition('active', 'initial')
  })
  afterEach(() => {
    while (scopes.length) scopes.pop()!.stop()
    deactivateServerStateScope()
    queryClient.clear()
    configureServerStateErrorReporter(undefined)
  })

  it.each(['maintenance', 'provisioning', 'failed'] as const)(
    '%s 阻止新范围自动和手动读取，active 后原组合实例恢复',
    async (state) => {
      const { page, adapter } = mount('tenant_data')
      await vi.waitFor(() => expect(adapter.list).toHaveBeenCalledOnce())
      await page.edit({ id: '1', name: '原行' })
      expect(adapter.detail).toHaveBeenCalledOnce()
      transition(state, 'blocked')
      await nextTick()
      expect(page.listQuery.data.value).toBeUndefined()
      await expect(page.search()).rejects.toMatchObject({ kind: 'cancelled' })
      await expect(page.edit({ id: '1', name: '原行' })).rejects.toMatchObject({
        kind: 'cancelled',
      })
      await expect(page.listQuery.refetch({ throwOnError: true })).rejects.toMatchObject({
        kind: 'cancelled',
      })
      page.setQuery({ page: 1, page_size: 20 })
      await page.search()
      await nextTick()
      expect(adapter.list).toHaveBeenCalledOnce()
      expect(adapter.detail).toHaveBeenCalledOnce()
      transition('active', 'restored')
      await vi.waitFor(() => expect(adapter.list).toHaveBeenCalledTimes(2))
      await page.edit({ id: '1', name: '原行' })
      expect(adapter.detail).toHaveBeenCalledTimes(2)
      expect(page.dialogVisible.value).toBe(true)
      expect(reporter).not.toHaveBeenCalled()
    },
  )

  it('维护切换取消旧 list/detail，迟到结果不回填页面', async () => {
    const current = resource('orders')
    current.definition.storage = 'tenant_data'
    const list = deferred<PageResponse<RecordValue>>()
    const detail = deferred<RecordValue>()
    current.adapter.list.mockImplementationOnce(() => list.promise)
    current.adapter.detail.mockImplementationOnce(() => detail.promise)
    const { scope, result: page } = runComposable(() =>
      useFlatCrudResource(current.definition, current.readPermission),
    )
    scopes.push(scope)
    await vi.waitFor(() => expect(current.adapter.list).toHaveBeenCalledOnce())
    const editing = page.edit({ id: 'old', name: '旧行' })
    const rejected = expect(editing).rejects.toMatchObject({ kind: 'cancelled' })
    await vi.waitFor(() => expect(current.adapter.detail).toHaveBeenCalledOnce())
    transition('maintenance', 'cancel-old')
    await rejected
    list.resolve({
      ...emptyPageResponse<RecordValue>({ page: 1, page_size: 10 }),
      items: [{ id: 'old', name: '旧行' }],
      total: 1,
      total_pages: 1,
    })
    detail.resolve({ id: 'old', name: '迟到详情' })
    await nextTick()
    expect(page.listQuery.data.value).toBeUndefined()
    expect(page.dialogVisible.value).toBe(false)
    expect(page.form.value).toEqual({ name: '' })
    expect(reporter).not.toHaveBeenCalled()
  })

  it.each([undefined, 'control_row'] as const)(
    '%s 控制库页面在同一维护状态仍可读取',
    async (storage) => {
      const { page, adapter } = mount(storage)
      await vi.waitFor(() => expect(adapter.list).toHaveBeenCalledOnce())
      transition('maintenance', 'control-maintenance')
      await vi.waitFor(() => expect(adapter.list).toHaveBeenCalledTimes(2))
      await page.search()
      await page.edit({ id: '1', name: '控制行' })
      expect(adapter.list).toHaveBeenCalledTimes(3)
      expect(adapter.detail).toHaveBeenCalledOnce()
      expect(reporter).not.toHaveBeenCalled()
    },
  )
})
