<template>
  <div class="runtime-page">
    <div class="page-actions">
      <el-button v-perm="'monitor:runtime:list'" :loading="loading" @click="fetchRuntime">
        <el-icon><Refresh /></el-icon>
        {{ t('monitor.runtime.refresh') }}
      </el-button>
    </div>

    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Coin /></el-icon>
            <span>{{ t('monitor.runtime.database') }}</span>
          </div>
          <div class="metric-value">{{ runtime?.database.driver?.toUpperCase() || '-' }}</div>
          <div class="metric-footer">
            <el-tag :type="databaseTagType" size="small">{{ databaseStatusText }}</el-tag>
            <span>
              {{ t('monitor.runtime.replicaCount', { count: runtime?.database.replica_count ?? 0 }) }} ·
              {{ t('monitor.runtime.sourceCount', { count: runtime?.database.source_count ?? 0 }) }}
            </span>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Connection /></el-icon>
            <span>{{ t('monitor.runtime.redis') }}</span>
          </div>
          <el-tag :type="redisTagType" size="large">{{ redisStatusText }}</el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><FolderOpened /></el-icon>
            <span>{{ t('monitor.runtime.objectStorage') }}</span>
          </div>
          <div class="metric-value">{{ runtime?.object_storage.backend?.toUpperCase() || '-' }}</div>
          <div class="metric-footer">
            <el-tag :type="storageTagType" size="small">{{ storageStatusText }}</el-tag>
            <span class="metric-endpoint" :title="runtime?.object_storage.endpoint || ''">
              {{ runtime?.object_storage.endpoint || t('monitor.runtime.localFileSystem') }}
            </span>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Switch /></el-icon>
            <span>{{ t('monitor.runtime.uploadCircuitBreaker') }}</span>
          </div>
          <el-tag :type="circuitTagType" size="large">{{ circuitStatusText }}</el-tag>
        </el-card>
      </el-col>
    </el-row>

    <section class="topology-section">
      <div class="section-header">
        <h2>{{ t('monitor.runtime.databaseTopology') }}</h2>
        <el-tag effect="plain">{{ readPolicyText }}</el-tag>
      </div>
      <el-table :data="databaseNodes" border>
        <el-table-column prop="name" :label="t('monitor.runtime.node')" min-width="180" />
        <el-table-column prop="role" :label="t('monitor.runtime.role')" width="120" />
        <el-table-column :label="t('monitor.runtime.status')" width="120">
          <template #default="{ row }">
            <el-tag :type="row.connected ? 'success' : 'danger'">
              {{ row.connected ? t('monitor.runtime.connected') : t('monitor.runtime.disconnected') }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Coin, Connection, FolderOpened, Refresh, Switch } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { getRuntimeStatus, type RuntimeStatus } from '@/api/modules/monitor'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const userStore = useUserStore()
const runtimeQuery = useTenantQuery<RuntimeStatus | null>(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated',
  'monitor-runtime',
  () => ({ scope: 'status' }),
  async signal => {
    const response = await getRuntimeStatus(signal)
    return response.data ?? null
  },
)
const loading = computed(() => runtimeQuery.isFetching.value)
const runtime = computed(() => runtimeQuery.data.value ?? null)

interface DatabaseNodeRow {
  name: string
  role: string
  connected: boolean
}

const databaseNodes = computed<DatabaseNodeRow[]>(() => {
  if (!runtime.value) return []
  return [
    {
      name: 'primary',
      role: t('monitor.runtime.primary'),
      connected: runtime.value.database.primary_connected,
    },
    ...runtime.value.database.replicas.map(replica => ({
      name: replica.name,
      role: t('monitor.runtime.readReplica'),
      connected: replica.connected,
    })),
    ...runtime.value.database.sources.map(source => ({
      name: source.name,
      role: t('monitor.runtime.businessDataSource'),
      connected: source.connected,
    })),
  ]
})

const databaseTagType = computed(() => runtime.value?.database.connected ? 'success' : 'danger')
const databaseStatusText = computed(() => runtime.value?.database.connected
  ? t('monitor.runtime.topologyHealthy')
  : t('monitor.runtime.topologyUnhealthy'))

const storageTagType = computed(() => runtime.value?.object_storage.connected ? 'success' : 'danger')
const storageStatusText = computed(() => runtime.value?.object_storage.connected
  ? t('monitor.runtime.connected')
  : t('monitor.runtime.disconnected'))

const readPolicyText = computed(() => {
  if (runtime.value?.database.read_policy === 'round_robin') return t('monitor.runtime.readReplicaRoundRobin')
  return t('monitor.runtime.primaryRead')
})

const circuitTagType = computed(() => {
  const state = runtime.value?.upload_circuit_breaker.state
  if (state === 'Closed') return 'success'
  if (state === 'HalfOpen') return 'warning'
  if (state === 'Open') return 'danger'
  return 'info'
})

const circuitStatusText = computed(() => {
  const state = runtime.value?.upload_circuit_breaker.state
  if (state === 'Closed') return t('monitor.runtime.circuitClosed')
  if (state === 'HalfOpen') return t('monitor.runtime.circuitHalfOpen')
  if (state === 'Open') return t('monitor.runtime.circuitOpen')
  return state || '-'
})

const redisTagType = computed(() => {
  if (!runtime.value?.redis.configured) return 'info'
  return runtime.value.redis.connected ? 'success' : 'danger'
})

const redisStatusText = computed(() => {
  if (!runtime.value?.redis.configured) return t('monitor.runtime.unconfigured')
  return runtime.value.redis.connected ? t('monitor.runtime.connected') : t('monitor.runtime.disconnected')
})

async function fetchRuntime(): Promise<void> {
  await runtimeQuery.refetch({ throwOnError: true })
}
</script>

<style scoped>
.runtime-page {
  padding: 12px;
}

.page-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.metric-card {
  height: 148px;
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

.metric-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-top: 14px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.metric-endpoint {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topology-section {
  margin-top: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 600;
}

</style>
