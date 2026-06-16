<template>
  <div class="db-pool-page">
    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Connection /></el-icon>
            <span>连接状态</span>
          </div>
          <el-tag :type="poolInfo?.status === 'connected' ? 'success' : 'danger'" size="large">
            {{ poolInfo?.status === 'connected' ? '已连接' : '未连接' }}
          </el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="8">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><DataLine /></el-icon>
            <span>活跃连接数</span>
          </div>
          <div class="metric-value">{{ poolInfo?.active_connections ?? '-' }}</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :lg="8">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Clock /></el-icon>
            <span>检查时间</span>
          </div>
          <div class="metric-time">{{ formatTime(poolInfo?.timestamp) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="card-header">
          <span>数据库连接池</span>
          <el-button :loading="loading" icon="Refresh" @click="fetchData">刷新</el-button>
        </div>
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="当前状态">
          <el-tag :type="poolInfo?.status === 'connected' ? 'success' : 'danger'">
            {{ poolInfo?.status || '-' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="活跃连接数">
          {{ poolInfo?.active_connections ?? '当前数据库驱动不支持查询' }}
        </el-descriptions-item>
        <el-descriptions-item label="最后检查时间">
          {{ formatTime(poolInfo?.timestamp) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Clock, Connection, DataLine } from '@element-plus/icons-vue'
import { getDbPool, type DbPoolInfo } from '@/api/modules/monitor'

const loading = ref(false)
const poolInfo = ref<DbPoolInfo | null>(null)

function formatTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getDbPool()
    poolInfo.value = res.data || null
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
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
