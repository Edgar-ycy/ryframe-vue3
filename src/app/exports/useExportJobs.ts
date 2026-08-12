import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  toValue,
  type MaybeRefOrGetter,
} from 'vue'
import { ElMessage } from 'element-plus'
import { useQuery } from '@tanstack/vue-query'
import {
  cancelExportJob,
  downloadExportJob,
  getExportJob,
  listExportJobs,
  type ExportJob,
} from '@/api/modules/exportJob'
import { downloadBlobDirect } from '@/hooks/useDownload'
import { translate } from '@/i18n'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { queryClient } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'
import { publishExportJobEvent, subscribeExportJobEvents } from './exportJobChannel'
import {
  exportJobListQueryKey,
  isActiveExportJob,
  mergeExportJob,
  removeExportJob,
  type ExportJobIdentity,
} from './exportJobCache'

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

function currentIdentity(): ExportJobIdentity | undefined {
  const user = useUserStore()
  if (user.sessionStatus !== 'authenticated' || !user.tenantId || !user.userId) return undefined
  return { tenantId: user.tenantId, userId: String(user.userId) }
}

function sameIdentity(left: ExportJobIdentity, right: ExportJobIdentity): boolean {
  return left.tenantId === right.tenantId && left.userId === right.userId
}

function shouldEnable(enabled: MaybeRefOrGetter<boolean>): boolean {
  return toValue(enabled) && currentIdentity() !== undefined
}

/** 最近一百条任务列表只在显式事件触发时刷新，不设置周期轮询。 */
export function useExportJobList(
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const user = useUserStore()
  const listQuery = useQuery<ExportJob[], HttpError>({
    queryKey: computed(() => exportJobListQueryKey(
      user.tenantId || 'anonymous',
      String(user.userId || 'anonymous'),
    )),
    enabled: computed(() => shouldEnable(enabled)),
    queryFn: async ({ signal }) => requireOperationData(await listExportJobs(signal)),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 10 * 60_000,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    meta: { errorMode: 'silent' },
  })

  async function refresh(): Promise<void> {
    if (!shouldEnable(enabled)) return
    await listQuery.refetch({ throwOnError: true })
  }

  return {
    listQuery,
    jobs: listQuery.data,
    loading: listQuery.isFetching,
    error: listQuery.error,
    refresh,
  }
}

/** 取消和下载是显式用户操作，不会建立任务轮询。 */
export function useExportJobActions() {
  const user = useUserStore()
  const cancellingJobId = ref<string>()
  const downloadingJobId = ref<string>()
  let cancelController: AbortController | undefined
  let downloadController: AbortController | undefined
  let cancelIdentity: ExportJobIdentity | undefined
  let downloadIdentity: ExportJobIdentity | undefined

  function identityStillCurrent(identity: ExportJobIdentity): boolean {
    const latest = currentIdentity()
    return latest !== undefined && sameIdentity(identity, latest)
  }

  async function reconcileAfterActionError(
    identity: ExportJobIdentity,
    jobId: string,
    error: unknown,
  ): Promise<void> {
    if (!identityStillCurrent(identity)) return
    if (!(error instanceof HttpError)) return
    if (error.kind === 'cancelled') return
    if (error.status === 403 || error.status === 404) {
      removeExportJob(queryClient, identity, jobId)
      return
    }
    if (error.status !== 409) return
    try {
      const latest = requireOperationData(await getExportJob(jobId))
      mergeExportJob(queryClient, identity, latest)
    }
    catch {
      await queryClient.invalidateQueries({
        queryKey: exportJobListQueryKey(identity.tenantId, identity.userId),
        exact: true,
      })
    }
  }

  async function cancelJob(jobId: string): Promise<ExportJob> {
    if (cancellingJobId.value) {
      throw new HttpError(translate('shell.http.requestFailed'), { status: 409, kind: 'http' })
    }
    const identity = currentIdentity()
    if (!identity) throw new HttpError(translate('shell.session.expired'), { status: 401 })
    const controller = new AbortController()
    cancellingJobId.value = jobId
    cancelController = controller
    cancelIdentity = identity
    try {
      const job = requireOperationData(await cancelExportJob(jobId, controller.signal))
      if (!identityStillCurrent(identity)) {
        throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
      }
      mergeExportJob(queryClient, identity, job)
      publishExportJobEvent({ type: 'cancelled', ...identity, jobId })
      return job
    }
    catch (error) {
      await reconcileAfterActionError(identity, jobId, error)
      throw error
    }
    finally {
      if (cancelController === controller) {
        cancelController = undefined
        cancelIdentity = undefined
        cancellingJobId.value = undefined
      }
    }
  }

  async function downloadJob(job: ExportJob): Promise<void> {
    if (downloadingJobId.value) return
    const identity = currentIdentity()
    if (!identity) throw new HttpError(translate('shell.session.expired'), { status: 401 })
    const controller = new AbortController()
    downloadingJobId.value = job.id
    downloadController = controller
    downloadIdentity = identity
    try {
      const blob = await downloadExportJob(job.id, controller.signal)
      if (!identityStillCurrent(identity)) {
        throw new HttpError(translate('shell.http.requestFailed'), { kind: 'cancelled' })
      }
      downloadBlobDirect(
        blob,
        job.result_file_name || translate('shell.download.defaultFilename'),
      )
      ElMessage.success(translate('shell.download.success'))
    }
    catch (error) {
      await reconcileAfterActionError(identity, job.id, error)
      throw error
    }
    finally {
      if (downloadController === controller) {
        downloadController = undefined
        downloadIdentity = undefined
        downloadingJobId.value = undefined
      }
    }
  }

  const unsubscribeUser = user.$subscribe((_mutation, state) => {
    const stateIdentity = state.sessionStatus === 'authenticated' && state.tenantId && state.userId
      ? { tenantId: state.tenantId, userId: String(state.userId) }
      : undefined
    if (cancelIdentity && (!stateIdentity || !sameIdentity(cancelIdentity, stateIdentity))) {
      cancelController?.abort()
    }
    if (downloadIdentity && (!stateIdentity || !sameIdentity(downloadIdentity, stateIdentity))) {
      downloadController?.abort()
    }
  }, { flush: 'sync' })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      cancelController?.abort()
      downloadController?.abort()
      unsubscribeUser()
    })
  }

  return { cancelJob, cancellingJobId, downloadJob, downloadingJobId }
}

