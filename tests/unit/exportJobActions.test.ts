import { createPinia, setActivePinia } from 'pinia'
import { effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  cancelExportJob: vi.fn(),
  deleteExportJobs: vi.fn(),
  downloadExportJob: vi.fn(),
  getExportJob: vi.fn(),
  getUnreadExportNotificationCount: vi.fn(),
  listExportJobs: vi.fn(),
}))
const idempotency = vi.hoisted(() => ({
  createIdempotencyKey: vi.fn(),
}))
const browser = vi.hoisted(() => ({ downloadBlobDirect: vi.fn() }))
const message = vi.hoisted(() => ({ success: vi.fn() }))

vi.mock('@/api/modules/exportJob', () => api)
vi.mock('@/shared/browser/download', () => browser)
vi.mock('@/shared/http/idempotency', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/http/idempotency')>()),
  createIdempotencyKey: idempotency.createIdempotencyKey,
}))
vi.mock('element-plus', () => ({ ElMessage: message }))

import type { ExportJob } from '@/api/modules/exportJob'
import { useExportJobActions } from '@/app/exports/export-jobs/actions'
import {
  exportJobDetailQueryKey,
  exportJobListQueryKey,
  exportJobUnreadQueryKey,
} from '@/app/exports/exportJobCache'
import { HttpError } from '@/shared/http/client'
import type { ApiResponse } from '@/shared/http/types'
import {
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useUserStore } from '@/stores/user'
const identity = { tenantId: 'tenant-a', userId: 'user-a' }

function response<T>(data: T): ApiResponse<T> {
  return { code: 200, message: 'ok', request_id: 'request-1', data }
}

