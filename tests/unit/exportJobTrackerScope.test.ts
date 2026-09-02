import { createPinia, setActivePinia } from 'pinia'
import { effectScope, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({
  channelHandler: undefined as ((event: unknown) => void) | undefined,
  getExportJob: vi.fn(),
  refreshList: vi.fn().mockResolvedValue(undefined),
  refreshUnread: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/api/modules/exportJob', () => ({ getExportJob: runtime.getExportJob }))
vi.mock('@/app/exports/exportJobChannel', () => ({
  subscribeExportJobEvents: (handler: (event: unknown) => void) => {
    runtime.channelHandler = handler
    return () => {
      runtime.channelHandler = undefined
    }
  },
}))
vi.mock('@/app/exports/export-jobs/list', () => ({
  useExportJobList: () => ({
    listQuery: {},
    jobs: ref([]),
    loading: ref(false),
    error: ref(),
    refresh: runtime.refreshList,
  }),
}))
vi.mock('@/app/exports/export-jobs/notifications', () => ({
  useExportNotificationState: () => ({
    unreadCount: ref(0),
    unreadLoading: ref(false),
    refreshUnread: runtime.refreshUnread,
    markVisibleNotificationsRead: vi.fn(),
  }),
}))
vi.mock('@/app/exports/export-jobs/actions', () => ({
  useExportJobActions: () => ({}),
}))

import { useExportJobTracker } from '@/app/exports/export-jobs/tracker'
import { exportJobListQueryKey } from '@/app/exports/exportJobCache'
import type { ExportJob } from '@/api/modules/exportJob'
import type { ApiResponse } from '@/shared/http/types'
import {
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useUserStore } from '@/stores/user'

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

function response<T>(data: T): ApiResponse<T> {
  return { code: 200, message: 'ok', request_id: 'request-1', data }
}

function exportJob(id: string, status: ExportJob['status'] = 'succeeded'): ExportJob {
  return {
    id,
    resource: 'users',
    status,
    created_at: '2026-08-29T00:00:00.000Z',
    matched_rows: 0,
    snapshot_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  useUserStore().$patch({
    sessionStatus: 'authenticated',
    tenantId: 'tenant-a',
    userId: 'user-a',
  })
  runtime.getExportJob.mockReset()
  runtime.refreshList.mockClear()
  runtime.refreshUnread.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  queryClient.clear()
  deactivateServerStateScope()
  vi.restoreAllMocks()
})

describe('导出事件 scope', () => {
  it('同主体 epoch 切换后 tracker 忽略旧事件且零缓存副作用', () => {
    const staleScope = activateScope('authorization-a')
    const componentScope = effectScope()
    componentScope.run(() => useExportJobTracker({ enabled: false }))
    expect(runtime.channelHandler).toBeTypeOf('function')

    const currentScope = activateScope('authorization-b')
    expect(currentScope.sessionEpoch).toBeGreaterThan(staleScope.sessionEpoch)
    const setQueryData = vi.spyOn(queryClient, 'setQueryData')
    const removeQueries = vi.spyOn(queryClient, 'removeQueries')
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    runtime.channelHandler?.({
      type: 'notifications-read',
      ...staleScope,
      jobIds: ['job-1'],
      readAt: '2026-08-29T00:00:00.000Z',
    })
    runtime.channelHandler?.({ type: 'deleted', ...staleScope, jobIds: ['job-1'] })
    runtime.channelHandler?.({ type: 'created', ...staleScope, jobId: 'job-1' })

    expect(setQueryData).not.toHaveBeenCalled()
    expect(removeQueries).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
    expect(runtime.getExportJob).not.toHaveBeenCalled()
    expect(runtime.refreshList).not.toHaveBeenCalled()
    expect(runtime.refreshUnread).not.toHaveBeenCalled()
    componentScope.stop()
  })

  it('事件详情请求在同主体 epoch 切换时中止，迟到成功响应零写入零刷新', async () => {
    const staleScope = activateScope('authorization-a')
    const pending = deferred<ApiResponse<ExportJob>>()
    runtime.getExportJob.mockReturnValueOnce(pending.promise)
    const componentScope = effectScope()
    componentScope.run(() => useExportJobTracker({ enabled: false }))

    runtime.channelHandler?.({ type: 'created', ...staleScope, jobId: 'job-1' })
    await vi.waitFor(() => expect(runtime.getExportJob).toHaveBeenCalledOnce())
    const signal = runtime.getExportJob.mock.calls[0]?.[1] as AbortSignal

    activateScope('authorization-b')
    expect(signal.aborted).toBe(true)
    const setQueryData = vi.spyOn(queryClient, 'setQueryData')
    const removeQueries = vi.spyOn(queryClient, 'removeQueries')
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    pending.resolve(response(exportJob('job-1')))
    await pending.promise
    await Promise.resolve()

    expect(setQueryData).not.toHaveBeenCalled()
    expect(removeQueries).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
    expect(runtime.refreshList).not.toHaveBeenCalled()
    expect(runtime.refreshUnread).not.toHaveBeenCalled()
    componentScope.stop()
  })

  it('轮询 scope 切换后旧 worker 不会以新会话继续请求旧任务', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    vi.stubGlobal('addEventListener', vi.fn())
    vi.stubGlobal('removeEventListener', vi.fn())
    const staleScope = activateScope('authorization-a')
    queryClient.setQueryData(
      exportJobListQueryKey(staleScope),
      Array.from({ length: 5 }, (_, index) => exportJob(`job-${index + 1}`, 'queued')),
    )
    const pending = Array.from({ length: 4 }, () => deferred<ApiResponse<ExportJob>>())
    for (const request of pending) runtime.getExportJob.mockReturnValueOnce(request.promise)
    const componentScope = effectScope()
    const tracker = componentScope.run(() => useExportJobTracker())!

    tracker.startTracking()
    vi.runOnlyPendingTimers()
    await vi.waitFor(() => expect(runtime.getExportJob).toHaveBeenCalledTimes(4))
    const signals = runtime.getExportJob.mock.calls.map((call) => call[1] as AbortSignal)

    activateScope('authorization-b')
    expect(signals.every((signal) => signal.aborted)).toBe(true)
    pending[0]!.resolve(response(exportJob('job-1', 'queued')))
    await pending[0]!.promise
    await Promise.resolve()
    await Promise.resolve()

    expect(runtime.getExportJob).toHaveBeenCalledTimes(4)
    componentScope.stop()
  })
})
