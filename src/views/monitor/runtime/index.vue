<template>
  <div class="runtime-page">
    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Connection /></el-icon>
            <span>消息队列</span>
          </div>
          <el-tag :type="runtime?.message_queue.healthy ? 'success' : 'danger'" size="large">
            {{ runtime?.message_queue.healthy ? '健康' : '异常' }}
          </el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Tickets /></el-icon>
            <span>任务队列</span>
          </div>
          <div class="metric-value">{{ runtime?.task_queue.len ?? '-' }}</div>
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

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Operation /></el-icon>
            <span>功能开关</span>
          </div>
          <div class="metric-value">{{ runtime?.feature_flags.length ?? 0 }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>功能开关</span>
          <el-button :loading="loading" icon="Refresh" @click="fetchRuntime">刷新</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="runtime?.feature_flags || []" border stripe>
        <el-table-column prop="key" label="标识" min-width="180" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">
              {{ row.enabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="系统保留" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.system ? 'warning' : 'info'">
              {{ row.system ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Connection, Operation, Switch, Tickets } from '@element-plus/icons-vue'
import { getRuntimeStatus, type RuntimeStatus } from '@/api/modules/monitor'

const loading = ref(false)
const runtime = ref<RuntimeStatus | null>(null)

const circuitTagType = computed(() => {
  const state = runtime.value?.upload_circuit_breaker.state
  if (state === 'Closed') return 'success'
  if (state === 'HalfOpen') return 'warning'
  if (state === 'Open') return 'danger'
  return 'info'
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

.table-card {
  margin-top: 4px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
