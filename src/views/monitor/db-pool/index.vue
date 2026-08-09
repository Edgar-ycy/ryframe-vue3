<template>
  <div v-loading="loading && !poolInfo" class="page-container monitor-page">
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="monitor-page__alert" />
    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--compact">
          <div class="monitor-metric-header">
            <el-icon><Connection /></el-icon>
            <span>{{ t('monitor.dbPool.connectionStatus') }}</span>
          </div>
          <el-tag :type="poolStatusType" size="large">
            {{ poolStatusText }}
          </el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="8">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--compact">
          <div class="monitor-metric-header">
            <el-icon><DataLine /></el-icon>
            <span>{{ t('monitor.dbPool.activeConnections') }}</span>
          </div>
          <div class="monitor-metric-value">{{ poolInfo?.active_connections ?? '—' }}</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :lg="8">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--compact">
          <div class="monitor-metric-header">
            <el-icon><Clock /></el-icon>
            <span>{{ t('monitor.dbPool.checkTime') }}</span>
          </div>
          <div class="monitor-metric-value monitor-metric-value--time">{{ formatTime(poolInfo?.timestamp) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="monitor-section-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('monitor.dbPool.title') }}</span>
          <el-button v-perm="'monitor:db-pool:list'" :loading="loading" icon="Refresh" @click="fetchData">{{ t('monitor.dbPool.refresh') }}</el-button>
        </div>
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item :label="t('monitor.dbPool.currentStatus')">
          <el-tag :type="poolStatusType">
            {{ poolStatusText }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('monitor.dbPool.activeConnections')">
          {{ poolInfo?.active_connections ?? t('monitor.dbPool.unsupportedMetric') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('monitor.dbPool.lastCheckedAt')">
          {{ formatTime(poolInfo?.timestamp) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Clock, Connection, DataLine } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { getDbPool, type DbPoolInfo } from '@/api/modules/monitor'
import { formatLocalizedDate } from '@/i18n'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const userStore = useUserStore()
const poolQuery = useTenantQuery<DbPoolInfo | null>(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated',
  'monitor-db-pool',
  () => ({ scope: 'status' }),
  async signal => {
    const response = await getDbPool(signal)
    return response.data ?? null
  },
)
const loading = computed(() => poolQuery.isFetching.value)
const poolInfo = computed(() => poolQuery.data.value ?? null)
const errorMessage = computed(() => poolQuery.error.value?.message ?? '')
const poolStatusType = computed(() => {
  if (!poolInfo.value?.status) return 'info'
  return poolInfo.value.status === 'connected' ? 'success' : 'danger'
})
const poolStatusText = computed(() => {
  if (!poolInfo.value?.status) return '—'
  return poolInfo.value.status === 'connected'
    ? t('monitor.dbPool.connected')
    : t('monitor.dbPool.disconnected')
})

function formatTime(value?: string) {
  return value ? formatLocalizedDate(value) : '—'
}

async function fetchData(): Promise<void> {
  await poolQuery.refetch({ throwOnError: true })
}
</script>
