<template>
  <div class="db-pool-page">
    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Connection /></el-icon>
            <span>{{ t('monitor.dbPool.connectionStatus') }}</span>
          </div>
          <el-tag :type="poolInfo?.status === 'connected' ? 'success' : 'danger'" size="large">
            {{ poolInfo?.status === 'connected' ? t('monitor.dbPool.connected') : t('monitor.dbPool.disconnected') }}
          </el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="8">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><DataLine /></el-icon>
            <span>{{ t('monitor.dbPool.activeConnections') }}</span>
          </div>
          <div class="metric-value">{{ poolInfo?.active_connections ?? '-' }}</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :lg="8">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Clock /></el-icon>
            <span>{{ t('monitor.dbPool.checkTime') }}</span>
          </div>
          <div class="metric-time">{{ formatTime(poolInfo?.timestamp) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('monitor.dbPool.title') }}</span>
          <el-button v-perm="'monitor:db-pool:list'" :loading="loading" icon="Refresh" @click="fetchData">{{ t('monitor.dbPool.refresh') }}</el-button>
        </div>
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item :label="t('monitor.dbPool.currentStatus')">
          <el-tag :type="poolInfo?.status === 'connected' ? 'success' : 'danger'">
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
const poolStatusText = computed(() => {
  if (!poolInfo.value?.status) return '-'
  return poolInfo.value.status === 'connected'
    ? t('monitor.dbPool.connected')
    : t('monitor.dbPool.disconnected')
})

function formatTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

async function fetchData(): Promise<void> {
  await poolQuery.refetch({ throwOnError: true })
}
</script>

<style scoped>
.db-pool-page {
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

.metric-time {
  font-size: 18px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-card {
  margin-top: 4px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