/**
 * 全局协调器只读取活跃任务详情，四个并发槽位限制单轮压力；列表本身不轮询。
 * 初次读取只建立状态基线，只有本会话观察到的活跃到终态转换才会回调。
 */
export function useExportJobTracker(options: ExportJobTrackerOptions = {}) {
  const enabled = options.enabled ?? true
  const list = useExportJobList(enabled)
  const actions = useExportJobActions()
  const activeCount = ref(0)
  const previousJobs = new Map<string, ExportJob>()
  let baselineEstablished = false
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined
  let cycleController: AbortController | undefined
  const channelControllers = new Set<AbortController>()
  let running = false
  let trackedIdentity = currentIdentity()

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
      if (!sameIdentity(identity, currentIdentity() ?? { tenantId: '', userId: '' })) return
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
          if (!sameIdentity(identity, currentIdentity() ?? { tenantId: '', userId: '' })) return
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
    if (!running || document.visibilityState === 'hidden' || !shouldEnable(enabled)) return
    const identity = currentIdentity()
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
    if (!running || !shouldEnable(enabled) || activeCount.value === 0) return
    timer = globalThis.setTimeout(async () => {
      timer = undefined
      cycleController?.abort()
      cycleController = new AbortController()
      await refreshActiveDetails()
      scheduleNextCycle()
    }, immediate ? 0 : ACTIVE_REFRESH_INTERVAL_MS)
  }

  async function refresh(): Promise<void> {
    await list.refresh()
    const identity = currentIdentity()
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
    const identity = currentIdentity()
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
    const identity = currentIdentity()
    if (!identity) return
    const expected = exportJobListQueryKey(identity.tenantId, identity.userId)
    if (JSON.stringify(event.query.queryKey) === JSON.stringify(expected)) {
      reconcileList(identity)
    }
  })
  const unsubscribeChannel = subscribeExportJobEvents((event) => {
    const identity = currentIdentity()
    if (!identity || !sameIdentity(identity, event)) return
    const controller = new AbortController()
    channelControllers.add(controller)
    void getExportJob(event.jobId, controller.signal)
      .then((response) => {
        const latestIdentity = currentIdentity()
        if (!latestIdentity || !sameIdentity(identity, latestIdentity)) return
        mergeExportJob(queryClient, identity, requireOperationData(response))
      })
      .catch((error: unknown) => {
        const latestIdentity = currentIdentity()
        if (!latestIdentity || !sameIdentity(identity, latestIdentity)) return
        if (error instanceof HttpError && (error.status === 403 || error.status === 404)) {
          removeExportJob(queryClient, identity, event.jobId)
        }
      })
      .finally(() => channelControllers.delete(controller))
  })
  const unsubscribeUser = useUserStore().$subscribe(() => {
    const nextIdentity = currentIdentity()
    if (
      trackedIdentity
      && nextIdentity
      && sameIdentity(trackedIdentity, nextIdentity)
    ) return
    if (!trackedIdentity && !nextIdentity) return
    trackedIdentity = nextIdentity
    stopTracking()
    baselineEstablished = false
    previousJobs.clear()
    activeCount.value = 0
    if (!shouldEnable(enabled) || !nextIdentity) return
    void refresh()
      .catch(() => undefined)
      .finally(() => {
        const latestIdentity = currentIdentity()
        if (latestIdentity && sameIdentity(latestIdentity, nextIdentity)) startTracking()
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
    refresh,
    startTracking,
    stopTracking,
    ...actions,
  }
}
