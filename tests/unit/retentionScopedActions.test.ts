import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp, effectScope, ref, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ previewDataRetention: vi.fn(), runDataRetention: vi.fn() }))
const ui = vi.hoisted(() => ({ confirm: vi.fn(), success: vi.fn() }))

vi.mock('vue', async (importOriginal) => {
  const vue = await importOriginal<typeof import('vue')>()
  return { ...vue, onBeforeUnmount: vi.fn(), onDeactivated: vi.fn() }
})
vi.mock('@/api/modules/monitor', () => api)
vi.mock('@/utils/confirmAction', () => ({ confirmAction: ui.confirm }))
vi.mock('element-plus', () => ({ ElMessage: { success: ui.success } }))

import {
  deactivateServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useRetentionPageActions } from '@/views/monitor/retention/useRetentionPageActions'

function deferred<T>() {
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((_resolve, rejectPromise) => {
    reject = rejectPromise
  })
  return { promise, reject }
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

describe('数据留存运行操作范围', () => {
  const scopes: EffectScope[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    deactivateServerStateScope()
    transitionServerStateScope(
      { tenantId: 'tenant-a', subjectId: 'user-a', authorizationFingerprint: 'auth-a' },
      () => undefined,
      { force: true },
    )
    ui.confirm.mockResolvedValue(true)
  })

  afterEach(() => {
    scopes.splice(0).forEach((scope) => scope.stop())
    queryClient.clear()
    deactivateServerStateScope()
  })

  it('失活期间未知运行结果在重新激活后复用同一幂等键', async () => {
    const firstRun = deferred<unknown>()
    api.runDataRetention
      .mockReturnValueOnce(firstRun.promise)
      .mockResolvedValueOnce({ data: undefined })
    const pageActive = ref(true)
    const refreshRuns = vi.fn(async () => undefined)
    const harness = runComposable(() =>
      useRetentionPageActions((key) => key, pageActive, refreshRuns),
    )
    scopes.push(harness.scope)

    const first = harness.result.handleRun()
    await vi.waitFor(() => expect(api.runDataRetention).toHaveBeenCalledTimes(1))
    pageActive.value = false
    firstRun.reject(new Error('unknown result'))
    await expect(first).rejects.toMatchObject({ kind: 'cancelled' })

    pageActive.value = true
    await harness.result.handleRun()

    expect(api.runDataRetention).toHaveBeenCalledTimes(2)
    expect(api.runDataRetention.mock.calls[1]?.[0]).toBe(api.runDataRetention.mock.calls[0]?.[0])
    expect(ui.success).toHaveBeenCalledTimes(1)
  })
})
