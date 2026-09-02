import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted(() => ({
  activated: [] as Array<() => void>,
  deactivated: [] as Array<() => void>,
}))
const diagnosticApi = vi.hoisted(() => ({ getAuthorizationDiagnostic: vi.fn() }))
const userApi = vi.hoisted(() => ({ listUserOptions: vi.fn() }))

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onActivated: (callback: () => void) => lifecycle.activated.push(callback),
    onDeactivated: (callback: () => void) => lifecycle.deactivated.push(callback),
  }
})
vi.mock('@/api/modules/authorizationDiagnostic', () => diagnosticApi)
vi.mock('@/api/modules/user', () => userApi)

import { useLogPageScope } from '@/views/monitor/useLogPageScope'
import { useDataTargetPageScope } from '@/views/platform/data-targets/useDataTargetPageScope'
import {
  deactivateServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { useAuthorizationDiagnostics } from '@/views/system/authorization-diagnostics/useAuthorizationDiagnostics'

function activate(subjectId: string, fingerprint: string): void {
  transitionServerStateScope(
    { tenantId: 'tenant-a', subjectId, authorizationFingerprint: fingerprint },
    () =>
      useUserStore().$patch({
        sessionStatus: 'authenticated',
        tenantId: 'tenant-a',
        userId: subjectId,
      }),
    { force: true },
  )
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

describe('日志与选择型页面的完整范围', () => {
  const scopes: EffectScope[] = []

  beforeEach(() => {
    setActivePinia(createPinia())
    queryClient.clear()
    deactivateServerStateScope()
    lifecycle.activated.length = 0
    lifecycle.deactivated.length = 0
    diagnosticApi.getAuthorizationDiagnostic.mockResolvedValue({ data: {} })
    userApi.listUserOptions.mockResolvedValue({ data: { has_more: false, items: [] } })
    activate('user-a', 'authorization-a')
  })

  afterEach(() => {
    vi.useRealTimers()
    while (scopes.length) scopes.pop()?.stop()
    queryClient.clear()
    deactivateServerStateScope()
  })

  it.each([
    ['同租户 A→B', 'user-b', 'authorization-b'],
    ['同主体 epoch 变化', 'user-a', 'authorization-b'],
  ])('日志页在%s时清空详情和导出快照 ownership', (_name, subjectId, fingerprint) => {
    const clearSuccessfulQuery = vi.fn()
    const composable = runComposable(() =>
      useLogPageScope<{ id: string; message: string }>(clearSuccessfulQuery),
    )
    scopes.push(composable.scope)
    composable.result.showDetail({ id: 'old-log', message: '旧主体日志' })
    const ownsOperation = composable.result.captureOwnership()
    const resetCount = clearSuccessfulQuery.mock.calls.length

    activate(subjectId, fingerprint)

    expect(clearSuccessfulQuery.mock.calls.length).toBeGreaterThan(resetCount)
    expect(composable.result.detailVisible.value).toBe(false)
    expect(composable.result.detailRow.value).toEqual({})
    expect(ownsOperation()).toBe(false)
  })

  it('数据目标在 scope 和 KeepAlive 失效时清选择、详情与延迟搜索', () => {
    vi.useFakeTimers()
    const applySearch = vi.fn()
    const composable = runComposable(useDataTargetPageScope)
    scopes.push(composable.scope)
    composable.result.openTargetDetail('old-target')
    composable.result.scheduleSearch(' old keyword ', applySearch)

    activate('user-b', 'authorization-b')
    vi.advanceTimersByTime(350)

    expect(composable.result.selectedTargetKey.value).toBe('')
    expect(composable.result.detailVisible.value).toBe(false)
    expect(applySearch).not.toHaveBeenCalled()

    composable.result.openTargetDetail('second-target')
    composable.result.scheduleSearch('second', applySearch)
    for (const deactivate of lifecycle.deactivated) deactivate()
    vi.advanceTimersByTime(350)

    expect(composable.result.pageActive.value).toBe(false)
    expect(composable.result.selectedTargetKey.value).toBe('')
    expect(composable.result.detailVisible.value).toBe(false)
    expect(applySearch).not.toHaveBeenCalled()
  })

  it('授权诊断在 epoch 和 KeepAlive 失效时清旧 userId 与搜索定时器', () => {
    vi.useFakeTimers()
    const composable = runComposable(() => useAuthorizationDiagnostics((key) => key))
    scopes.push(composable.scope)
    composable.result.selectedUserId.value = 'old-user-id'
    composable.result.permissionSearch.value = 'old-permission'
    composable.result.searchUsers('delayed-old-user')

    activate('user-a', 'authorization-b')
    vi.advanceTimersByTime(350)

    expect(composable.result.selectedUserId.value).toBe('')
    expect(composable.result.permissionSearch.value).toBe('')
    expect(composable.result.userSearch.value).toBe('')

    composable.result.selectedUserId.value = 'second-old-user'
    composable.result.searchUsers('second-delayed')
    for (const deactivate of lifecycle.deactivated) deactivate()
    vi.advanceTimersByTime(350)

    expect(composable.result.selectedUserId.value).toBe('')
    expect(composable.result.userSearch.value).toBe('')
    expect(composable.result.diagnosticQuery.isEnabled.value).toBe(false)
  })
})
