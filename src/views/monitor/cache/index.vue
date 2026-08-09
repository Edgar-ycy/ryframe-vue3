<template>
  <div v-loading="loading && !cacheInfo" class="page-container monitor-page">
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="monitor-page__alert" />
    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--compact">
          <div class="monitor-metric-header">
            <el-icon><Coin /></el-icon>
            <span>{{ t('monitor.cache.cacheMode') }}</span>
          </div>
          <div class="monitor-metric-value">{{ cacheInfo?.mode || '—' }}</div>
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
          <div class="monitor-metric-value">{{ cacheInfo?.keys.total_keys ?? '—' }}</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--compact">
          <div class="monitor-metric-header">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ t('monitor.cache.usedMemory') }}</span>
          </div>
          <div class="monitor-metric-value monitor-metric-value--compact">{{ cacheInfo?.memory?.used_memory_human || '—' }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="monitor-section-card">
          <template #header>
            <div class="card-header">
              <span>{{ t('monitor.cache.redisInfo') }}</span>
              <el-button v-perm="'monitor:cache:list'" :loading="loading" icon="Refresh" @click="fetchData">{{ t('monitor.cache.refresh') }}</el-button>
            </div>
          </template>

          <el-descriptions :column="1" border size="small">
            <el-descriptions-item :label="t('monitor.cache.version')">{{ cacheInfo?.server?.version || '—' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.runtimeMode')">{{ cacheInfo?.server?.mode || cacheInfo?.mode || '—' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.operatingSystem')">{{ cacheInfo?.server?.os || '—' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.uptimeDays')">{{ cacheInfo?.server?.uptime_days ?? '—' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.clientConnections')">{{ cacheInfo?.server?.connected_clients ?? '—' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.peakMemory')">{{ cacheInfo?.memory?.used_memory_peak_human || '—' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.memoryFragmentationRatio')">{{ formatRatio(cacheInfo?.memory?.mem_fragmentation_ratio) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="monitor-section-card">
          <template #header><span>{{ t('monitor.cache.keyStatistics') }}</span></template>
          <el-table v-loading="loading" :data="keyRows" border stripe>
            <el-table-column prop="label" :label="t('monitor.cache.category')" min-width="160" />
            <el-table-column prop="count" :label="t('monitor.cache.count')" width="120" align="right" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="monitor-section-card">
      <template #header><span>{{ t('monitor.cache.commandStatistics') }}</span></template>
      <el-table v-loading="commandLoading" :data="commandRows" border stripe>
        <el-table-column prop="command" :label="t('monitor.cache.command')" width="180" />
        <el-table-column prop="stats" :label="t('monitor.cache.statistics')" min-width="360" show-overflow-tooltip />
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
  type CacheInfo,
} from '@/api/modules/monitor'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const userStore = useUserStore()
const pageActive = ref(true)

interface CacheSnapshot {
  commands: Record<string, string>
  info: CacheInfo | null
}

const cacheQuery = useTenantQuery<CacheSnapshot>(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated' && pageActive.value,
  'monitor-cache',
  () => ({ scope: 'overview' }),
  async signal => {
    const [infoResponse, commandsResponse] = await Promise.all([
      getCacheInfo(signal),
      getCacheCommands(signal),
    ])
    return {
      commands: commandsResponse.data ?? {},
      info: infoResponse.data ?? null,
    }
  },
)

const loading = computed(() => cacheQuery.isFetching.value)
const commandLoading = loading
const cacheInfo = computed(() => cacheQuery.data.value?.info ?? null)
const commandStats = computed(() => cacheQuery.data.value?.commands ?? {})
const errorMessage = computed(() => cacheQuery.error.value?.message ?? '')
const cacheStatusType = computed(() => {
  if (!cacheInfo.value) return 'info'
  return cacheInfo.value.available ? 'success' : 'danger'
})
const cacheStatusText = computed(() => {
  if (!cacheInfo.value) return '—'
  return cacheInfo.value.available ? t('monitor.cache.available') : t('monitor.cache.unavailable')
})

const keyRows = computed(() => {
  const keys = cacheInfo.value?.keys
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
  return Object.entries(commandStats.value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([command, stats]) => ({ command, stats }))
})

function formatRatio(value?: number | null) {
  if (value === null || value === undefined) return '—'
  return value.toFixed(2)
}

async function fetchData(): Promise<void> {
  await cacheQuery.refetch({ throwOnError: true })
}

onActivated(() => {
  if (pageActive.value) return
  pageActive.value = true
  void cacheQuery.refetch()
})

onDeactivated(() => {
  pageActive.value = false
})
</script>
