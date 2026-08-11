import type { EChartsCoreOption } from 'echarts/core'
import type {
  MonitorOverview,
  MonitorOverviewTrendBucket,
} from '@/api/modules/monitor'
import { getApplicationLocale } from '@/i18n'

type Translate = (key: string, values?: Record<string, unknown>) => string

interface ChartTheme {
  dark: boolean
  primary: string
}

function axisColor(theme: ChartTheme): string {
  return theme.dark ? '#A8ABB2' : '#606266'
}

function splitColor(theme: ChartTheme): string {
  return theme.dark ? '#3A3A3A' : '#E5E7EB'
}

function timeLabels(buckets: MonitorOverviewTrendBucket[]): string[] {
  const formatter = new Intl.DateTimeFormat(getApplicationLocale(), {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return buckets.map(bucket => formatter.format(Date.parse(bucket.started_at)))
}

function baseCartesian(theme: ChartTheme, labels: string[]): EChartsCoreOption {
  return {
    animationDuration: 250,
    grid: { left: 44, right: 20, top: 48, bottom: 42, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { top: 4, textStyle: { color: axisColor(theme) } },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: true,
      axisLabel: { color: axisColor(theme), hideOverlap: true },
      axisLine: { lineStyle: { color: splitColor(theme) } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: axisColor(theme) },
      splitLine: { lineStyle: { color: splitColor(theme) } },
    },
  }
}

export function activityChartOption(
  buckets: MonitorOverviewTrendBucket[],
  t: Translate,
  theme: ChartTheme,
): EChartsCoreOption {
  return {
    ...baseCartesian(theme, timeLabels(buckets)),
    aria: { enabled: true, description: t('monitor.overview.chartAriaActivity') },
    xAxis: { ...(baseCartesian(theme, timeLabels(buckets)).xAxis as object), boundaryGap: false },
    series: [
      {
        name: t('monitor.overview.jobsCreated'),
        type: 'line',
        data: buckets.map(bucket => bucket.background_jobs_created),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: theme.primary, width: 2 },
        itemStyle: { color: theme.primary },
      },
      {
        name: t('monitor.overview.loginTotal'),
        type: 'line',
        data: buckets.map(bucket => bucket.login_success + bucket.login_failure),
        symbol: 'rect',
        symbolSize: 6,
        lineStyle: { color: '#D97706', type: 'dashed', width: 2 },
        itemStyle: { color: '#D97706' },
      },
      {
        name: t('monitor.overview.operationTotal'),
        type: 'line',
        data: buckets.map(bucket => bucket.operation_success + bucket.operation_failure),
        symbol: 'diamond',
        symbolSize: 7,
        lineStyle: { color: '#708238', type: 'dotted', width: 2 },
        itemStyle: { color: '#708238' },
      },
    ],
  }
}

export function jobsChartOption(
  overview: MonitorOverview,
  t: Translate,
  theme: ChartTheme,
): EChartsCoreOption {
  return {
    animationDuration: 250,
    aria: { enabled: true, description: t('monitor.overview.chartAriaJobs') },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: axisColor(theme) } },
    color: [theme.primary, '#D97706', '#708238', '#BE185D'],
    series: [{
      type: 'pie',
      radius: ['48%', '72%'],
      center: ['50%', '43%'],
      avoidLabelOverlap: true,
      label: { formatter: '{b}: {c}', color: axisColor(theme) },
      data: [
        { name: t('monitor.overview.pending'), value: overview.jobs.pending },
        { name: t('monitor.overview.running'), value: overview.jobs.running },
        { name: t('monitor.overview.succeeded'), value: overview.jobs.succeeded },
        { name: t('monitor.overview.dead'), value: overview.jobs.dead },
      ],
    }],
  }
}

export function scheduleChartOption(
  buckets: MonitorOverviewTrendBucket[],
  t: Translate,
  theme: ChartTheme,
): EChartsCoreOption {
  return {
    ...baseCartesian(theme, timeLabels(buckets)),
    aria: { enabled: true, description: t('monitor.overview.chartAriaSchedules') },
    color: [theme.primary, '#D97706', '#708238', '#C2410C', '#BE185D'],
    series: [
      { name: t('monitor.overview.enqueued'), type: 'bar', stack: 'schedule', data: buckets.map(value => value.schedule_enqueued) },
      { name: t('monitor.overview.skippedMisfire'), type: 'bar', stack: 'schedule', data: buckets.map(value => value.schedule_skipped_misfire) },
      { name: t('monitor.overview.skippedConcurrency'), type: 'bar', stack: 'schedule', data: buckets.map(value => value.schedule_skipped_concurrency) },
      { name: t('monitor.overview.targetUnavailable'), type: 'bar', stack: 'schedule', data: buckets.map(value => value.schedule_target_unavailable) },
      { name: t('monitor.overview.invalidConfiguration'), type: 'bar', stack: 'schedule', data: buckets.map(value => value.schedule_invalid_configuration) },
    ],
  }
}

export function accessChartOption(
  buckets: MonitorOverviewTrendBucket[],
  t: Translate,
  theme: ChartTheme,
): EChartsCoreOption {
  return {
    ...baseCartesian(theme, timeLabels(buckets)),
    aria: { enabled: true, description: t('monitor.overview.chartAriaAccess') },
    color: [theme.primary, '#C2410C', '#708238', '#BE185D'],
    series: [
      { name: t('monitor.overview.loginSuccess'), type: 'bar', stack: 'login', data: buckets.map(value => value.login_success) },
      { name: t('monitor.overview.loginFailure'), type: 'bar', stack: 'login', data: buckets.map(value => value.login_failure) },
      { name: t('monitor.overview.operationSuccess'), type: 'bar', stack: 'operation', data: buckets.map(value => value.operation_success) },
      { name: t('monitor.overview.operationFailure'), type: 'bar', stack: 'operation', data: buckets.map(value => value.operation_failure) },
    ],
  }
}
