import { getCurrentScope, onScopeDispose, ref, watch } from 'vue'
import { getExportJob, type ExportJob } from '@/api/modules/exportJob'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { isServerStateScopeCurrent, queryClient, useServerStateScope } from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { subscribeExportJobEvents } from '../exportJobChannel'
import {
  exportJobListQueryKey,
  exportJobListFromCache,
  isActiveExportJob,
  isUnreadExportNotification,
  markExportNotificationsReadInCache,
  mergeExportJob,
  removeExportJob,
  removeExportJobs,
} from '../exportJobCache'
import { useExportJobActions } from './actions'
import { currentExportJobScope, sameExportJobScope, shouldEnableExportJobs } from './identity'
import { useExportJobList } from './list'
import { useExportNotificationState } from './notifications'
import {
  ACTIVE_REFRESH_INTERVAL_MS,
  MAX_CONCURRENT_DETAILS,
  type ExportJobTrackerOptions,
} from './trackerModel'

export type { ExportJobTrackerOptions, ExportJobTransition } from './trackerModel'
export function useExportJobTracker(options: ExportJobTrackerOptions = {}) {
  const enabled = options.enabled ?? true
  const list = useExportJobList(enabled)
  const notifications = useExportNotificationState(enabled)
  const actions = useExportJobActions()
  const activeCount = ref(0)
  const previousJobs = new Map<string, ExportJob>()
  let baselineEstablished = false
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined
  let cycleController: AbortController | undefined
  const channelControllers = new Set<AbortController>()
  let running = false
  let trackedScope = currentExportJobScope()

  function reconcileList(scope: ServerStateScope): void {
    if (!isServerStateScopeCurrent(scope)) return
    const jobs = exportJobListFromCache(queryClient, scope)
    activeCount.value = jobs.filter(isActiveExportJob).length
    if (!baselineEstablished) {
      previousJobs.clear()
      for (const job of jobs) previousJobs.set(job.id, job)
      baselineEstablished = true
      if (running && activeCount.value > 0 && timer === undefined) scheduleNextCycle(true)
      return
    }
    const visibleIds = new Set(jobs.map((job) => job.id))
    for (const [jobId] of previousJobs) {
      if (!visibleIds.has(jobId)) previousJobs.delete(jobId)
    }
    for (const current of jobs) {
      const previous = previousJobs.get(current.id)
      previousJobs.set(current.id, current)
      if (running && previous && isActiveExportJob(previous) && !isActiveExportJob(current)) {
        if (isUnreadExportNotification(current)) {
          void notifications.refreshUnread().catch(() => undefined)
        }
        options.onTransition?.(previous, current)
      }
    }
    if (!running) return
    if (activeCount.value > 0 && timer === undefined) {
      scheduleNextCycle()
    } else if (activeCount.value === 0) {
      if (timer !== undefined) globalThis.clearTimeout(timer)
      timer = undefined
      cycleController?.abort()
      cycleController = undefined
    }
  }

  async function refreshOne(
    scope: ServerStateScope,
    jobId: string,
    controller: AbortController,
  ): Promise<void> {
    if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
    try {
      const job = requireOperationData(await getExportJob(jobId, controller.signal))
      if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
      mergeExportJob(queryClient, scope, job)
    } catch (error) {
      if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
      if (!(error instanceof HttpError)) return
      if (error.kind === 'cancelled') return
      if (error.status === 403 || error.status === 404) {
        removeExportJob(queryClient, scope, jobId)
        return
      }
      if (error.status === 409) {
        try {
          if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
          const latest = requireOperationData(await getExportJob(jobId, controller.signal))
          if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
          mergeExportJob(queryClient, scope, latest)
        } catch (retryError) {
          if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
          if (retryError instanceof HttpError && retryError.kind === 'cancelled') return
          try {
            if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
            await list.refresh()
          } catch {
            // 本轮对账失败时保留活跃任务，下一轮继续确认。
          }
        }
      }
    }
  }

  async function refreshActiveDetails(
    scope: ServerStateScope,
    controller: AbortController,
  ): Promise<void> {
    if (!running || document.visibilityState === 'hidden' || !shouldEnableExportJobs(enabled))
      return
    if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
    const ids = exportJobListFromCache(queryClient, scope)
      .filter(isActiveExportJob)
      .map((job) => job.id)
    let cursor = 0
    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT_DETAILS, ids.length) },
      async () => {
        while (cursor < ids.length) {
          if (controller.signal.aborted || !isServerStateScopeCurrent(scope)) return
          const jobId = ids[cursor]
          cursor += 1
          if (jobId) await refreshOne(scope, jobId, controller)
        }
      },
    )
    await Promise.all(workers)
  }

  function scheduleNextCycle(immediate = false): void {
    if (timer !== undefined) globalThis.clearTimeout(timer)
    timer = undefined
    if (!running || !shouldEnableExportJobs(enabled) || activeCount.value === 0) return
    timer = globalThis.setTimeout(
      async () => {
        timer = undefined
        const scope = currentExportJobScope()
        if (!scope) return
        cycleController?.abort()
        const controller = new AbortController()
        cycleController = controller
        try {
          await refreshActiveDetails(scope, controller)
        } finally {
          if (cycleController === controller) cycleController = undefined
        }
        if (isServerStateScopeCurrent(scope)) scheduleNextCycle()
      },
      immediate ? 0 : ACTIVE_REFRESH_INTERVAL_MS,
    )
  }

  async function refresh(): Promise<void> {
    await Promise.all([list.refresh(), notifications.refreshUnread().catch(() => undefined)])
    const scope = currentExportJobScope()
    if (scope) reconcileList(scope)
    if (activeCount.value > 0) scheduleNextCycle(true)
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      cycleController?.abort()
      if (timer !== undefined) globalThis.clearTimeout(timer)
      timer = undefined
      return
    }
    void refresh()
  }

  function handleWindowFocus(): void {
    if (document.visibilityState !== 'hidden') void refresh()
  }

  function startTracking(): void {
    if (running) return
    running = true
    baselineEstablished = false
    previousJobs.clear()
    const scope = currentExportJobScope()
    if (scope) reconcileList(scope)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    globalThis.addEventListener('focus', handleWindowFocus)
    globalThis.addEventListener('online', handleWindowFocus)
    if (activeCount.value > 0) scheduleNextCycle(true)
  }

  function stopTracking(): void {
    const wasRunning = running
    running = false
    if (timer !== undefined) globalThis.clearTimeout(timer)
    timer = undefined
    cycleController?.abort()
    cycleController = undefined
    for (const controller of channelControllers) controller.abort()
    channelControllers.clear()
    if (!wasRunning) return
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    globalThis.removeEventListener('focus', handleWindowFocus)
    globalThis.removeEventListener('online', handleWindowFocus)
  }

  const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
    const scope = currentExportJobScope()
    if (!scope) return
    const expected = exportJobListQueryKey(scope)
    if (JSON.stringify(event.query.queryKey) === JSON.stringify(expected)) {
      reconcileList(scope)
    }
  })
  const unsubscribeChannel = subscribeExportJobEvents((event) => {
    if (!isServerStateScopeCurrent(event)) return
    const scope: ServerStateScope = event
    if (event.type === 'notifications-read') {
      markExportNotificationsReadInCache(queryClient, scope, event.jobIds, event.readAt)
      if (!isServerStateScopeCurrent(scope)) return
      void notifications.refreshUnread().catch(() => undefined)
      return
    }
    if (event.type === 'deleted') {
      removeExportJobs(queryClient, scope, event.jobIds)
      if (!isServerStateScopeCurrent(scope)) return
      void Promise.allSettled([list.refresh(), notifications.refreshUnread()])
      return
    }
    const controller = new AbortController()
    channelControllers.add(controller)
    void getExportJob(event.jobId, controller.signal)
      .then((response) => {
        if (!isServerStateScopeCurrent(scope)) return
        const job = requireOperationData(response)
        mergeExportJob(queryClient, scope, job)
        if (isUnreadExportNotification(job)) {
          void notifications.refreshUnread().catch(() => undefined)
        }
      })
      .catch((error: unknown) => {
        if (!isServerStateScopeCurrent(scope)) return
        if (error instanceof HttpError && (error.status === 403 || error.status === 404)) {
          removeExportJob(queryClient, scope, event.jobId)
        }
      })
      .finally(() => channelControllers.delete(controller))
  })
  const stopScopeWatch = watch(
    useServerStateScope(),
    () => {
      const nextScope = currentExportJobScope()
      if (trackedScope && nextScope && sameExportJobScope(trackedScope, nextScope)) return
      if (!trackedScope && !nextScope) return
      trackedScope = nextScope
      stopTracking()
      baselineEstablished = false
      previousJobs.clear()
      activeCount.value = 0
      if (!shouldEnableExportJobs(enabled) || !nextScope) return
      void refresh()
        .catch(() => undefined)
        .finally(() => {
          if (isServerStateScopeCurrent(nextScope)) startTracking()
        })
    },
    { flush: 'sync' },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stopTracking()
      unsubscribeCache()
      unsubscribeChannel()
      stopScopeWatch()
    })
  }

  return {
    listQuery: list.listQuery,
    jobs: list.jobs,
    listLoading: list.loading,
    listError: list.error,
    activeCount,
    unreadCount: notifications.unreadCount,
    unreadLoading: notifications.unreadLoading,
    markVisibleNotificationsRead: notifications.markVisibleNotificationsRead,
    refreshUnread: notifications.refreshUnread,
    refresh,
    startTracking,
    stopTracking,
    ...actions,
  }
}
