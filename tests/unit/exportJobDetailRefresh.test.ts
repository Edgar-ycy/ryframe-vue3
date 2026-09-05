import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getExportJob: vi.fn() }))

vi.mock('@/api/modules/exportJob', () => ({ getExportJob: api.getExportJob }))

import type { ExportJob } from '@/api/modules/exportJob'
import { refreshExportJob } from '@/app/exports/export-jobs/detailRefresh'
import { exportJobDetailQueryKey, exportJobListQueryKey } from '@/app/exports/exportJobCache'
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

function response<T>(data: T): ApiResponse<T> {
  return { code: 200, message: 'ok', request_id: 'request-1', data }
}

function exportJob(status: ExportJob['status']): ExportJob {
  return {
    id: 'job-1',
    resource: 'users',
    status,
    created_at: '2026-09-05T00:00:00.000Z',
    matched_rows: 0,
    snapshot_at: '2026-09-05T00:00:00.000Z',
    updated_at: '2026-09-05T00:00:00.000Z',
  }
}

function activateScope(fingerprint: string): ServerStateScope {
  transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId: 'user-a',
      authorizationFingerprint: fingerprint,
    },
    () => undefined,
    { force: true },
  )
  return getServerStateScope()!
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

beforeEach(() => {
  setActivePinia(createPinia())
  useUserStore().$patch({
    sessionStatus: 'authenticated',
    tenantId: 'tenant-a',
    userId: 'user-a',
  })
  api.getExportJob.mockReset()
  queryClient.clear()
})

afterEach(() => {
  queryClient.clear()
  deactivateServerStateScope()
})

describe('导出任务详情刷新', () => {
  it('详情成功后只合并当前 scope 的任务缓存', async () => {
    const scope = activateScope('authorization-a')
    const completed = exportJob('succeeded')
    queryClient.setQueryData(exportJobListQueryKey(scope), [exportJob('running')])
    api.getExportJob.mockResolvedValueOnce(response(completed))

    await refreshExportJob(scope, completed.id, new AbortController(), vi.fn())

    expect(queryClient.getQueryData(exportJobListQueryKey(scope))).toEqual([completed])
    expect(queryClient.getQueryData(exportJobDetailQueryKey(scope, completed.id))).toEqual(
      completed,
    )
  })

  it.each([403, 404])('%s 响应会精确移除不可见任务', async (status) => {
    const scope = activateScope(`authorization-${status}`)
    const job = exportJob('running')
    queryClient.setQueryData(exportJobListQueryKey(scope), [job])
    queryClient.setQueryData(exportJobDetailQueryKey(scope, job.id), job)
    api.getExportJob.mockRejectedValueOnce(new HttpError('任务不可见', { status }))

    await refreshExportJob(scope, job.id, new AbortController(), vi.fn())

    expect(queryClient.getQueryData(exportJobListQueryKey(scope))).toEqual([])
    expect(queryClient.getQueryData(exportJobDetailQueryKey(scope, job.id))).toBeUndefined()
  })

  it('409 后重新读取最新详情，第二次仍失败才回退完整列表对账', async () => {
    const scope = activateScope('authorization-conflict')
    const completed = exportJob('succeeded')
    const refreshList = vi.fn().mockResolvedValue(undefined)
    api.getExportJob
      .mockRejectedValueOnce(new HttpError('状态冲突', { status: 409 }))
      .mockResolvedValueOnce(response(completed))

    await refreshExportJob(scope, completed.id, new AbortController(), refreshList)

    expect(api.getExportJob).toHaveBeenCalledTimes(2)
    expect(refreshList).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(exportJobDetailQueryKey(scope, completed.id))).toEqual(
      completed,
    )

    api.getExportJob
      .mockRejectedValueOnce(new HttpError('状态冲突', { status: 409 }))
      .mockRejectedValueOnce(new HttpError('读取失败', { status: 500 }))
    await refreshExportJob(scope, completed.id, new AbortController(), refreshList)

    expect(refreshList).toHaveBeenCalledOnce()
  })

  it('scope 切换后的迟到成功响应不写入新会话缓存', async () => {
    const staleScope = activateScope('authorization-stale')
    const pending = deferred<ApiResponse<ExportJob>>()
    api.getExportJob.mockReturnValueOnce(pending.promise)
    const setQueryData = vi.spyOn(queryClient, 'setQueryData')

    const refreshing = refreshExportJob(staleScope, 'job-1', new AbortController(), vi.fn())
    await vi.waitFor(() => expect(api.getExportJob).toHaveBeenCalledOnce())
    activateScope('authorization-current')
    setQueryData.mockClear()
    pending.resolve(response(exportJob('succeeded')))
    await refreshing

    expect(setQueryData).not.toHaveBeenCalled()
  })
})
