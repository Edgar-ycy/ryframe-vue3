import {
  getCurrentScope,
  onScopeDispose,
  ref,
  type MaybeRefOrGetter,
} from 'vue'
import { getExportJob, type ExportJob } from '@/api/modules/exportJob'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { subscribeExportJobEvents } from '../exportJobChannel'
import {
  exportJobListQueryKey,
  isActiveExportJob,
  isUnreadExportNotification,
  markExportNotificationsReadInCache,
  mergeExportJob,
  removeExportJob,
  removeExportJobs,
  type ExportJobIdentity,
} from '../exportJobCache'
import { useExportJobActions } from './actions'
import { currentExportJobIdentity, sameExportJobIdentity, shouldEnableExportJobs } from './identity'
import { useExportJobList } from './list'
import { useExportNotificationState } from './notifications'

const ACTIVE_REFRESH_INTERVAL_MS = 5_000
const MAX_CONCURRENT_DETAILS = 4

export interface ExportJobTransition {
  previous: ExportJob
  current: ExportJob
}

export interface ExportJobTrackerOptions {
  enabled?: MaybeRefOrGetter<boolean>
  onTransition?: (previous: ExportJob, current: ExportJob) => void
}

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
  let trackedIdentity = currentExportJobIdentity()

  function listFromCache(identity: ExportJobIdentity): ExportJob[] {
    return queryClient.getQueryData<ExportJob[]>(
      exportJobListQueryKey(identity.tenantId, identity.userId),
    ) ?? []
  }

  function reconcileList(identity: ExportJobIdentity): void {
    const jobs = listFromCache(identity)
    activeCount.value = jobs.filter(isActiveExportJob).length
    if (!baselineEstablished) {
      previousJobs.clear()
      for (const job of jobs) previousJobs.set(job.id, job)
      baselineEstablished = true
      if (running && activeCount.value > 0 && timer === undefined) scheduleNextCycle(true)
      return
    }
    const visibleIds = new Set(jobs.map(job => job.id))
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
    }
    else if (activeCount.value === 0) {
      if (timer !== undefined) globalThis.clearTimeout(timer)
      timer = undefined
      cycleController?.abort()
      cycleController = undefined
    }
  }

  async function refreshOne(identity: ExportJobIdentity, jobId: string): Promise<void> {
    try {
      const job = requireOperationData(await getExportJob(jobId, cycleController?.signal))
      if (!sameExportJobIdentity(identity, currentExportJobIdentity() ?? { tenantId: '', userId: '' })) return
      mergeExportJob(queryClient, identity, job)
    }
    catch (error) {
      if (!(error instanceof HttpError)) return
      if (error.kind === 'cancelled') return
      if (error.status === 403 || error.status === 404) {
        removeExportJob(queryClient, identity, jobId)
        return
      }
      if (error.status === 409) {
        try {
          const latest = requireOperationData(await getExportJob(jobId, cycleController?.signal))
          if (!sameExportJobIdentity(identity, currentExportJobIdentity() ?? { tenantId: '', userId: '' })) return
          mergeExportJob(queryClient, identity, latest)
        }
        catch (retryError) {
          if (retryError instanceof HttpError && retryError.kind === 'cancelled') return
          try {
            await list.refresh()
          }
          catch {
            // 本轮对账失败时保留活跃任务，下一轮继续确认。
          }
        }
      }
    }
  }

  async function refreshActiveDetails(): Promise<void> {
    if (!running || document.visibilityState === 'hidden' || !shouldEnableExportJobs(enabled)) return
    const identity = currentExportJobIdentity()
    if (!identity) return
    const ids = listFromCache(identity).filter(isActiveExportJob).map(job => job.id)
    let cursor = 0
    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT_DETAILS, ids.length) },
      async () => {
        while (cursor < ids.length) {
          const jobId = ids[cursor]
          cursor += 1
          if (jobId) await refreshOne(identity, jobId)
        }
      },
    )
    await Promise.all(workers)
  }

  function scheduleNextCycle(immediate = false): void {
    if (timer !== undefined) globalThis.clearTimeout(timer)
    timer = undefined
    if (!running || !shouldEnableExportJobs(enabled) || activeCount.value === 0) return
    timer = globalThis.setTimeout(async () => {
      timer = undefined
      cycleController?.abort()
      cycleController = new AbortController()
      await refreshActiveDetails()
      scheduleNextCycle()
    }, immediate ? 0 : ACTIVE_REFRESH_INTERVAL_MS)
  }

  async function refresh(): Promise<void> {
    await Promise.all([
      list.refresh(),
      notifications.refreshUnread().catch(() => undefined),
    ])
    const identity = currentExportJobIdentity()
    if (identity) reconcileList(identity)
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
    const identity = currentExportJobIdentity()
    if (identity) reconcileList(identity)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    globalThis.addEventListener('focus', handleWindowFocus)
    globalThis.addEventListener('online', handleWindowFocus)
    if (activeCount.value > 0) scheduleNextCycle(true)
  }

  function stopTracking(): void {
    if (!running) return
    running = false
    if (timer !== undefined) globalThis.clearTimeout(timer)
    timer = undefined
    cycleController?.abort()
    cycleController = undefined
    for (const controller of channelControllers) controller.abort()
    channelControllers.clear()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    globalThis.removeEventListener('focus', handleWindowFocus)
    globalThis.removeEventListener('online', handleWindowFocus)
  }

  const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
    const identity = currentExportJobIdentity()
    if (!identity) return
    const expected = exportJobListQueryKey(identity.tenantId, identity.userId)
    if (JSON.stringify(event.query.queryKey) === JSON.stringify(expected)) {
      reconcileList(identity)
    }
  })
  const unsubscribeChannel = subscribeExportJobEvents((event) => {
    const identity = currentExportJobIdentity()
    if (!identity || !sameExportJobIdentity(identity, event)) return
    if (event.type === 'notifications-read') {
      markExportNotificationsReadInCache(queryClient, identity, event.jobIds, event.readAt)
      void notifications.refreshUnread().catch(() => undefined)
      return
    }
    if (event.type === 'deleted') {
      removeExportJobs(queryClient, identity, event.jobIds)
      void Promise.allSettled([list.refresh(), notifications.refreshUnread()])
      return
    }
    const controller = new AbortController()
    channelControllers.add(controller)
    void getExportJob(event.jobId, controller.signal)
      .then((response) => {
        const latestIdentity = currentExportJobIdentity()
        if (!latestIdentity || !sameExportJobIdentity(identity, latestIdentity)) return
        const job = requireOperationData(response)
        mergeExportJob(queryClient, identity, job)
        if (isUnreadExportNotification(job)) {
          void notifications.refreshUnread().catch(() => undefined)
        }
      })
      .catch((error: unknown) => {
        const latestIdentity = currentExportJobIdentity()
        if (!latestIdentity || !sameExportJobIdentity(identity, latestIdentity)) return
        if (error instanceof HttpError && (error.status === 403 || error.status === 404)) {
          removeExportJob(queryClient, identity, event.jobId)
        }
      })
      .finally(() => channelControllers.delete(controller))
  })
  const unsubscribeUser = useUserStore().$subscribe(() => {
    const nextIdentity = currentExportJobIdentity()
    if (
      trackedIdentity
      && nextIdentity
      && sameExportJobIdentity(trackedIdentity, nextIdentity)
    ) return
    if (!trackedIdentity && !nextIdentity) return
    trackedIdentity = nextIdentity
    stopTracking()
    baselineEstablished = false
    previousJobs.clear()
    activeCount.value = 0
    if (!shouldEnableExportJobs(enabled) || !nextIdentity) return
    void refresh()
      .catch(() => undefined)
      .finally(() => {
        const latestIdentity = currentExportJobIdentity()
        if (latestIdentity && sameExportJobIdentity(latestIdentity, nextIdentity)) startTracking()
      })
  }, { flush: 'sync' })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stopTracking()
      unsubscribeCache()
      unsubscribeChannel()
      unsubscribeUser()
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
