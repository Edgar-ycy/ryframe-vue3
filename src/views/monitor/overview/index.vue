<template>
  <div class="page-container overview-page">
    <el-card shadow="never" class="overview-header-card">
      <div class="overview-header">
        <div>
          <h2>{{ t('monitor.overview.title') }}</h2>
          <p>{{ t('monitor.overview.subtitle') }}</p>
          <small v-if="snapshot">{{
            t('monitor.overview.calculatedAt', {
              time: formatLocalizedDate(snapshot.calculated_at),
            })
          }}</small>
        </div>
        <div class="overview-actions">
          <el-radio-group v-model="range" @change="handleRangeChange">
            <el-radio-button value="6h">{{ t('monitor.overview.range6h') }}</el-radio-button>
            <el-radio-button value="24h">{{ t('monitor.overview.range24h') }}</el-radio-button>
            <el-radio-button value="7d">{{ t('monitor.overview.range7d') }}</el-radio-button>
          </el-radio-group>
          <el-button
            icon="Refresh"
            :loading="snapshotLoading || trendsLoading"
            @click="manualRefresh"
          >
            {{ t('monitor.overview.refresh') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-alert
      v-if="snapshotError"
      :title="snapshotError"
      type="error"
      show-icon
      :closable="false"
      class="overview-error"
    />
    <el-skeleton v-if="snapshotLoading && !snapshot" :rows="5" animated class="content-card" />

    <template v-if="snapshot">
      <section class="status-grid" :aria-label="t('monitor.overview.dependencies')">
        <article v-for="dependency in dependencyCards()" :key="dependency.key" class="status-card">
          <span>{{ dependency.label }}</span>
          <el-tag :type="dependencyTag(dependency.status)" effect="plain">{{
            dependencyStatusLabel(dependency.status)
          }}</el-tag>
          <small>{{ dependency.detail || '—' }}</small>
        </article>
      </section>

      <section class="metric-grid" :aria-label="t('monitor.overview.runtime')">
        <article class="metric-card">
          <span>{{ t('monitor.overview.workerMode') }}</span
          ><strong>{{ snapshot.jobs.mode }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ t('monitor.overview.scheduler') }}</span
          ><strong>{{
            snapshot.jobs.scheduler_enabled
              ? t('monitor.overview.schedulerEnabled')
              : t('monitor.overview.schedulerDisabled')
          }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ t('monitor.overview.cpu') }}</span
          ><strong>{{ formatPercent(snapshot.system.cpu_usage) }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ t('monitor.overview.memory') }}</span
          ><strong>{{ formatMemory() }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ t('monitor.overview.activeConnections') }}</span
          ><strong>{{ snapshot.database_pool.active_connections ?? '—' }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ t('monitor.overview.enabledSchedules') }}</span
          ><strong>{{ snapshot.jobs.enabled_schedules }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ t('monitor.overview.scheduleLag') }}</span
          ><strong>{{
            t('monitor.overview.seconds', { value: snapshot.jobs.schedule_lag_seconds.toFixed(2) })
          }}</strong>
        </article>
        <article class="metric-card">
          <span>{{ t('monitor.overview.total') }}</span
          ><strong>{{ snapshot.jobs.total }}</strong>
        </article>
      </section>

      <section class="chart-grid">
        <el-card shadow="never" class="chart-card chart-card--compact">
          <template #header
            ><span>{{ t('monitor.overview.jobsComposition') }}</span></template
          >
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
            <div>
              <span>{{ t('monitor.overview.activityTrend') }}</span>
              <p>{{ t('monitor.overview.activityTrendHint') }}</p>
            </div>
          </template>
          <el-alert
            v-if="trendsError"
            :title="trendsError"
            type="error"
            show-icon
            :closable="false"
          />
          <el-empty
            v-else-if="trends && !hasTrendData()"
            :description="t('monitor.overview.noTrendData')"
          />
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
          <template #header
            ><div>
              <span>{{ t('monitor.overview.scheduleOutcomes') }}</span>
              <p>{{ t('monitor.overview.scheduleOutcomesHint') }}</p>
            </div></template
          >
          <el-empty
            v-if="trends && !hasScheduleData()"
            :description="t('monitor.overview.noTrendData')"
          />
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
          <template #header
            ><div>
              <span>{{ t('monitor.overview.accessEvents') }}</span>
              <p>{{ t('monitor.overview.accessEventsHint') }}</p>
            </div></template
          >
          <el-empty
            v-if="trends && !hasAccessData()"
            :description="t('monitor.overview.noTrendData')"
          />
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
import { useI18n } from 'vue-i18n'
import type { EChartsCoreOption } from 'echarts/core'
import type { MonitorOverview, MonitorOverviewTrends, OverviewRange } from '@/api/modules/monitor'
import EChartContainer from '@/components/charts/EChartContainer.vue'
import { formatLocalizedDate, getApplicationLocale } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import {
  accessChartOption,
  activityChartOption,
  jobsChartOption,
  scheduleChartOption,
} from './chartOptions'
import { cancelOverviewRequests, fetchOverviewSnapshot, fetchOverviewTrends } from './data'
import {
  dependencyStatusTranslationKey,
  dependencyTag,
  formatOverviewMemory,
  formatOverviewPercent,
  hasOverviewAccessData,
  hasOverviewScheduleData,
  hasOverviewTrendData,
  overviewAccessSummary,
  overviewActivitySummary,
  overviewDependencyCards,
  overviewJobsSummary,
  overviewScheduleSummary,
} from './overviewPresentation'
import { useOverviewRefreshSchedule } from './useOverviewRefreshSchedule'

