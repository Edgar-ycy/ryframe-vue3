import { QueryClient } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ExportJob } from '@/api/modules/exportJob'
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

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
})

afterEach(() => {
  client.clear()
})

describe('导出任务缓存', () => {
  it('查询键同时隔离租户、用户、列表、详情和未读计数', () => {
    expect(exportJobListQueryKey('tenant-a', 'user-a')).toEqual([
      'tenant',
      'tenant-a',
      'user',
      'user-a',
      'export-jobs',
    ])
    expect(exportJobDetailQueryKey('tenant-a', 'user-a', 'job-1')).toEqual([
      'tenant',
      'tenant-a',
      'user',
      'user-a',
      'export-jobs',
      'job-1',
    ])
    expect(exportJobUnreadQueryKey('tenant-a', 'user-a')).toEqual([
      'tenant',
      'tenant-a',
      'user',
      'user-a',
      'export-jobs',
      'notifications',
      'unread-count',
    ])
  })

  it('置顶任务时去重、同步详情并保持最近一百条上限', () => {
    const existing = Array.from({ length: 100 }, (_, index) => exportJob(`job-${index}`))
    client.setQueryData(exportJobListQueryKey(identity.tenantId, identity.userId), existing)

    const latest = exportJob('job-50', 'running')
    prependExportJob(client, identity, latest)

    const list = client.getQueryData<ExportJob[]>(
      exportJobListQueryKey(identity.tenantId, identity.userId),
    )
    expect(list).toHaveLength(100)
    expect(list?.[0]).toEqual(latest)
    expect(list?.filter((item) => item.id === latest.id)).toHaveLength(1)
    expect(client.getQueryData(exportJobDetailQueryKey('tenant-a', 'user-a', latest.id))).toEqual(
      latest,
    )
  })

  it('合并任务时保留既有顺序，并将新任务放到列表顶部', () => {
    client.setQueryData(exportJobListQueryKey(identity.tenantId, identity.userId), [
      exportJob('job-1'),
      exportJob('job-2'),
    ])

    mergeExportJob(client, identity, exportJob('job-2', 'succeeded'))
    expect(
      client.getQueryData<ExportJob[]>(exportJobListQueryKey('tenant-a', 'user-a')),
    ).toMatchObject([{ id: 'job-1' }, { id: 'job-2', status: 'succeeded' }])

    mergeExportJob(client, identity, exportJob('job-3', 'running'))
    expect(
      client.getQueryData<ExportJob[]>(exportJobListQueryKey('tenant-a', 'user-a')),
    ).toMatchObject([{ id: 'job-3' }, { id: 'job-1' }, { id: 'job-2' }])
  })

  it('删除任务时同时清理列表和对应详情', () => {
    const removed = exportJob('job-1')
    const retained = exportJob('job-2')
    client.setQueryData(exportJobListQueryKey(identity.tenantId, identity.userId), [
      removed,
      retained,
    ])
    client.setQueryData(exportJobDetailQueryKey('tenant-a', 'user-a', removed.id), removed)

    removeExportJob(client, identity, removed.id)

    expect(client.getQueryData<ExportJob[]>(exportJobListQueryKey('tenant-a', 'user-a'))).toEqual([
      retained,
    ])
    expect(
      client.getQueryData(exportJobDetailQueryKey('tenant-a', 'user-a', removed.id)),
    ).toBeUndefined()
  })

  it('批量删除只改写一次列表并清理全部详情', () => {
    const jobs = [exportJob('job-1'), exportJob('job-2'), exportJob('job-3')]
    client.setQueryData(exportJobListQueryKey('tenant-a', 'user-a'), jobs)
    for (const job of jobs) {
      client.setQueryData(exportJobDetailQueryKey('tenant-a', 'user-a', job.id), job)
    }

    removeExportJobs(client, identity, ['job-3', 'job-1', 'job-1'])

    expect(client.getQueryData<ExportJob[]>(exportJobListQueryKey('tenant-a', 'user-a'))).toEqual([
      jobs[1],
    ])
    expect(
      client.getQueryData(exportJobDetailQueryKey('tenant-a', 'user-a', 'job-1')),
    ).toBeUndefined()
    expect(client.getQueryData(exportJobDetailQueryKey('tenant-a', 'user-a', 'job-2'))).toEqual(
      jobs[1],
    )
    expect(
      client.getQueryData(exportJobDetailQueryKey('tenant-a', 'user-a', 'job-3')),
    ).toBeUndefined()
  })

  it('只把成功或失败且尚未阅读的通知标记为已读', () => {
    const succeeded = exportJob('job-1', 'succeeded')
    const failed = exportJob('job-2', 'failed')
    const running = exportJob('job-3', 'running')
    const alreadyRead = exportJob('job-4', 'failed', {
      notification_read_at: '2026-08-19T00:00:00.000Z',
    })
    const jobs = [succeeded, failed, running, alreadyRead]
    client.setQueryData(exportJobListQueryKey(identity.tenantId, identity.userId), jobs)
    for (const job of jobs) {
      client.setQueryData(exportJobDetailQueryKey('tenant-a', 'user-a', job.id), job)
    }

    const readAt = '2026-08-20T12:00:00.000Z'
    markExportNotificationsReadInCache(
      client,
      identity,
      jobs.map((job) => job.id),
      readAt,
    )

    const list = client.getQueryData<ExportJob[]>(exportJobListQueryKey('tenant-a', 'user-a'))
    expect(list?.map((job) => job.notification_read_at ?? null)).toEqual([
      readAt,
      readAt,
      null,
      '2026-08-19T00:00:00.000Z',
    ])
    expect(
      client.getQueryData<ExportJob>(exportJobDetailQueryKey('tenant-a', 'user-a', 'job-1'))
        ?.notification_read_at,
    ).toBe(readAt)
    expect(
      client.getQueryData<ExportJob>(exportJobDetailQueryKey('tenant-a', 'user-a', 'job-3'))
        ?.notification_read_at,
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
})
