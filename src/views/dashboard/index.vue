<template>
  <div class="page-container">
    <h2>仪表盘</h2>
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="6" v-for="card in statsCards" :key="card.title">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" :style="{ background: card.color }">
              <el-icon :size="28"><component :is="card.icon" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">{{ card.title }}</div>
              <div class="stat-value">{{ card.value }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-card style="margin-top: 20px;">
      <template #header>
        <span>欢迎使用 RyFrame 管理后台</span>
      </template>
      <p>当前版本：v0.1.0</p>
      <p>这是一个基于 Vue 3 + Element Plus 的企业级管理后台框架。</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { listUser } from '@/api/modules/user'
import { listRole } from '@/api/modules/role'
import { listOnlineUser } from '@/api/modules/monitor'
import { listOperLog } from '@/api/modules/monitor'

interface StatCard {
  title: string
  value: number | string
  icon: string
  color: string
}

const statsCards = ref<StatCard[]>([
  { title: '用户数', value: '--', icon: 'User', color: '#409EFF' },
  { title: '角色数', value: '--', icon: 'Avatar', color: '#67C23A' },
  { title: '在线用户', value: '--', icon: 'Connection', color: '#E6A23C' },
  { title: '操作日志', value: '--', icon: 'Document', color: '#F56C6C' },
])

async function fetchStats() {
  try {
    const [userRes, roleRes, onlineRes, operLogRes] = await Promise.all([
      listUser({ page: 1, pageSize: 1 }),
      listRole({ page: 1, pageSize: 1 }),
      listOnlineUser({ page: 1, pageSize: 1 }),
      listOperLog({ page: 1, pageSize: 1 }),
    ])
    statsCards.value[0].value = userRes.total ?? 0
    statsCards.value[1].value = roleRes.total ?? 0
    statsCards.value[2].value = onlineRes.total ?? (onlineRes.rows || []).length
    statsCards.value[3].value = operLogRes.total ?? 0
  } catch {
    // 接口不可用时保持默认 --
  }
}

onMounted(() => fetchStats())
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #fff;
}
.stat-title {
  font-size: 14px;
  color: var(--color-text-secondary);
}
.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--color-text-primary);
}
</style>