interface ChartHandle {
  clear: () => void
  resize: () => void
  setOption: (option: EChartsCoreOption) => void
}

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

async function loadSnapshot(force: boolean): Promise<void> {
  if (!userStore.tenantId || snapshotLoading.value) return
  snapshotLoading.value = true
  snapshotError.value = ''
  try {
    snapshot.value = await fetchOverviewSnapshot(force)
    await nextTick()
    renderCharts()
  } catch (error) {
    snapshotError.value = error instanceof Error ? error.message : String(error)
  } finally {
    snapshotLoading.value = false
  }
}

async function loadTrends(force: boolean): Promise<void> {
  if (!userStore.tenantId || trendsLoading.value) return
  trendsLoading.value = true
  trendsError.value = ''
  try {
    trends.value = await fetchOverviewTrends(range.value, force)
    await nextTick()
    renderTrendCharts()
  } catch (error) {
    trendsError.value = error instanceof Error ? error.message : String(error)
  } finally {
    trendsLoading.value = false
  }
}

const { scheduleRefresh } = useOverviewRefreshSchedule({
  loadSnapshot,
  loadTrends,
  onResume: renderCharts,
  onStop: () => {
    void cancelOverviewRequests()
  },
})

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
  return overviewDependencyCards(snapshot.value).map((card) => ({
    ...card,
    label: t(card.labelKey),
  }))
}

function dependencyStatusLabel(status: string): string {
  return t(`monitor.overview.${dependencyStatusTranslationKey(status)}`)
}

function formatPercent(value: number): string {
  return formatOverviewPercent(value, getApplicationLocale())
}

function formatMemory(): string {
  return formatOverviewMemory(snapshot.value)
}

function hasTrendData(): boolean {
  return hasOverviewTrendData(trends.value?.buckets)
}

function hasScheduleData(): boolean {
  return hasOverviewScheduleData(trends.value?.buckets)
}

function hasAccessData(): boolean {
  return hasOverviewAccessData(trends.value?.buckets)
}

function jobsSummary(): string {
  return overviewJobsSummary(snapshot.value, t)
}

function activitySummary(): string {
  return overviewActivitySummary(trends.value?.buckets, t)
}

function scheduleSummary(): string {
  return overviewScheduleSummary(trends.value?.buckets, t)
}

function accessSummary(): string {
  return overviewAccessSummary(trends.value?.buckets, t)
}
</script>

<style scoped lang="scss" src="./overview.scss"></style>