function exportJob(id: string, status = 'succeeded'): ExportJob {
  return {
    id,
    resource: 'users',
    status,
    created_at: '2026-08-20T00:00:00.000Z',
    matched_rows: 0,
    snapshot_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-20T00:00:00.000Z',
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

let scopes: EffectScope[]
let serverScope: ServerStateScope

function createActions(): ReturnType<typeof useExportJobActions> {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useExportJobActions())!
}

beforeEach(() => {
  scopes = []
  setActivePinia(createPinia())
  useUserStore().$patch({
    sessionStatus: 'authenticated',
    tenantId: identity.tenantId,
    userId: identity.userId,
  })
  transitionServerStateScope(
    {
      tenantId: identity.tenantId,
      subjectId: identity.userId,
      authorizationFingerprint: 'export-actions-test',
    },
    () => undefined,
    { force: true },
  )
  serverScope = getServerStateScope()!
  queryClient.clear()
  browser.downloadBlobDirect.mockClear()
  message.success.mockClear()
  idempotency.createIdempotencyKey.mockReturnValue('delete-key-1')
  api.listExportJobs.mockResolvedValue(response([]))
  api.getUnreadExportNotificationCount.mockResolvedValue(response(0))
})

afterEach(() => {
  for (const scope of scopes) scope.stop()
  queryClient.clear()
  deactivateServerStateScope()
})

describe('导出记录删除动作', () => {
  it('排序去重后一次提交批量命令，受理后再清缓存并补回最近记录', async () => {
    const removed = [exportJob('job-1'), exportJob('job-3')]
    const backfilled = [exportJob('job-2'), exportJob('job-4')]
    queryClient.setQueryData(exportJobListQueryKey(serverScope), [
      removed[0],
      backfilled[0],
      removed[1],
    ])
    for (const job of removed) {
      queryClient.setQueryData(exportJobDetailQueryKey(serverScope, job.id), job)
    }
    queryClient.setQueryData(exportJobUnreadQueryKey(serverScope), 3)
    api.deleteExportJobs.mockResolvedValue(
      response({
        accepted_ids: ['job-1', 'job-3'],
        accepted_count: 2,
        removed_unread_count: 1,
      }),
    )
    api.listExportJobs.mockResolvedValue(response(backfilled))
    api.getUnreadExportNotificationCount.mockResolvedValue(response(1))

    const actions = createActions()
    const result = await actions.deleteJobs(['job-3', 'job-1', 'job-3'], serverScope)

    expect(api.deleteExportJobs).toHaveBeenCalledTimes(1)
    expect(api.deleteExportJobs).toHaveBeenCalledWith(
      ['job-1', 'job-3'],
      'delete-key-1',
      expect.any(AbortSignal),
    )
    expect(result.accepted_count).toBe(2)
    expect(queryClient.getQueryData(exportJobListQueryKey(serverScope))).toEqual(backfilled)
    expect(queryClient.getQueryData(exportJobDetailQueryKey(serverScope, 'job-1'))).toBeUndefined()
    expect(queryClient.getQueryData(exportJobDetailQueryKey(serverScope, 'job-3'))).toBeUndefined()
    expect(queryClient.getQueryData(exportJobUnreadQueryKey(serverScope))).toBe(1)
  })

  it('网络结果未知时保留记录，同一批次重试复用幂等键', async () => {
    const job = exportJob('job-1')
    queryClient.setQueryData(exportJobListQueryKey(serverScope), [job])
    api.deleteExportJobs
      .mockRejectedValueOnce(new HttpError('网络失败', { kind: 'network' }))
      .mockResolvedValueOnce(
        response({
          accepted_ids: [job.id],
          accepted_count: 1,
          removed_unread_count: 0,
        }),
      )

    const actions = createActions()
    await expect(actions.deleteJobs([job.id], serverScope)).rejects.toMatchObject({
      kind: 'network',
    })
    expect(queryClient.getQueryData(exportJobListQueryKey(serverScope))).toEqual([job])

    await actions.deleteJobs([job.id], serverScope)

    expect(api.deleteExportJobs.mock.calls.map((call) => call[1])).toEqual([
      'delete-key-1',
      'delete-key-1',
    ])
    expect(idempotency.createIdempotencyKey).toHaveBeenCalledTimes(1)
  })

  it('404 按已删除收敛并用强制刷新补回仍存在的合法任务', async () => {
    const deleted = exportJob('job-1')
    const retained = exportJob('job-2')
    queryClient.setQueryData(exportJobListQueryKey(serverScope), [deleted, retained])
    api.deleteExportJobs.mockRejectedValueOnce(new HttpError('不存在', { status: 404 }))
    api.listExportJobs.mockResolvedValueOnce(response([retained]))

    const actions = createActions()
    const accepted = await actions.deleteJobs([retained.id, deleted.id], serverScope)

    expect(accepted.accepted_ids).toEqual([deleted.id, retained.id])
    expect(queryClient.getQueryData(exportJobListQueryKey(serverScope))).toEqual([retained])
  })

  it('409 刷新服务端状态并保留记录', async () => {
    const actions = createActions()

    const running = exportJob('job-2', 'running')
    queryClient.setQueryData(exportJobListQueryKey(serverScope), [exportJob('job-2')])
    api.deleteExportJobs.mockRejectedValueOnce(new HttpError('状态冲突', { status: 409 }))
    api.listExportJobs.mockResolvedValueOnce(response([running]))

    await expect(actions.deleteJobs([running.id], serverScope)).rejects.toMatchObject({
      status: 409,
    })
    expect(queryClient.getQueryData(exportJobListQueryKey(serverScope))).toEqual([running])
  })

  it('删除执行期间禁止对同一任务下载或重复删除', async () => {
    const pending = deferred<
      ApiResponse<{
        accepted_ids: string[]
        accepted_count: number
        removed_unread_count: number
      }>
    >()
    api.deleteExportJobs.mockReturnValueOnce(pending.promise)
    const actions = createActions()
    const otherActions = createActions()

    const deleting = actions.deleteJobs(['job-1'], serverScope)
    expect(actions.deletingJobIds.value).toEqual(['job-1'])
    expect(actions.isJobActionBusy('job-1')).toBe(true)
    await expect(otherActions.downloadJob(exportJob('job-1'), serverScope)).rejects.toMatchObject({
      status: 409,
    })
    await expect(actions.deleteJobs(['job-2'], serverScope)).rejects.toMatchObject({ status: 409 })

    pending.resolve(
      response({
        accepted_ids: ['job-1'],
        accepted_count: 1,
        removed_unread_count: 0,
      }),
    )
    await deleting
    expect(actions.deletingJobIds.value).toEqual([])
  })

  it('同主体 epoch 变化会释放下载状态，旧响应不得覆盖新操作副作用', async () => {
    const staleDownload = deferred<Blob>()
    api.downloadExportJob
      .mockReturnValueOnce(staleDownload.promise)
      .mockResolvedValueOnce(new Blob(['fresh']))
    const actions = createActions()
    const job = exportJob('job-1')

    const stalePromise = actions.downloadJob(job, serverScope)
    const staleOutcome = stalePromise.then(
      () => undefined,
      (error: unknown) => error,
    )
    const staleSignal = api.downloadExportJob.mock.calls[0]?.[1] as AbortSignal
    expect(actions.downloadingJobId.value).toBe(job.id)

    transitionServerStateScope(
      {
        tenantId: identity.tenantId,
        subjectId: identity.userId,
        authorizationFingerprint: 'export-actions-next-epoch',
      },
      () => undefined,
      { force: true },
    )
    expect(getServerStateScope()?.sessionEpoch).toBeGreaterThan(serverScope.sessionEpoch)
    expect(staleSignal.aborted).toBe(true)
    expect(actions.downloadingJobId.value).toBeUndefined()
    const nextScope = getServerStateScope()!
    await actions.downloadJob(job, nextScope)
    expect(browser.downloadBlobDirect).toHaveBeenCalledOnce()
    expect(message.success).toHaveBeenCalledOnce()
    staleDownload.resolve(new Blob(['stale']))
    await expect(staleOutcome).resolves.toMatchObject({ kind: 'cancelled' })
    expect(browser.downloadBlobDirect).toHaveBeenCalledOnce()
    expect(message.success).toHaveBeenCalledOnce()
  })
  it('旧 scope 在确认框返回后不得借用新身份发出任务命令', async () => {
    const actions = createActions()
    transitionServerStateScope(
      {
        tenantId: identity.tenantId,
        subjectId: identity.userId,
        authorizationFingerprint: 'export-actions-confirm-race',
      },
      () => undefined,
      { force: true },
    )
    const staleActions = [
      () => actions.cancelJob('job-1', serverScope),
      () => actions.downloadJob(exportJob('job-1'), serverScope),
      () => actions.deleteJobs(['job-1'], serverScope),
    ]
    for (const run of staleActions) {
      await expect(run()).rejects.toMatchObject({ kind: 'cancelled' })
    }
    expect(api.cancelExportJob).not.toHaveBeenCalled()
    expect(api.downloadExportJob).not.toHaveBeenCalled()
    expect(api.deleteExportJobs).not.toHaveBeenCalled()
    expect(browser.downloadBlobDirect).not.toHaveBeenCalled()
    expect(message.success).not.toHaveBeenCalled()
  })
})
