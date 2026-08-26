import type { TagProps } from 'element-plus'
import type { MonitorOverview, MonitorOverviewTrends } from '@/api/modules/monitor'

type TrendBucket = MonitorOverviewTrends['buckets'][number]
type Translate = (key: string) => string

export function dependencyStatusTranslationKey(status: string): string {
  return (
    {
      up: 'statusHealthy',
      healthy: 'statusHealthy',
      degraded: 'statusDegraded',
      disabled: 'statusDisabled',
      down: 'statusUnavailable',
      unavailable: 'statusUnavailable',
    }[status] ?? 'statusUnknown'
  )
}

export function dependencyTag(status: string): TagProps['type'] {
  if (status === 'up' || status === 'healthy') return 'success'
  if (status === 'degraded') return 'warning'
  if (status === 'disabled') return 'info'
  return 'danger'
}

export function formatOverviewPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export function formatOverviewMemory(snapshot: MonitorOverview | undefined): string {
  if (!snapshot) return '—'
  return `${snapshot.system.used_memory_gb.toFixed(2)} / ${snapshot.system.total_memory_gb.toFixed(2)} GiB`
}

export function sumOverviewBuckets(
  buckets: readonly TrendBucket[] | undefined,
  selector: (bucket: TrendBucket) => number,
): number {
  return (buckets ?? []).reduce((total, bucket) => total + selector(bucket), 0)
}

export function hasOverviewTrendData(buckets: readonly TrendBucket[] | undefined): boolean {
  return (
    sumOverviewBuckets(
      buckets,
      (bucket) =>
        bucket.background_jobs_created +
        bucket.login_success +
        bucket.login_failure +
        bucket.operation_success +
        bucket.operation_failure,
    ) > 0
  )
}

export function hasOverviewScheduleData(buckets: readonly TrendBucket[] | undefined): boolean {
  return (
    sumOverviewBuckets(
      buckets,
      (bucket) =>
        bucket.schedule_enqueued +
        bucket.schedule_skipped_misfire +
        bucket.schedule_skipped_concurrency +
        bucket.schedule_target_unavailable +
        bucket.schedule_invalid_configuration,
    ) > 0
  )
}

export function hasOverviewAccessData(buckets: readonly TrendBucket[] | undefined): boolean {
  return (
    sumOverviewBuckets(
      buckets,
      (bucket) =>
        bucket.login_success +
        bucket.login_failure +
        bucket.operation_success +
        bucket.operation_failure,
    ) > 0
  )
}

export function overviewDependencyCards(snapshot: MonitorOverview | undefined) {
  if (!snapshot) return []
  return [
    {
      key: 'database',
      labelKey: 'monitor.overview.database',
      ...snapshot.dependencies.database,
    },
    { key: 'redis', labelKey: 'monitor.overview.redis', ...snapshot.dependencies.redis },
    {
      key: 'object_storage',
      labelKey: 'monitor.overview.objectStorage',
      ...snapshot.dependencies.object_storage,
    },
    {
      key: 'messaging',
      labelKey: 'monitor.overview.messaging',
      ...snapshot.dependencies.messaging,
    },
  ]
}

function summary(values: readonly { key: string; value: number }[], translate: Translate): string {
  return values.map(({ key, value }) => `${translate(key)} ${value}`).join('；')
}

export function overviewJobsSummary(
  snapshot: MonitorOverview | undefined,
  translate: Translate,
): string {
  if (!snapshot) return ''
  const jobs = snapshot.jobs
  return summary(
    [
      { key: 'monitor.overview.pending', value: jobs.pending },
      { key: 'monitor.overview.running', value: jobs.running },
      { key: 'monitor.overview.succeeded', value: jobs.succeeded },
      { key: 'monitor.overview.dead', value: jobs.dead },
    ],
    translate,
  )
}

export function overviewActivitySummary(
  buckets: readonly TrendBucket[] | undefined,
  translate: Translate,
): string {
  return summary(
    [
      {
        key: 'monitor.overview.jobsCreated',
        value: sumOverviewBuckets(buckets, (bucket) => bucket.background_jobs_created),
      },
      {
        key: 'monitor.overview.loginTotal',
        value: sumOverviewBuckets(buckets, (bucket) => bucket.login_success + bucket.login_failure),
      },
      {
        key: 'monitor.overview.operationTotal',
        value: sumOverviewBuckets(
          buckets,
          (bucket) => bucket.operation_success + bucket.operation_failure,
        ),
      },
    ],
    translate,
  )
}

export function overviewScheduleSummary(
  buckets: readonly TrendBucket[] | undefined,
  translate: Translate,
): string {
  return summary(
    [
      {
        key: 'monitor.overview.enqueued',
        value: sumOverviewBuckets(buckets, (bucket) => bucket.schedule_enqueued),
      },
      {
        key: 'monitor.overview.skippedMisfire',
        value: sumOverviewBuckets(buckets, (bucket) => bucket.schedule_skipped_misfire),
      },
      {
        key: 'monitor.overview.skippedConcurrency',
        value: sumOverviewBuckets(buckets, (bucket) => bucket.schedule_skipped_concurrency),
      },
    ],
    translate,
  )
}

export function overviewAccessSummary(
  buckets: readonly TrendBucket[] | undefined,
  translate: Translate,
): string {
  return summary(
    [
      {
        key: 'monitor.overview.loginSuccess',
        value: sumOverviewBuckets(buckets, (bucket) => bucket.login_success),
      },
      {
        key: 'monitor.overview.loginFailure',
        value: sumOverviewBuckets(buckets, (bucket) => bucket.login_failure),
      },
      {
        key: 'monitor.overview.operationSuccess',
        value: sumOverviewBuckets(buckets, (bucket) => bucket.operation_success),
      },
      {
        key: 'monitor.overview.operationFailure',
        value: sumOverviewBuckets(buckets, (bucket) => bucket.operation_failure),
      },
    ],
    translate,
  )
}
