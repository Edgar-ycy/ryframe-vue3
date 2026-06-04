<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header><span><el-icon><Cpu /></el-icon> CPU</span></template>
          <div class="gauge-wrapper">
            <el-progress type="dashboard" :percentage="Math.round(info.cpu_usage || 0)" :color="cpuColor" />
          </div>
          <div class="info-row"><span>核心数</span><span>{{ info.cpu_cores || '--' }}</span></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header><span><el-icon><Monitor /></el-icon> 内存</span></template>
          <div class="gauge-wrapper">
            <el-progress type="dashboard" :percentage="Math.round(info.memory_usage || 0)" :color="memColor" />
          </div>
          <div class="info-row"><span>已用 / 总</span><span>{{ (info.used_memory || 0).toFixed(1) }} / {{ (info.total_memory || 0).toFixed(1) }} GB</span></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header><span><el-icon><Odometer /></el-icon> 系统信息</span></template>
          <div class="sys-info">
            <div class="info-row"><span>操作系统</span><span>{{ info.os }}</span></div>
            <div class="info-row"><span>主机名</span><span>{{ info.hostname }}</span></div>
            <div class="info-row"><span>进程ID</span><span>{{ info.pid }}</span></div>
            <div class="info-row"><span>运行时长</span><span>{{ uptimeStr }}</span></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span><el-icon><Connection /></el-icon> 健康检查</span></template>
          <div v-if="health" class="health-status">
            <el-tag :type="health.status === 'UP' ? 'success' : 'danger'" size="large">{{ health.status }}</el-tag>
            <div class="info-row"><span>数据库</span><el-tag :type="health.checks?.database === 'UP' ? 'success' : 'danger'" size="small">{{ health.checks?.database || health.database }}</el-tag></div>
            <div class="info-row"><span>Redis</span><el-tag :type="health.checks?.redis === 'UP' ? 'success' : (health.checks?.redis === 'not_configured' ? 'info' : 'danger')" size="small">{{ health.checks?.redis || health.redis }}</el-tag></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { getServerInfo, getHealth } from '@/api/modules/monitor'

interface ServerInfo {
  cpu_usage?: number
  cpu_cores?: number
  memory_usage?: number
  used_memory?: number
  total_memory?: number
  os?: string
  hostname?: string
  pid?: number
  uptime?: number
}

interface HealthInfo {
  status: string
  checks?: {
    database: string
    redis: string
  }
  database?: string
  redis?: string
}

const info = ref<ServerInfo>({})
const health = ref<HealthInfo | null>(null)

const cpuColor = computed(() => {
  const v = info.value.cpu_usage || 0
  if (v > 90) return '#F56C6C'
  if (v > 70) return '#E6A23C'
  return '#67C23A'
})

const memColor = computed(() => {
  const v = info.value.memory_usage || 0
  if (v > 90) return '#F56C6C'
  if (v > 70) return '#E6A23C'
  return '#409EFF'
})

const uptimeStr = computed(() => {
  const s = info.value.uptime || 0
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${d}天 ${h}时 ${m}分`
})

onMounted(async () => {
  try { const res = await getServerInfo(); info.value = res.data || {} } catch {}
  try { const res = await getHealth(); health.value = res.data || null } catch {}
})
</script>

<style scoped>
.gauge-wrapper { text-align: center; padding: 10px 0 }
.info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--el-border-color-lighter); font-size: 13px }
.info-row:last-child { border-bottom: none }
.sys-info { margin-top: 8px }
.health-status { display: flex; flex-direction: column; gap: 12px; align-items: flex-start }
.health-status > .el-tag { margin-bottom: 8px }
.health-status .info-row { width: 100% }
</style>
