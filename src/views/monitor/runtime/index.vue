<template>
  <div v-loading="loading && !runtime" class="page-container monitor-page">
    <el-alert
      v-if="error?.message"
      :title="error?.message ?? ''"
      type="error"
      show-icon
      :closable="false"
      class="monitor-page__alert"
    />
    <div class="monitor-page__actions">
      <el-button v-perm="'monitor:runtime:list'" :loading="loading" @click="fetchRuntime">
        <el-icon><Refresh /></el-icon>
        {{ t('monitor.runtime.refresh') }}
      </el-button>
    </div>

    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--tall">
          <div class="monitor-metric-header">
            <el-icon><Coin /></el-icon>
            <span>{{ t('monitor.runtime.database') }}</span>
          </div>
          <div class="monitor-metric-value">
            {{ runtime?.database.driver?.toUpperCase() || '—' }}
          </div>
          <div class="monitor-metric-footer">
            <el-tag :type="databaseTagType" size="small">{{ databaseStatusText }}</el-tag>
            <span>
              {{
                runtime
                  ? `${t('monitor.runtime.replicaCount', { count: runtime.database.replica_count })} · ${t('monitor.runtime.sourceCount', { count: runtime.database.source_count })}`
                  : '—'
              }}
            </span>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--tall">
          <div class="monitor-metric-header">
            <el-icon><Connection /></el-icon>
            <span>{{ t('monitor.runtime.redis') }}</span>
          </div>
          <el-tag :type="redisTagType" size="large">{{ redisStatusText }}</el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--tall">
          <div class="monitor-metric-header">
            <el-icon><FolderOpened /></el-icon>
            <span>{{ t('monitor.runtime.objectStorage') }}</span>
          </div>
          <div class="monitor-metric-value">
            {{ runtime?.object_storage.backend?.toUpperCase() || '—' }}
          </div>
          <div class="monitor-metric-footer">
            <el-tag :type="storageTagType" size="small">{{ storageStatusText }}</el-tag>
            <span class="monitor-metric-endpoint" :title="storageEndpointTitle">
              {{ storageEndpoint }}
            </span>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--tall">
          <div class="monitor-metric-header">
            <el-icon><Switch /></el-icon>
            <span>{{ t('monitor.runtime.uploadCircuitBreaker') }}</span>
          </div>
          <el-tag :type="circuitTagType" size="large">{{ circuitStatusText }}</el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--tall">
          <div class="monitor-metric-header">
            <el-icon><Operation /></el-icon>
            <span>{{ t('monitor.runtime.jobMode') }}</span>
          </div>
          <el-tag type="info" size="large">{{ jobModeText() }}</el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="monitor-metric-card monitor-metric-card--tall">
          <div class="monitor-metric-header">
            <el-icon><Timer /></el-icon>
            <span>{{ t('monitor.runtime.scheduler') }}</span>
          </div>
          <el-tag :type="schedulerTagType()" size="large">{{ schedulerStatusText() }}</el-tag>
        </el-card>
      </el-col>
    </el-row>

    <section class="monitor-section-card">
      <div class="monitor-section-header">
        <h2>{{ t('monitor.runtime.databaseTopology') }}</h2>
        <el-tag effect="plain">{{ readPolicyText }}</el-tag>
      </div>
      <el-table v-loading="loading" :data="databaseNodes" border :empty-text="t('common.noData')">
        <el-table-column prop="name" :label="t('monitor.runtime.node')" min-width="180" />
        <el-table-column prop="role" :label="t('monitor.runtime.role')" width="120" />
        <el-table-column :label="t('monitor.runtime.status')" width="120">
          <template #default="{ row }">
            <el-tag :type="row.connected ? 'success' : 'danger'">
              {{
                row.connected ? t('monitor.runtime.connected') : t('monitor.runtime.disconnected')
              }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Coin,
  Connection,
  FolderOpened,
  Operation,
  Refresh,
  Switch,
  Timer,
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { getRuntimeStatus, type RuntimeStatus } from '@/api/modules/monitor'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const userStore = useUserStore()
const pageActive = ref(true)
const runtimeQuery = useServerStateQuery<RuntimeStatus | null>(
  () => userStore.sessionStatus === 'authenticated' && pageActive.value,
  'monitor-runtime',
  () => ({ scope: 'status' }),
  async (signal) => {
    const response = await getRuntimeStatus(signal)
    return response.data ?? null
  },
  { meta: { errorMode: 'silent' } },
)
const loading = runtimeQuery.isFetching
const runtime = runtimeQuery.data
const error = runtimeQuery.error

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
    ...runtime.value.database.replicas.map((replica) => ({
      name: replica.name,
      role: t('monitor.runtime.readReplica'),
      connected: replica.connected,
    })),
    ...runtime.value.database.sources.map((source) => ({
      name: source.name,
      role: t('monitor.runtime.businessDataSource'),
      connected: source.connected,
    })),
  ]
})

