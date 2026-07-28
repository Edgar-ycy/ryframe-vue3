<template>
  <div class="cache-page">
    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Coin /></el-icon>
            <span>{{ t('monitor.cache.cacheMode') }}</span>
          </div>
          <div class="metric-value">{{ cacheInfo?.mode || '-' }}</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><CircleCheck /></el-icon>
            <span>{{ t('monitor.cache.serviceStatus') }}</span>
          </div>
          <el-tag :type="cacheInfo?.available ? 'success' : 'danger'" size="large">
            {{ cacheInfo?.available ? t('monitor.cache.available') : t('monitor.cache.unavailable') }}
          </el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Key /></el-icon>
            <span>{{ t('monitor.cache.totalKeys') }}</span>
          </div>
          <div class="metric-value">{{ cacheInfo?.keys.total_keys ?? 0 }}</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ t('monitor.cache.usedMemory') }}</span>
          </div>
          <div class="metric-value compact">{{ cacheInfo?.memory?.used_memory_human || '-' }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="card-header">
              <span>{{ t('monitor.cache.redisInfo') }}</span>
              <el-button v-perm="'monitor:cache:list'" :loading="loading" icon="Refresh" @click="fetchData">{{ t('monitor.cache.refresh') }}</el-button>
            </div>
          </template>

          <el-descriptions :column="1" border size="small">
            <el-descriptions-item :label="t('monitor.cache.version')">{{ cacheInfo?.server?.version || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.runtimeMode')">{{ cacheInfo?.server?.mode || cacheInfo?.mode || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.operatingSystem')">{{ cacheInfo?.server?.os || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.uptimeDays')">{{ cacheInfo?.server?.uptime_days ?? '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.clientConnections')">{{ cacheInfo?.server?.connected_clients ?? '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.peakMemory')">{{ cacheInfo?.memory?.used_memory_peak_human || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('monitor.cache.memoryFragmentationRatio')">{{ formatRatio(cacheInfo?.memory?.mem_fragmentation_ratio) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="section-card">
          <template #header><span>{{ t('monitor.cache.keyStatistics') }}</span></template>
          <el-table v-loading="loading" :data="keyRows" border stripe>
            <el-table-column prop="label" :label="t('monitor.cache.category')" min-width="160" />
            <el-table-column prop="count" :label="t('monitor.cache.count')" width="120" align="right" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="section-card">
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

const { t } = useI18n()
const loading = ref(false)
const commandLoading = ref(false)
const cacheInfo = ref<CacheInfo | null>(null)
const commandStats = ref<Record<string, string>>({})

const keyRows = computed(() => {
  const keys = cacheInfo.value?.keys
  return [
    { label: t('monitor.cache.allKeys'), count: keys?.total_keys ?? 0 },
    { label: t('monitor.cache.onlineUserSessions'), count: keys?.online_users ?? 0 },
    { label: t('monitor.cache.captchas'), count: keys?.captchas ?? 0 },
    { label: t('monitor.cache.rateLimitCounters'), count: keys?.rate_limits ?? 0 },
    { label: t('monitor.cache.dictionaryCache'), count: keys?.dict_cache ?? 0 },
    { label: t('monitor.cache.configurationCache'), count: keys?.config_cache ?? 0 },
  ]
})

const commandRows = computed(() => {
  return Object.entries(commandStats.value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([command, stats]) => ({ command, stats }))
})

function formatRatio(value?: number | null) {
  if (value === null || value === undefined) return '-'
  return value.toFixed(2)
}

async function fetchData() {
  loading.value = true
  commandLoading.value = true
  try {
    const [infoRes, commandsRes] = await Promise.all([
      getCacheInfo(),
      getCacheCommands(),
    ])
    cacheInfo.value = infoRes.data || null
    const data = commandsRes.data
    commandStats.value = data && !data.error ? data : {}
  } finally {
    loading.value = false
    commandLoading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.cache-page {
  padding: 12px;
}

.metric-card {
  height: 128px;
  margin-bottom: 12px;
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.metric-value {
  font-size: 28px;
  line-height: 1;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.metric-value.compact {
  font-size: 24px;
}

.section-card {
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
