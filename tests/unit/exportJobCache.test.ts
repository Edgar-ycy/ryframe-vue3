import { QueryClient } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ExportJob } from '@/api/modules/exportJob'
import {
  deactivateServerStateScope,
  getServerStateScope,
  transitionServerStateScope,
} from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import {
  exportJobDetailQueryKey,
  exportJobListQueryKey,
  exportJobUnreadQueryKey,
  isActiveExportJob,
  isTerminalExportJob,
  isUnreadExportNotification,
  markExportNotificationsReadInCache,
  mergeExportJob,
  prependExportJob,
  removeExportJob,
  removeExportJobs,
} from '@/app/exports/exportJobCache'

const identity = { tenantId: 'tenant-a', userId: 'user-a' }

function exportJob(id: string, status = 'queued', overrides: Partial<ExportJob> = {}): ExportJob {
  return {
    id,
    resource: 'users',
    status,
    created_at: '2026-08-20T00:00:00.000Z',
    matched_rows: 0,
    snapshot_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-20T00:00:00.000Z',
    ...overrides,
  }
}

let client: QueryClient
let scope: ServerStateScope

beforeEach(() => {
  transitionServerStateScope(
    {
      tenantId: identity.tenantId,
      subjectId: identity.userId,
      authorizationFingerprint: 'export-job-cache-test',
    },
    () => undefined,
    { force: true },
  )
  scope = getServerStateScope()!
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
})

afterEach(() => {
  client.clear()
  deactivateServerStateScope()
})

