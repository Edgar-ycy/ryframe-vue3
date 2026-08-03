<template>
  <div v-loading="loading" class="page-container">
    <el-row :gutter="16">
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card shadow="hover">
          <template #header><span><el-icon><Cpu /></el-icon> {{ t('monitor.server.cpu') }}</span></template>
          <div class="gauge-wrapper">
            <el-progress type="dashboard" :percentage="Math.round(info?.cpu_usage ?? 0)" :color="cpuColor" />
          </div>
          <div class="info-row"><span>{{ t('monitor.server.coreCount') }}</span><span>{{ info?.cpu_cores ?? '--' }}</span></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card shadow="hover">
          <template #header><span><el-icon><Monitor /></el-icon> {{ t('monitor.server.memory') }}</span></template>
          <div class="gauge-wrapper">
            <el-progress type="dashboard" :percentage="Math.round(info?.memory_usage ?? 0)" :color="memColor" />
          </div>
          <div class="info-row"><span>{{ t('monitor.server.usedTotal') }}</span><span>{{ (info?.used_memory ?? 0).toFixed(1) }} / {{ (info?.total_memory ?? 0).toFixed(1) }} {{ t('monitor.server.gigabytes') }}</span></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :lg="8">
        <el-card shadow="hover">
          <template #header><span><el-icon><Odometer /></el-icon> {{ t('monitor.server.systemInformation') }}</span></template>
          <div class="sys-info">
            <div class="info-row"><span>{{ t('monitor.server.operatingSystem') }}</span><span>{{ info?.os ?? '--' }}</span></div>
            <div class="info-row"><span>{{ t('monitor.server.hostname') }}</span><span>{{ info?.hostname ?? '--' }}</span></div>
            <div class="info-row"><span>{{ t('monitor.server.processId') }}</span><span>{{ info?.pid ?? '--' }}</span></div>
            <div class="info-row"><span>{{ t('monitor.server.uptime') }}</span><span>{{ uptimeStr }}</span></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { getServerInfo, type ServerInfo } from '@/api/modules/monitor'
import { Cpu, Monitor, Odometer } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const userStore = useUserStore()
const serverQuery = useTenantQuery<ServerInfo | null>(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated',
  'monitor-server',
  () => ({ scope: 'overview' }),
  async signal => {
    const response = await getServerInfo(signal)
    return response.data ?? null
  },
)
const loading = computed(() => serverQuery.isFetching.value)
const info = computed(() => serverQuery.data.value ?? null)

const cpuColor = computed(() => {
  const v = info.value?.cpu_usage ?? 0
  if (v > 90) return '#F56C6C'
  if (v > 70) return '#E6A23C'
  return '#67C23A'
})

const memColor = computed(() => {
  const v = info.value?.memory_usage ?? 0
  if (v > 90) return '#F56C6C'
  if (v > 70) return '#E6A23C'
  return '#409EFF'
})

const uptimeStr = computed(() => {
  const s = info.value?.uptime ?? 0
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return t('monitor.server.uptimeValue', { days: d, hours: h, minutes: m })
})

</script>

<style scoped>
.gauge-wrapper {
  padding: 10px 0;
  text-align: center;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--border-color-base);
}

.info-row:last-child { border-bottom: none }

.sys-info { margin-top: 8px }

</style>
