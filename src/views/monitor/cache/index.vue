<template>
  <div class="cache-page">
    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Coin /></el-icon>
            <span>缓存模式</span>
          </div>
          <div class="metric-value">{{ cacheInfo?.mode || '-' }}</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><CircleCheck /></el-icon>
            <span>服务状态</span>
          </div>
          <el-tag :type="cacheInfo?.available ? 'success' : 'danger'" size="large">
            {{ cacheInfo?.available ? '可用' : '不可用' }}
          </el-tag>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><Key /></el-icon>
            <span>键总数</span>
          </div>
          <div class="metric-value">{{ cacheInfo?.keys.total_keys ?? 0 }}</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="metric-card">
          <div class="metric-header">
            <el-icon><TrendCharts /></el-icon>
            <span>已用内存</span>
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
              <span>Redis 信息</span>
              <el-button v-perm="'monitor:cache:list'" :loading="loading" icon="Refresh" @click="fetchData">刷新</el-button>
            </div>
          </template>

          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="版本">{{ cacheInfo?.server?.version || '-' }}</el-descriptions-item>
            <el-descriptions-item label="运行模式">{{ cacheInfo?.server?.mode || cacheInfo?.mode || '-' }}</el-descriptions-item>
            <el-descriptions-item label="操作系统">{{ cacheInfo?.server?.os || '-' }}</el-descriptions-item>
            <el-descriptions-item label="运行天数">{{ cacheInfo?.server?.uptime_days ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="客户端连接数">{{ cacheInfo?.server?.connected_clients ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="内存峰值">{{ cacheInfo?.memory?.used_memory_peak_human || '-' }}</el-descriptions-item>
            <el-descriptions-item label="内存碎片率">{{ formatRatio(cacheInfo?.memory?.mem_fragmentation_ratio) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="section-card">
          <template #header><span>键分类统计</span></template>
          <el-table v-loading="loading" :data="keyRows" border stripe>
            <el-table-column prop="label" label="分类" min-width="160" />
            <el-table-column prop="count" label="数量" width="120" align="right" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="section-card">
      <template #header><span>Redis 命令统计</span></template>
      <el-table v-loading="commandLoading" :data="commandRows" border stripe>
        <el-table-column prop="command" label="命令" width="180" />
        <el-table-column prop="stats" label="统计" min-width="360" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { CircleCheck, Coin, Key, TrendCharts } from '@element-plus/icons-vue'
import {
  getCacheCommands,
  getCacheInfo,
  type CacheInfo,
} from '@/api/modules/monitor'

const loading = ref(false)
const commandLoading = ref(false)
const cacheInfo = ref<CacheInfo | null>(null)
const commandStats = ref<Record<string, string>>({})

const keyRows = computed(() => {
  const keys = cacheInfo.value?.keys
  return [
    { label: '全部键', count: keys?.total_keys ?? 0 },
    { label: '在线用户会话', count: keys?.online_users ?? 0 },
    { label: '验证码', count: keys?.captchas ?? 0 },
    { label: '限流计数器', count: keys?.rate_limits ?? 0 },
    { label: '字典缓存', count: keys?.dict_cache ?? 0 },
    { label: '参数配置缓存', count: keys?.config_cache ?? 0 },
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
