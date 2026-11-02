import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, effectScope, nextTick, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const channel = vi.hoisted(() => ({ publishExportJobEvent: vi.fn() }))
const message = vi.hoisted(() => vi.fn())

vi.mock('@/app/exports/exportJobChannel', () => channel)
vi.mock('element-plus', () => ({ ElMessage: message }))

import type { ExportJob } from '@/api/modules/exportJob'
import { exportJobListQueryKey } from '@/app/exports/exportJobCache'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'
import { HttpError } from '@/shared/http/client'
import type { ApiResponse } from '@/shared/http/types'
import {
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function response<T>(data: T): ApiResponse<T> {
  return { code: 200, message: 'ok', request_id: 'request-1', data }
}

function exportJob(id: string): ExportJob {
  return {
    id,
    resource: 'users',
    status: 'pending',
    created_at: '2026-08-20T00:00:00.000Z',
    matched_rows: 0,
    snapshot_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-20T00:00:00.000Z',
  }
}

function activate(fingerprint: string) {
  transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId: 'user-a',
      authorizationFingerprint: fingerprint,
    },
    () => undefined,
    { force: true },
  )
  const scope = getServerStateScope()
  if (!scope) throw new Error('测试会话范围未激活')
  return scope
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

describe('导出创建请求会话范围', () => {
  let scopes: EffectScope[]

  beforeEach(() => {
    scopes = []
    setActivePinia(createPinia())
    useUserStore().$patch({
      sessionStatus: 'authenticated',
      tenantId: 'tenant-a',
      userId: 'user-a',
    })
    deactivateServerStateScope()
    queryClient.clear()
    message.mockClear()
    channel.publishExportJobEvent.mockClear()
  })

  afterEach(() => {
    for (const scope of scopes) scope.stop()
    queryClient.clear()
    deactivateServerStateScope()
  })

  it.each([
    ['network', new HttpError('网络结果未知', { kind: 'network' })],
    ['HTTP 500', new HttpError('服务端结果未知', { kind: 'http', status: 500 })],
  ])('%s 创建结果未知时复用原键，成功结算后相同意图使用新键', async (_name, failure) => {
    const scope = activate('authorization-retry')
    const create = vi
      .fn<(key: string, signal: AbortSignal) => Promise<ApiResponse<ExportJob>>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(response(exportJob('job-recovered')))
      .mockResolvedValueOnce(response(exportJob('job-next')))
    const composable = runComposable(() => useExportJobRequest())
    scopes.push(composable.scope)

    await expect(composable.result.submitExport(scope, 'same-intent', create)).rejects.toBe(failure)
    expect(create).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(exportJobListQueryKey(scope))).toBeUndefined()
    expect(channel.publishExportJobEvent).not.toHaveBeenCalled()
    expect(message).not.toHaveBeenCalled()
    const originalKey = create.mock.calls[0]![0]
    expect(originalKey).toMatch(/\S/u)

    await expect(composable.result.submitExport(scope, 'same-intent', create)).resolves.toEqual(
      exportJob('job-recovered'),
    )
    expect(create.mock.calls.map(([key]) => key)).toEqual([originalKey, originalKey])

    await expect(composable.result.submitExport(scope, 'same-intent', create)).resolves.toEqual(
      exportJob('job-next'),
    )
    expect(create).toHaveBeenCalledTimes(3)
    expect(create.mock.calls[2]![0]).toMatch(/\S/u)
    expect(create.mock.calls[2]![0]).not.toBe(originalKey)
  })

  it('同主体 epoch 变化后不复用旧 Promise，旧成功响应不产生任何副作用', async () => {
    const oldScope = activate('authorization-a')
    const oldRequest = deferred<ApiResponse<ExportJob>>()
    const newRequest = deferred<ApiResponse<ExportJob>>()
    const createOld = vi.fn(() => oldRequest.promise)
    const createNew = vi.fn(() => newRequest.promise)
    const composable = runComposable(() => useExportJobRequest())
    scopes.push(composable.scope)

    const oldPromise = composable.result.submitExport(oldScope, 'same-intent', createOld)
    const oldOutcome = oldPromise.then(
      (value) => value,
      (error: unknown) => error,
    )
    await vi.waitFor(() => expect(createOld).toHaveBeenCalledOnce())
    const newScope = activate('authorization-b')
    await nextTick()
    const newPromise = composable.result.submitExport(newScope, 'same-intent', createNew)

    await vi.waitFor(() => expect(createNew).toHaveBeenCalledOnce())

    const freshJob = exportJob('job-new')
    newRequest.resolve(response(freshJob))
    await expect(newPromise).resolves.toEqual(freshJob)
    expect(queryClient.getQueryData(exportJobListQueryKey(newScope))).toEqual([freshJob])
    expect(channel.publishExportJobEvent).toHaveBeenCalledWith({
      type: 'created',
      tenantId: newScope.tenantId,
      subjectId: newScope.subjectId,
      sessionEpoch: newScope.sessionEpoch,
      jobId: freshJob.id,
    })
    expect(message).toHaveBeenCalledOnce()

    oldRequest.resolve(response(exportJob('job-old')))
    await expect(oldOutcome).resolves.toMatchObject({ kind: 'cancelled' })
    expect(queryClient.getQueryData(exportJobListQueryKey(oldScope))).toBeUndefined()
    expect(queryClient.getQueryData(exportJobListQueryKey(newScope))).toEqual([freshJob])
    expect(channel.publishExportJobEvent).toHaveBeenCalledOnce()
    expect(message).toHaveBeenCalledOnce()
  })

  it('拒绝以旧 scope 启动新请求且不产生缓存、事件或提示', async () => {
    const oldScope = activate('authorization-a')
    const create = vi.fn(async () => response(exportJob('job-old')))
    const composable = runComposable(() => useExportJobRequest())
    scopes.push(composable.scope)

    activate('authorization-b')

    expect(() => composable.result.submitExport(oldScope, 'old-intent', create)).toThrowError(
      expect.objectContaining({ kind: 'cancelled' }),
    )
    expect(create).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(exportJobListQueryKey(oldScope))).toBeUndefined()
    expect(channel.publishExportJobEvent).not.toHaveBeenCalled()
    expect(message).not.toHaveBeenCalled()
  })
})
