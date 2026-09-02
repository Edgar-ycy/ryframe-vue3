import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp, effectScope, ref, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createSchedule: vi.fn(),
  removeSchedule: vi.fn(),
  runSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  updateScheduleStatus: vi.fn(),
}))
const ui = vi.hoisted(() => ({ confirm: vi.fn(), success: vi.fn() }))

vi.mock('vue', async (importOriginal) => {
  const vue = await importOriginal<typeof import('vue')>()
  return { ...vue, onBeforeUnmount: vi.fn() }
})
vi.mock('@/api/modules/monitor', () => api)
vi.mock('@/utils/confirmAction', () => ({ confirmAction: ui.confirm }))
vi.mock('element-plus', () => ({ ElMessage: { success: ui.success } }))

import type { CreateScheduleBody, JobScheduleRecord } from '@/api/modules/monitor'
import {
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useSchedulePageActions } from '@/views/monitor/schedules/useSchedulePageActions'

function deferred<T>() {
  let reject!: (reason?: unknown) => void
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept, rejectPromise) => {
    resolve = accept
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function activate(subjectId: string, fingerprint: string): ServerStateScope {
  transitionServerStateScope(
    { tenantId: 'tenant-a', subjectId, authorizationFingerprint: fingerprint },
    () => undefined,
    { force: true },
  )
  const scope = getServerStateScope()
  if (!scope) throw new Error('测试会话范围未建立')
  return {
    tenantId: scope.tenantId,
    subjectId: scope.subjectId,
    sessionEpoch: scope.sessionEpoch,
  }
}

function schedule(): JobScheduleRecord {
  return {
    concurrency_policy: 'forbid',
    created_at: '2026-08-29T00:00:00.000Z',
    cron_expression: '0 * * * *',
    enabled: true,
    handler_key: 'system.cleanup',
    id: 'schedule-a',
    max_runtime_seconds: 60,
    misfire_policy: 'skip',
    name: '旧会话任务',
    timezone: 'Asia/Shanghai',
    updated_at: '2026-08-29T00:00:00.000Z',
    version: 1,
  }
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

function createHarness() {
  const pageActive = ref(true)
  const pageGeneration = ref(0)
  const composable = runComposable(() =>
    useSchedulePageActions({
      editingSchedule: ref<JobScheduleRecord>(),
      formVisible: ref(true),
      pageActive,
      pageGeneration,
      refetchSchedules: vi.fn(async () => undefined),
      t: (key) => key,
    }),
  )
  return { ...composable, pageActive, pageGeneration }
}

describe('定时任务页面操作范围', () => {
  const scopes: EffectScope[] = []

  beforeEach(() => {
    queryClient.clear()
    deactivateServerStateScope()
    vi.clearAllMocks()
    for (const mock of Object.values(api)) mock.mockResolvedValue({ data: undefined })
    activate('user-a', 'authorization-a')
  })

  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop()
    queryClient.clear()
    deactivateServerStateScope()
  })

  it('同租户 A→B 期间确认状态变更时零 HTTP、零 toast', async () => {
    const confirmation = deferred<boolean>()
    ui.confirm.mockReturnValueOnce(confirmation.promise)
    const harness = createHarness()
    scopes.push(harness.scope)

    const pending = harness.result.handleStatus(schedule(), false)
    activate('user-b', 'authorization-b')
    confirmation.resolve(true)
    await pending

    expect(api.updateScheduleStatus).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalled()
  })

  it('同主体 epoch 变化期间确认立即运行时零 HTTP、零 toast', async () => {
    const confirmation = deferred<boolean>()
    ui.confirm.mockReturnValueOnce(confirmation.promise)
    const harness = createHarness()
    scopes.push(harness.scope)

    const pending = harness.result.handleRun(schedule())
    activate('user-a', 'authorization-b')
    confirmation.resolve(true)
    await pending

    expect(api.runSchedule).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalled()
  })

  it('KeepAlive 失活期间确认删除时零 HTTP、零 toast', async () => {
    const confirmation = deferred<boolean>()
    ui.confirm.mockReturnValueOnce(confirmation.promise)
    const harness = createHarness()
    scopes.push(harness.scope)

    const pending = harness.result.handleRemove(schedule())
    harness.pageActive.value = false
    confirmation.resolve(true)
    await pending

    expect(api.removeSchedule).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalled()
  })

  it('Mutation 已绑定新观察器时仍拒绝旧 scope 创建载荷', async () => {
    const oldScope = getServerStateScope()
    if (!oldScope) throw new Error('测试缺少旧会话范围')
    const harness = createHarness()
    scopes.push(harness.scope)
    activate('user-b', 'authorization-b')
    const data: CreateScheduleBody = {
      cron_expression: '0 * * * *',
      handler_key: 'system.cleanup',
      name: '旧会话任务',
      timezone: 'Asia/Shanghai',
    }

    await expect(
      harness.result.createMutation.mutateAsync({ data, scope: oldScope }),
    ).rejects.toMatchObject({ kind: 'cancelled' })
    expect(api.createSchedule).not.toHaveBeenCalled()
  })

  it('失活期间未知运行结果在重新激活后复用同一幂等键', async () => {
    const firstRun = deferred<unknown>()
    api.runSchedule.mockReturnValueOnce(firstRun.promise).mockResolvedValueOnce({ data: undefined })
    ui.confirm.mockResolvedValue(true)
    const harness = createHarness()
    scopes.push(harness.scope)

    const first = harness.result.handleRun(schedule())
    await vi.waitFor(() => expect(api.runSchedule).toHaveBeenCalledTimes(1))
    harness.pageActive.value = false
    firstRun.reject(new Error('unknown result'))
    await expect(first).rejects.toMatchObject({ kind: 'cancelled' })

    harness.pageActive.value = true
    await harness.result.handleRun(schedule())

    expect(api.runSchedule).toHaveBeenCalledTimes(2)
    expect(api.runSchedule.mock.calls[1]?.[1]).toBe(api.runSchedule.mock.calls[0]?.[1])
  })
})