const databaseTagType = computed(() => {
  if (!runtime.value) return 'info'
  return runtime.value.database.connected ? 'success' : 'danger'
})
const databaseStatusText = computed(() => {
  if (!runtime.value) return '—'
  return runtime.value.database.connected
    ? t('monitor.runtime.topologyHealthy')
    : t('monitor.runtime.topologyUnhealthy')
})

const storageTagType = computed(() => {
  if (!runtime.value) return 'info'
  return runtime.value.object_storage.connected ? 'success' : 'danger'
})
const storageStatusText = computed(() => {
  if (!runtime.value) return '—'
  return runtime.value.object_storage.connected
    ? t('monitor.runtime.connected')
    : t('monitor.runtime.disconnected')
})

const storageEndpoint = computed(() => {
  const storage = runtime.value?.object_storage
  if (!storage) return '—'
  if (storage.backend.toLowerCase() === 'local') return t('monitor.runtime.localFileSystem')
  return storage.endpoint || '—'
})

const storageEndpointTitle = computed(() => {
  const storage = runtime.value?.object_storage
  if (!storage || storage.backend.toLowerCase() === 'local') return ''
  return storage.endpoint || ''
})

const readPolicyText = computed(() => {
  if (!runtime.value) return '—'
  if (runtime.value?.database.read_policy === 'round_robin')
    return t('monitor.runtime.readReplicaRoundRobin')
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
  return state || '—'
})

const redisTagType = computed(() => {
  if (!runtime.value) return 'info'
  if (!runtime.value?.redis.configured) return 'info'
  return runtime.value.redis.connected ? 'success' : 'danger'
})

const redisStatusText = computed(() => {
  if (!runtime.value) return '—'
  if (!runtime.value?.redis.configured) return t('monitor.runtime.unconfigured')
  return runtime.value.redis.connected
    ? t('monitor.runtime.connected')
    : t('monitor.runtime.disconnected')
})

function jobModeText(): string {
  const mode = runtime.value?.jobs.mode
  if (mode === 'embedded') return t('monitor.runtime.jobModeEmbedded')
  if (mode === 'external') return t('monitor.runtime.jobModeExternal')
  if (mode === 'disabled') return t('monitor.runtime.jobModeDisabled')
  return '—'
}

function schedulerTagType(): 'success' | 'info' {
  return runtime.value?.jobs.scheduler_enabled ? 'success' : 'info'
}

function schedulerStatusText(): string {
  if (!runtime.value) return '—'
  return runtime.value.jobs.scheduler_enabled
    ? t('monitor.runtime.schedulerEnabled')
    : t('monitor.runtime.schedulerDisabled')
}

async function fetchRuntime(): Promise<void> {
  await runtimeQuery.refetch({ throwOnError: true })
}

useKeepAlivePageActive(pageActive, () => runtimeQuery.refetch())
</script>
