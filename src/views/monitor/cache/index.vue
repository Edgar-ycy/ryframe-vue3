<template>
  <div v-loading="loading && !cacheSnapshot?.info" class="page-container monitor-page">
    <el-alert
      v-if="error?.message"
      :title="error?.message ?? ''"
      type="error"
      show-icon
      :closable="false"
      class="monitor-page__alert"
    />
    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--compact">
          <div class="monitor-metric-header">
            <el-icon><Coin /></el-icon>
            <span>{{ t('monitor.cache.cacheMode') }}</span>
          </div>
          <div class="monitor-metric-value">{{ cacheSnapshot?.info?.mode || '—' }}</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--compact">
          <div class="monitor-metric-header">
            <el-icon><CircleCheck /></el-icon>
            <span>{{ t('monitor.cache.serviceStatus') }}</span>
          </div>
          <el-tag :type="cacheStatusType" size="large">
            {{ cacheStatusText }}
          </el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--compact">
          <div class="monitor-metric-header">
            <el-icon><Key /></el-icon>
            <span>{{ t('monitor.cache.totalKeys') }}</span>
          </div>
          <div class="monitor-metric-value">{{ cacheSnapshot?.info?.keys.total_keys ?? '—' }}</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--compact">
          <div class="monitor-metric-header">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ t('monitor.cache.usedMemory') }}</span>
          </div>
          <div class="monitor-metric-value monitor-metric-value--compact">
            {{ cacheSnapshot?.info?.memory?.used_memory_human || '—' }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="monitor-section-card">
          <template #header>
            <div class="card-header">
              <span>{{ t('monitor.cache.redisInfo') }}</span>
              <el-button
                v-perm="'monitor:cache:list'"
                :loading="loading"
                icon="Refresh"
                @click="fetchData"
                >{{ t('monitor.cache.refresh') }}</el-button
              >
            </div>
          </template>

          <el-descriptions :column="1" border size="small">
            <el-descriptions-item :label="t('monitor.cache.version')">{{
              cacheSnapshot?.info?.server?.version || '—'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.runtimeMode')">{{
              cacheSnapshot?.info?.server?.mode || cacheSnapshot?.info?.mode || '—'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.operatingSystem')">{{
              cacheSnapshot?.info?.server?.os || '—'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.uptimeDays')">{{
              cacheSnapshot?.info?.server?.uptime_days ?? '—'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.clientConnections')">{{
              cacheSnapshot?.info?.server?.connected_clients ?? '—'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.peakMemory')">{{
              cacheSnapshot?.info?.memory?.used_memory_peak_human || '—'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.memoryFragmentationRatio')">{{
              formatRatio(cacheSnapshot?.info?.memory?.mem_fragmentation_ratio)
            }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="monitor-section-card">
          <template #header
            ><span>{{ t('monitor.cache.keyStatistics') }}</span></template
          >
          <el-table v-loading="loading" :data="keyRows" border stripe>
            <el-table-column prop="label" :label="t('monitor.cache.category')" min-width="160" />
            <el-table-column
              prop="count"
              :label="t('monitor.cache.count')"
              width="120"
              align="right"
            />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="monitor-section-card">
      <template #header
        ><span>{{ t('monitor.cache.commandStatistics') }}</span></template
      >
      <el-empty
        v-if="commandStatus !== 'available'"
        :description="commandStatusDescription"
        :image-size="88"
      />
      <el-table
        v-else
        v-loading="loading"
        :data="commandRows"
        :empty-text="t('common.noData')"
        border
        stripe
      >
        <el-table-column prop="command" :label="t('monitor.cache.command')" width="180" />
        <el-table-column
          prop="stats"
          :label="t('monitor.cache.statistics')"
          min-width="360"
          show-overflow-tooltip
        />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { CircleCheck, Coin, Key, TrendCharts } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import {
  getCacheCommands,
  getCacheInfo,
  type CacheCommandStats,
  type CacheInfo,
} from '@/api/modules/monitor'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const userStore = useUserStore()
const pageActive = ref(true)

interface CacheSnapshot {
  commands: CacheCommandStats | null
  info: CacheInfo | null
}

const cacheQuery = useServerStateQuery<CacheSnapshot>(
  () => userStore.sessionStatus === 'authenticated' && pageActive.value,
  'monitor-cache',
  () => ({ scope: 'overview' }),
  async (signal) => {
    const [infoResponse, commandsResponse] = await Promise.all([
      getCacheInfo(signal),
      getCacheCommands(signal),
    ])
    return {
      commands: commandsResponse.data ?? null,
      info: infoResponse.data ?? null,
    }
  },
)

const loading = cacheQuery.isFetching
const cacheSnapshot = cacheQuery.data
const error = cacheQuery.error
const cacheStatusType = computed(() => {
  const cacheInfo = cacheSnapshot.value?.info
  if (!cacheInfo) return 'info'
  return cacheInfo.available ? 'success' : 'danger'
})
const cacheStatusText = computed(() => {
  const cacheInfo = cacheSnapshot.value?.info
  if (!cacheInfo) return '—'
  return cacheInfo.available ? t('monitor.cache.available') : t('monitor.cache.unavailable')
})

const keyRows = computed(() => {
  const keys = cacheSnapshot.value?.info?.keys
  return [
    { label: t('monitor.cache.allKeys'), count: keys?.total_keys ?? '—' },
    { label: t('monitor.cache.onlineUserSessions'), count: keys?.online_users ?? '—' },
    { label: t('monitor.cache.captchas'), count: keys?.captchas ?? '—' },
    { label: t('monitor.cache.rateLimitCounters'), count: keys?.rate_limits ?? '—' },
    { label: t('monitor.cache.dictionaryCache'), count: keys?.dict_cache ?? '—' },
    { label: t('monitor.cache.configurationCache'), count: keys?.config_cache ?? '—' },
  ]
})

const commandRows = computed(() => {
  return Object.entries(cacheSnapshot.value?.commands?.commands ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([command, stats]) => ({ command, stats }))
})

const commandStatus = computed(() => cacheSnapshot.value?.commands?.status ?? 'unavailable')
const commandStatusDescription = computed(() =>
  commandStatus.value === 'not_configured'
    ? t('monitor.cache.commandStatsNotConfigured')
    : t('monitor.cache.commandStatsUnavailable'),
)

function formatRatio(value?: number | null) {
  if (value === null || value === undefined) return '—'
  return value.toFixed(2)
}

async function fetchData(): Promise<void> {
  await cacheQuery.refetch({ throwOnError: true })
}

useKeepAlivePageActive(pageActive, () => cacheQuery.refetch())
</script>
