import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'

interface OverviewRefreshScheduleOptions {
  loadSnapshot: (force: boolean) => Promise<void>
  loadTrends: (force: boolean) => Promise<void>
  onResume: () => void
  onStop: () => void
}

export function useOverviewRefreshSchedule(options: OverviewRefreshScheduleOptions) {
  let snapshotTimer: number | undefined
  let trendsTimer: number | undefined
  let initialized = false
  let active = true

  function clearTimers(): void {
    if (snapshotTimer !== undefined) window.clearTimeout(snapshotTimer)
    if (trendsTimer !== undefined) window.clearTimeout(trendsTimer)
    snapshotTimer = undefined
    trendsTimer = undefined
  }

  function scheduleSnapshotRefresh(): void {
    if (!active) return
    snapshotTimer = window.setTimeout(async () => {
      snapshotTimer = undefined
      await options.loadSnapshot(true)
      scheduleSnapshotRefresh()
    }, 30_000)
  }

  function scheduleTrendRefresh(): void {
    if (!active) return
    trendsTimer = window.setTimeout(async () => {
      trendsTimer = undefined
      await options.loadTrends(true)
      scheduleTrendRefresh()
    }, 5 * 60_000)
  }

  function scheduleRefresh(): void {
    clearTimers()
    if (!active) return
    scheduleSnapshotRefresh()
    scheduleTrendRefresh()
  }

  function start(): void {
    active = true
    if (!initialized) {
      initialized = true
      void Promise.all([options.loadSnapshot(false), options.loadTrends(false)]).then(
        scheduleRefresh,
      )
      return
    }
    options.onResume()
    scheduleRefresh()
  }

  function stop(): void {
    active = false
    clearTimers()
    options.onStop()
  }

  onMounted(start)
  onActivated(start)
  onDeactivated(stop)
  onUnmounted(stop)

  return { scheduleRefresh }
}
