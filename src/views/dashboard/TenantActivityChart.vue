<template>
  <section class="activity-panel" :aria-label="t('dashboard.activityTitle')">
    <div class="activity-header">
      <div>
        <h2>{{ t('dashboard.activityTitle') }}</h2>
        <p>{{ t('dashboard.activityHint') }}</p>
      </div>
      <el-button type="primary" link icon="ArrowRight" @click="openOverview">
        {{ t('dashboard.viewOverview') }}
      </el-button>
    </div>
    <el-alert
      v-if="error"
      :title="t('dashboard.activityError')"
      type="warning"
      show-icon
      :closable="false"
    />
    <el-skeleton v-else-if="loading && !trends" :rows="4" animated />
    <el-empty v-else-if="trends && !hasData()" :description="t('monitor.overview.noTrendData')" />
    <EChartContainer
      v-else
      ref="chart"
      :chart-label="t('monitor.overview.chartAriaActivity')"
      min-height="280px"
      @restore="renderChart"
      @settings-change="renderChart"
    >
      <template #summary>{{ summary() }}</template>
    </EChartContainer>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EChartsCoreOption } from 'echarts/core'
import type { MonitorOverviewTrends } from '@/api/modules/monitor'
import EChartContainer from '@/components/charts/EChartContainer.vue'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { activityChartOption } from '@/views/monitor/overview/chartOptions'
import { cancelOverviewTrendRequests, fetchOverviewTrends } from '@/views/monitor/overview/data'

interface ChartHandle {
  setOption: (option: EChartsCoreOption) => void
}

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const trends = ref<MonitorOverviewTrends>()
const loading = ref(false)
const error = ref('')
const chart = ref<ChartHandle>()
let timer: number | undefined
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
    void load(false).then(scheduleRefresh)
    return
  }
  renderChart()
  scheduleRefresh()
}

function stop(): void {
  active = false
  clearTimer()
  void cancelOverviewTrendRequests()
}

function clearTimer(): void {
  if (timer !== undefined) window.clearTimeout(timer)
  timer = undefined
}

function scheduleRefresh(): void {
  clearTimer()
  if (!active) return
  timer = window.setTimeout(async () => {
    timer = undefined
    await load(true)
    scheduleRefresh()
  }, 5 * 60_000)
}

async function load(force: boolean): Promise<void> {
  if (!userStore.tenantId || loading.value) return
  loading.value = true
  error.value = ''
  try {
    trends.value = await fetchOverviewTrends('24h', force)
    await nextTick()
    renderChart()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : String(reason)
  } finally {
    loading.value = false
  }
}

function renderChart(): void {
  if (!trends.value) return
  chart.value?.setOption(
    activityChartOption(trends.value.buckets, t, {
      dark: settingsStore.theme === 'dark',
      primary: settingsStore.themeColor,
    }),
  )
}

function sum(selector: (bucket: MonitorOverviewTrends['buckets'][number]) => number): number {
  return (trends.value?.buckets ?? []).reduce((total, bucket) => total + selector(bucket), 0)
}

function hasData(): boolean {
  return (
    sum(
      (bucket) =>
        bucket.background_jobs_created +
        bucket.login_success +
        bucket.login_failure +
        bucket.operation_success +
        bucket.operation_failure,
    ) > 0
  )
}

function summary(): string {
  return `${t('monitor.overview.jobsCreated')} ${sum((bucket) => bucket.background_jobs_created)}；${t('monitor.overview.loginTotal')} ${sum((bucket) => bucket.login_success + bucket.login_failure)}；${t('monitor.overview.operationTotal')} ${sum((bucket) => bucket.operation_success + bucket.operation_failure)}`
}

function openOverview(): void {
  void router.push('/monitor/overview')
}
</script>

<style scoped>
.activity-panel {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 0;
  border-bottom: 1px solid var(--border-color-base);
}

.activity-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.activity-header h2,
.activity-header p {
  margin: 0;
}

.activity-header p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

@media (width <= 640px) {
  .activity-header {
    flex-direction: column;
  }
}
</style>