describe('导出任务缓存', () => {
  it('查询键同时隔离租户、用户、列表、详情和未读计数', () => {
    const epoch = getServerStateScope()?.sessionEpoch
    expect(exportJobListQueryKey(scope)).toEqual([
      'server-state',
      'tenant-a',
      'user-a',
      epoch,
      'export-jobs',
      { scope: 'list' },
    ])
    expect(exportJobDetailQueryKey(scope, 'job-1')).toEqual([
      'server-state',
      'tenant-a',
      'user-a',
      epoch,
      'export-jobs',
      { scope: 'detail', jobId: 'job-1' },
    ])
    expect(exportJobUnreadQueryKey(scope)).toEqual([
      'server-state',
      'tenant-a',
      'user-a',
      epoch,
      'export-job-notifications',
      { scope: 'unread-count' },
    ])
  })

  it('置顶任务时去重、同步详情并保持最近一百条上限', () => {
    const existing = Array.from({ length: 100 }, (_, index) => exportJob(`job-${index}`))
    client.setQueryData(exportJobListQueryKey(scope), existing)

    const latest = exportJob('job-50', 'running')
    prependExportJob(client, scope, latest)

    const list = client.getQueryData<ExportJob[]>(exportJobListQueryKey(scope))
    expect(list).toHaveLength(100)
    expect(list?.[0]).toEqual(latest)
    expect(list?.filter((item) => item.id === latest.id)).toHaveLength(1)
    expect(client.getQueryData(exportJobDetailQueryKey(scope, latest.id))).toEqual(latest)
  })

  it('合并任务时保留既有顺序，并将新任务放到列表顶部', () => {
    client.setQueryData(exportJobListQueryKey(scope), [exportJob('job-1'), exportJob('job-2')])

    mergeExportJob(client, scope, exportJob('job-2', 'succeeded'))
    expect(client.getQueryData<ExportJob[]>(exportJobListQueryKey(scope))).toMatchObject([
      { id: 'job-1' },
      { id: 'job-2', status: 'succeeded' },
    ])

    mergeExportJob(client, scope, exportJob('job-3', 'running'))
    expect(client.getQueryData<ExportJob[]>(exportJobListQueryKey(scope))).toMatchObject([
      { id: 'job-3' },
      { id: 'job-1' },
      { id: 'job-2' },
    ])
  })

  it('删除任务时同时清理列表和对应详情', () => {
    const removed = exportJob('job-1')
    const retained = exportJob('job-2')
    client.setQueryData(exportJobListQueryKey(scope), [removed, retained])
    client.setQueryData(exportJobDetailQueryKey(scope, removed.id), removed)

    removeExportJob(client, scope, removed.id)

    expect(client.getQueryData<ExportJob[]>(exportJobListQueryKey(scope))).toEqual([retained])
    expect(client.getQueryData(exportJobDetailQueryKey(scope, removed.id))).toBeUndefined()
  })

  it('批量删除只改写一次列表并清理全部详情', () => {
    const jobs = [exportJob('job-1'), exportJob('job-2'), exportJob('job-3')]
    client.setQueryData(exportJobListQueryKey(scope), jobs)
    for (const job of jobs) {
      client.setQueryData(exportJobDetailQueryKey(scope, job.id), job)
    }

    removeExportJobs(client, scope, ['job-3', 'job-1', 'job-1'])

    expect(client.getQueryData<ExportJob[]>(exportJobListQueryKey(scope))).toEqual([jobs[1]])
    expect(client.getQueryData(exportJobDetailQueryKey(scope, 'job-1'))).toBeUndefined()
    expect(client.getQueryData(exportJobDetailQueryKey(scope, 'job-2'))).toEqual(jobs[1])
    expect(client.getQueryData(exportJobDetailQueryKey(scope, 'job-3'))).toBeUndefined()
  })

  it('只把成功或失败且尚未阅读的通知标记为已读', () => {
    const succeeded = exportJob('job-1', 'succeeded')
    const failed = exportJob('job-2', 'failed')
    const running = exportJob('job-3', 'running')
    const alreadyRead = exportJob('job-4', 'failed', {
      notification_read_at: '2026-08-19T00:00:00.000Z',
    })
    const jobs = [succeeded, failed, running, alreadyRead]
    client.setQueryData(exportJobListQueryKey(scope), jobs)
    for (const job of jobs) {
      client.setQueryData(exportJobDetailQueryKey(scope, job.id), job)
    }

    const readAt = '2026-08-20T12:00:00.000Z'
    markExportNotificationsReadInCache(
      client,
      scope,
      jobs.map((job) => job.id),
      readAt,
    )

    const list = client.getQueryData<ExportJob[]>(exportJobListQueryKey(scope))
    expect(list?.map((job) => job.notification_read_at ?? null)).toEqual([
      readAt,
      readAt,
      null,
      '2026-08-19T00:00:00.000Z',
    ])
    expect(
      client.getQueryData<ExportJob>(exportJobDetailQueryKey(scope, 'job-1'))?.notification_read_at,
    ).toBe(readAt)
    expect(
      client.getQueryData<ExportJob>(exportJobDetailQueryKey(scope, 'job-3'))?.notification_read_at,
    ).toBeUndefined()
  })

  it('稳定区分活跃任务和未读完成通知', () => {
    expect(isActiveExportJob(exportJob('queued', 'queued'))).toBe(true)
    expect(isActiveExportJob(exportJob('running', 'running'))).toBe(true)
    expect(isActiveExportJob(exportJob('succeeded', 'succeeded'))).toBe(false)
    expect(isTerminalExportJob(exportJob('succeeded', 'succeeded'))).toBe(true)
    expect(isTerminalExportJob(exportJob('failed', 'failed'))).toBe(true)
    expect(isTerminalExportJob(exportJob('cancelled', 'cancelled'))).toBe(true)
    expect(isTerminalExportJob(exportJob('expired', 'expired'))).toBe(true)
    expect(isTerminalExportJob(exportJob('running', 'running'))).toBe(false)
    expect(isUnreadExportNotification(exportJob('failed', 'failed'))).toBe(true)
    expect(
      isUnreadExportNotification(
        exportJob('read', 'succeeded', {
          notification_read_at: '2026-08-20T00:00:00.000Z',
        }),
      ),
    ).toBe(false)
  })

  it('同身份 epoch 切换后旧 scope 事件不得执行任何缓存写入', () => {
    const staleScope = scope
    transitionServerStateScope(
      {
        tenantId: identity.tenantId,
        subjectId: identity.userId,
        authorizationFingerprint: 'export-job-cache-next-authorization',
      },
      () => undefined,
      { force: true },
    )
    scope = getServerStateScope()!
    expect(scope.sessionEpoch).toBeGreaterThan(staleScope.sessionEpoch)
    const setQueryData = vi.spyOn(client, 'setQueryData')
    const removeQueries = vi.spyOn(client, 'removeQueries')
    const staleJob = exportJob('stale-job', 'succeeded')

    prependExportJob(client, staleScope, staleJob)
    mergeExportJob(client, staleScope, staleJob)
    removeExportJobs(client, staleScope, [staleJob.id])
    markExportNotificationsReadInCache(client, staleScope, [staleJob.id])

    expect(setQueryData).not.toHaveBeenCalled()
    expect(removeQueries).not.toHaveBeenCalled()
  })
})
