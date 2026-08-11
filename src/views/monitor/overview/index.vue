<template>
  <div class="page-container overview-page">
    <el-card shadow="never" class="overview-header-card">
      <div class="overview-header">
        <div>
          <h2>{{ t('monitor.overview.title') }}</h2>
          <p>{{ t('monitor.overview.subtitle') }}</p>
          <small v-if="snapshot">{{ t('monitor.overview.calculatedAt', { time: formatLocalizedDate(snapshot.calculated_at) }) }}</small>
        </div>
        <div class="overview-actions">
          <el-radio-group v-model="range" @change="handleRangeChange">
            <el-radio-button value="6h">{{ t('monitor.overview.range6h') }}</el-radio-button>
            <el-radio-button value="24h">{{ t('monitor.overview.range24h') }}</el-radio-button>
            <el-radio-button value="7d">{{ t('monitor.overview.range7d') }}</el-radio-button>
          </el-radio-group>
          <el-button icon="Refresh" :loading="snapshotLoading || trendsLoading" @click="manualRefresh">
            {{ t('monitor.overview.refresh') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-alert v-if="snapshotError" :title="snapshotError" type="error" show-icon :closable="false" class="overview-error" />
    <el-skeleton v-if="snapshotLoading && !snapshot" :rows="5" animated class="content-card" />

    <template v-if="snapshot">
      <section class="status-grid" :aria-label="t('monitor.overview.dependencies')">
        <article v-for="dependency in dependencyCards()" :key="dependency.key" class="status-card">
          <span>{{ dependency.label }}</span>
          <el-tag :type="dependencyTag(dependency.status)" effect="plain">{{ dependencyStatusLabel(dependency.status) }}</el-tag>
          <small>{{ dependency.detail || '—' }}</small>
        </article>
      </section>

      <section class="metric-grid" :aria-label="t('monitor.overview.runtime')">
        <article class="metric-card"><span>{{ t('monitor.overview.workerMode') }}</span><strong>{{ snapshot.jobs.mode }}</strong></article>
        <article class="metric-card"><span>{{ t('monitor.overview.scheduler') }}</span><strong>{{ snapshot.jobs.scheduler_enabled ? t('monitor.overview.schedulerEnabled') : t('monitor.overview.schedulerDisabled') }}</strong></article>
        <article class="metric-card"><span>{{ t('monitor.overview.cpu') }}</span><strong>{{ formatPercent(snapshot.system.cpu_usage) }}</strong></article>
        <article class="metric-card"><span>{{ t('monitor.overview.memory') }}</span><strong>{{ formatMemory() }}</strong></article>
        <article class="metric-card"><span>{{ t('monitor.overview.activeConnections') }}</span><strong>{{ snapshot.database_pool.active_connections ?? '—' }}</strong></article>
        <article class="metric-card"><span>{{ t('monitor.overview.enabledSchedules') }}</span><strong>{{ snapshot.jobs.enabled_schedules }}</strong></article>
        <article class="metric-card"><span>{{ t('monitor.overview.scheduleLag') }}</span><strong>{{ t('monitor.overview.seconds', { value: snapshot.jobs.schedule_lag_seconds.toFixed(2) }) }}</strong></article>
        <article class="metric-card"><span>{{ t('monitor.overview.total') }}</span><strong>{{ snapshot.jobs.total }}</strong></article>
      </section>

      <section class="chart-grid">
        <el-card shadow="never" class="chart-card chart-card--compact">
          <template #header><span>{{ t('monitor.overview.jobsComposition') }}</span></template>
          <EChartContainer
            ref="jobsChart"
            :chart-label="t('monitor.overview.chartAriaJobs')"
            min-height="300px"
            @restore="renderJobChart"
            @settings-change="renderJobChart"
          >
            <template #summary>{{ jobsSummary() }}</template>
          </EChartContainer>
        </el-card>

        <el-card shadow="never" class="chart-card chart-card--wide">
          <template #header>
            <div><span>{{ t('monitor.overview.activityTrend') }}</span><p>{{ t('monitor.overview.activityTrendHint') }}</p></div>
          </template>
          <el-alert v-if="trendsError" :title="trendsError" type="error" show-icon :closable="false" />
          <el-empty v-else-if="trends && !hasTrendData()" :description="t('monitor.overview.noTrendData')" />
          <EChartContainer
            v-else
            ref="activityChart"
            :chart-label="t('monitor.overview.chartAriaActivity')"
            @restore="renderTrendCharts"
            @settings-change="renderTrendCharts"
          >
            <template #summary>{{ activitySummary() }}</template>
          </EChartContainer>
        </el-card>
      </section>

      <section class="chart-grid chart-grid--equal">
        <el-card shadow="never" class="chart-card">
          <template #header><div><span>{{ t('monitor.overview.scheduleOutcomes') }}</span><p>{{ t('monitor.overview.scheduleOutcomesHint') }}</p></div></template>
          <el-empty v-if="trends && !hasScheduleData()" :description="t('monitor.overview.noTrendData')" />
          <EChartContainer
            v-else
            ref="scheduleChart"
            :chart-label="t('monitor.overview.chartAriaSchedules')"
            @restore="renderTrendCharts"
            @settings-change="renderTrendCharts"
          >
            <template #summary>{{ scheduleSummary() }}</template>
          </EChartContainer>
        </el-card>
        <el-card shadow="never" class="chart-card">
          <template #header><div><span>{{ t('monitor.overview.accessEvents') }}</span><p>{{ t('monitor.overview.accessEventsHint') }}</p></div></template>
          <el-empty v-if="trends && !hasAccessData()" :description="t('monitor.overview.noTrendData')" />
          <EChartContainer
            v-else
            ref="accessChart"
            :chart-label="t('monitor.overview.chartAriaAccess')"
            @restore="renderTrendCharts"
            @settings-change="renderTrendCharts"
          >
            <template #summary>{{ accessSummary() }}</template>
          </EChartContainer>
        </el-card>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EChartsCoreOption } from 'echarts/core'
import type { MonitorOverview, MonitorOverviewTrends, OverviewRange } from '@/api/modules/monitor'
import EChartContainer from '@/components/charts/EChartContainer.vue'
import { formatLocalizedDate, getApplicationLocale } from '@/i18n'
import { installPlatformOperationsMessages } from '@/i18n/catalog/platform-operations'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import {
  accessChartOption,
  activityChartOption,
  jobsChartOption,
  scheduleChartOption,
} from './chartOptions'
import { cancelOverviewRequests, fetchOverviewSnapshot, fetchOverviewTrends } from './data'

interface ChartHandle {
  clear: () => void
  resize: () => void
  setOption: (option: EChartsCoreOption) => void
}

installPlatformOperationsMessages()
const { t } = useI18n()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const range = ref<OverviewRange>('24h')
const snapshot = ref<MonitorOverview>()
const trends = ref<MonitorOverviewTrends>()
const snapshotLoading = ref(false)
const trendsLoading = ref(false)
const snapshotError = ref('')
const trendsError = ref('')
const jobsChart = ref<ChartHandle>()
const activityChart = ref<ChartHandle>()
const scheduleChart = ref<ChartHandle>()
const accessChart = ref<ChartHandle>()
let snapshotTimer: number | undefined
let trendsTimer: number | undefined
let initialized = false
let active = true

onMounted(start)
onActivated(start)
onDeactivated(stop)
onUnmounted(stop)

function start(): void {
  active = true
  if (!initialized) {
    initialized = true
    void Promise.all([loadSnapshot(false), loadTrends(false)]).then(scheduleRefresh)
    return
  }
  renderCharts()
  scheduleRefresh()
}

function stop(): void {
  active = false
  clearTimers()
  if (userStore.tenantId) void cancelOverviewRequests(userStore.tenantId)
}

function clearTimers(): void {
  if (snapshotTimer !== undefined) window.clearTimeout(snapshotTimer)
  if (trendsTimer !== undefined) window.clearTimeout(trendsTimer)
  snapshotTimer = undefined
  trendsTimer = undefined
}

function scheduleRefresh(): void {
  clearTimers()
  if (!active) return
  snapshotTimer = window.setTimeout(async () => {
    snapshotTimer = undefined
    await loadSnapshot(true)
    scheduleSnapshotRefresh()
  }, 30_000)
  trendsTimer = window.setTimeout(async () => {
    trendsTimer = undefined
    await loadTrends(true)
    scheduleTrendRefresh()
  }, 5 * 60_000)
}

function scheduleSnapshotRefresh(): void {
  if (!active) return
  snapshotTimer = window.setTimeout(async () => {
    snapshotTimer = undefined
    await loadSnapshot(true)
    scheduleSnapshotRefresh()
  }, 30_000)
}

function scheduleTrendRefresh(): void {
  if (!active) return
  trendsTimer = window.setTimeout(async () => {
    trendsTimer = undefined
    await loadTrends(true)
    scheduleTrendRefresh()
  }, 5 * 60_000)
}

async function loadSnapshot(force: boolean): Promise<void> {
  if (!userStore.tenantId || snapshotLoading.value) return
  snapshotLoading.value = true
  snapshotError.value = ''
  try {
    snapshot.value = await fetchOverviewSnapshot(userStore.tenantId, force)
    await nextTick()
    renderJobChart()
  }
  catch (error) {
    snapshotError.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    snapshotLoading.value = false
  }
}

async function loadTrends(force: boolean): Promise<void> {
  if (!userStore.tenantId || trendsLoading.value) return
  trendsLoading.value = true
  trendsError.value = ''
  try {
    trends.value = await fetchOverviewTrends(userStore.tenantId, range.value, force)
    await nextTick()
    renderTrendCharts()
  }
  catch (error) {
    trendsError.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    trendsLoading.value = false
  }
}

async function manualRefresh(): Promise<void> {
  if (snapshotLoading.value || trendsLoading.value) return
  await Promise.all([loadSnapshot(true), loadTrends(true)])
  scheduleRefresh()
}

function handleRangeChange(): void {
  trends.value = undefined
  void loadTrends(true).then(scheduleRefresh)
}

function chartTheme() {
  return { dark: settingsStore.theme === 'dark', primary: settingsStore.themeColor }
}

function renderCharts(): void {
  renderJobChart()
  renderTrendCharts()
}

function renderJobChart(): void {
  if (!snapshot.value) return
  jobsChart.value?.setOption(jobsChartOption(snapshot.value, t, chartTheme()))
}

function renderTrendCharts(): void {
  const buckets = trends.value?.buckets
  if (!buckets) return
  const theme = chartTheme()
  activityChart.value?.setOption(activityChartOption(buckets, t, theme))
  scheduleChart.value?.setOption(scheduleChartOption(buckets, t, theme))
  accessChart.value?.setOption(accessChartOption(buckets, t, theme))
}

function dependencyCards() {
  if (!snapshot.value) return []
  return [
    { key: 'database', label: t('monitor.overview.database'), ...snapshot.value.dependencies.database },
    { key: 'redis', label: t('monitor.overview.redis'), ...snapshot.value.dependencies.redis },
    { key: 'object_storage', label: t('monitor.overview.objectStorage'), ...snapshot.value.dependencies.object_storage },
    { key: 'messaging', label: t('monitor.overview.messaging'), ...snapshot.value.dependencies.messaging },
  ]
}

function dependencyStatusLabel(status: string): string {
  const key = { up: 'statusHealthy', healthy: 'statusHealthy', degraded: 'statusDegraded', disabled: 'statusDisabled', down: 'statusUnavailable', unavailable: 'statusUnavailable' }[status] ?? 'statusUnknown'
  return t(`monitor.overview.${key}`)
}

function dependencyTag(status: string): 'danger' | 'info' | 'success' | 'warning' {
  if (status === 'up' || status === 'healthy') return 'success'
  if (status === 'degraded') return 'warning'
  if (status === 'disabled') return 'info'
  return 'danger'
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat(getApplicationLocale(), { style: 'percent', maximumFractionDigits: 1 }).format(value / 100)
}

function formatMemory(): string {
  if (!snapshot.value) return '—'
  return `${snapshot.value.system.used_memory_gb.toFixed(2)} / ${snapshot.value.system.total_memory_gb.toFixed(2)} GiB`
}

function sum(selector: (bucket: MonitorOverviewTrends['buckets'][number]) => number): number {
  return (trends.value?.buckets ?? []).reduce((total, bucket) => total + selector(bucket), 0)
}

function hasTrendData(): boolean {
  return sum(bucket => bucket.background_jobs_created + bucket.login_success + bucket.login_failure + bucket.operation_success + bucket.operation_failure) > 0
}

function hasScheduleData(): boolean {
  return sum(bucket => bucket.schedule_enqueued + bucket.schedule_skipped_misfire + bucket.schedule_skipped_concurrency + bucket.schedule_target_unavailable + bucket.schedule_invalid_configuration) > 0
}

function hasAccessData(): boolean {
  return sum(bucket => bucket.login_success + bucket.login_failure + bucket.operation_success + bucket.operation_failure) > 0
}

function jobsSummary(): string {
  if (!snapshot.value) return ''
  const jobs = snapshot.value.jobs
  return `${t('monitor.overview.pending')} ${jobs.pending}；${t('monitor.overview.running')} ${jobs.running}；${t('monitor.overview.succeeded')} ${jobs.succeeded}；${t('monitor.overview.dead')} ${jobs.dead}`
}

function activitySummary(): string {
  return `${t('monitor.overview.jobsCreated')} ${sum(bucket => bucket.background_jobs_created)}；${t('monitor.overview.loginTotal')} ${sum(bucket => bucket.login_success + bucket.login_failure)}；${t('monitor.overview.operationTotal')} ${sum(bucket => bucket.operation_success + bucket.operation_failure)}`
}

function scheduleSummary(): string {
  return `${t('monitor.overview.enqueued')} ${sum(bucket => bucket.schedule_enqueued)}；${t('monitor.overview.skippedMisfire')} ${sum(bucket => bucket.schedule_skipped_misfire)}；${t('monitor.overview.skippedConcurrency')} ${sum(bucket => bucket.schedule_skipped_concurrency)}`
}

function accessSummary(): string {
  return `${t('monitor.overview.loginSuccess')} ${sum(bucket => bucket.login_success)}；${t('monitor.overview.loginFailure')} ${sum(bucket => bucket.login_failure)}；${t('monitor.overview.operationSuccess')} ${sum(bucket => bucket.operation_success)}；${t('monitor.overview.operationFailure')} ${sum(bucket => bucket.operation_failure)}`
}
</script>

<style scoped lang="scss">
.overview-page {
  min-width: 0;
}

.overview-header-card,
.overview-error,
.content-card,
.status-grid,
.metric-grid,
.chart-grid {
  margin-bottom: 12px;
}

.overview-header,
.overview-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.overview-header h2,
.overview-header p {
  margin: 0;
}

.overview-header p,
.overview-header small,
.chart-card :deep(.el-card__header p) {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.overview-header p {
  margin-top: 5px;
}

.overview-header small {
  display: block;
  margin-top: 6px;
}

.overview-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-grid,
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.status-card,
.metric-card {
  display: flex;
  min-width: 0;
  min-height: 94px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 7px;
  padding: 14px;
  border: 1px solid var(--border-color-base);
  border-radius: 6px;
  background: var(--bg-color);
}

.status-card > span,
.metric-card > span,
.status-card small {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.status-card small {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-card strong {
  font-size: 20px;
  overflow-wrap: anywhere;
}

.chart-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.8fr) minmax(0, 2.2fr);
  gap: 12px;
}

.chart-grid--equal {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chart-card {
  min-width: 0;
}

.chart-card :deep(.el-card__header p) {
  margin: 4px 0 0;
  font-weight: 400;
}

@media (width <= 1100px) {
  .status-grid,
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid,
  .chart-grid--equal {
    grid-template-columns: 1fr;
  }
}

@media (width <= 720px) {
  .overview-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .overview-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .overview-actions :deep(.el-radio-group) {
    max-width: 100%;
    overflow-x: auto;
  }
}

@media (width <= 480px) {
  .status-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
