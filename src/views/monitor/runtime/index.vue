<template>
  <div class="runtime-page">
    <div class="page-actions">
      <el-button v-perm="'monitor:runtime:list'" :loading="loading" @click="fetchRuntime">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Coin /></el-icon>
            <span>数据库</span>
          </div>
          <div class="metric-value">{{ runtime?.database.driver?.toUpperCase() || '-' }}</div>
          <div class="metric-footer">
            <el-tag :type="databaseTagType" size="small">{{ databaseStatusText }}</el-tag>
            <span>
              {{ runtime?.database.replica_count ?? 0 }} 个只读副本 ·
              {{ runtime?.database.source_count ?? 0 }} 个业务数据源
            </span>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Connection /></el-icon>
            <span>Redis</span>
          </div>
          <el-tag :type="redisTagType" size="large">{{ redisStatusText }}</el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><FolderOpened /></el-icon>
            <span>对象存储</span>
          </div>
          <div class="metric-value">{{ runtime?.object_storage.backend?.toUpperCase() || '-' }}</div>
          <div class="metric-footer">
            <el-tag :type="storageTagType" size="small">{{ storageStatusText }}</el-tag>
            <span class="metric-endpoint" :title="runtime?.object_storage.endpoint || ''">
              {{ runtime?.object_storage.endpoint || '本地文件系统' }}
            </span>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Switch /></el-icon>
            <span>上传熔断器</span>
          </div>
          <el-tag :type="circuitTagType" size="large">{{ runtime?.upload_circuit_breaker.state || '-' }}</el-tag>
        </el-card>
      </el-col>
    </el-row>

    <section class="topology-section">
      <div class="section-header">
        <h2>数据库拓扑</h2>
        <el-tag effect="plain">{{ readPolicyText }}</el-tag>
      </div>
      <el-table :data="databaseNodes" border>
        <el-table-column prop="name" label="节点" min-width="180" />
        <el-table-column prop="role" label="角色" width="120" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.connected ? 'success' : 'danger'">
              {{ row.connected ? '已连接' : '未连接' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Coin, Connection, FolderOpened, Refresh, Switch } from '@element-plus/icons-vue'
import { getRuntimeStatus, type RuntimeStatus } from '@/api/modules/monitor'

const loading = ref(false)
const runtime = ref<RuntimeStatus | null>(null)

interface DatabaseNodeRow {
  name: string
  role: '主库' | '只读副本' | '业务数据源'
  connected: boolean
}

const databaseNodes = computed<DatabaseNodeRow[]>(() => {
  if (!runtime.value) return []
  return [
    {
      name: 'primary',
      role: '主库',
      connected: runtime.value.database.primary_connected,
    },
    ...runtime.value.database.replicas.map(replica => ({
      name: replica.name,
      role: '只读副本' as const,
      connected: replica.connected,
    })),
    ...runtime.value.database.sources.map(source => ({
      name: source.name,
      role: '业务数据源' as const,
      connected: source.connected,
    })),
  ]
})

const databaseTagType = computed(() => runtime.value?.database.connected ? 'success' : 'danger')
const databaseStatusText = computed(() => runtime.value?.database.connected ? '拓扑正常' : '拓扑异常')

const storageTagType = computed(() => runtime.value?.object_storage.connected ? 'success' : 'danger')
const storageStatusText = computed(() => runtime.value?.object_storage.connected ? '已连接' : '未连接')

const readPolicyText = computed(() => {
  if (runtime.value?.database.read_policy === 'round_robin') return '只读副本轮询'
  return '主库读取'
})

const circuitTagType = computed(() => {
  const state = runtime.value?.upload_circuit_breaker.state
  if (state === 'Closed') return 'success'
  if (state === 'HalfOpen') return 'warning'
  if (state === 'Open') return 'danger'
  return 'info'
})

const redisTagType = computed(() => {
  if (!runtime.value?.redis.configured) return 'info'
  return runtime.value.redis.connected ? 'success' : 'danger'
})

const redisStatusText = computed(() => {
  if (!runtime.value?.redis.configured) return '未配置'
  return runtime.value.redis.connected ? '已连接' : '未连接'
})

async function fetchRuntime() {
  loading.value = true
  try {
    const res = await getRuntimeStatus()
    runtime.value = res.data || null
  } finally {
    loading.value = false
  }
}

onMounted(fetchRuntime)
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
