<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="用户名">
          <el-input v-model="queryParams.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="IP地址">
          <el-input v-model="queryParams.ipaddr" placeholder="请输入IP地址" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="fetchData">搜索</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header><span>在线用户（{{ tableData.length }} 人）</span></template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="token_id" label="会话编号" width="220" show-overflow-tooltip />
        <el-table-column prop="username" label="用户名" width="100" />
        <el-table-column prop="dept_name" label="部门" width="120" show-overflow-tooltip />
        <el-table-column prop="ipaddr" label="IP地址" width="150" />
        <el-table-column prop="login_location" label="登录地点" width="120" show-overflow-tooltip />
        <el-table-column prop="browser" label="浏览器" width="110" show-overflow-tooltip />
        <el-table-column prop="os" label="操作系统" width="110" show-overflow-tooltip />
        <el-table-column prop="login_time" label="登录时间" width="170" />
        <el-table-column label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="danger" link icon="SwitchButton" @click="handleForceLogout(row)">强退</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { listOnlineUser, forceLogout } from '@/api/modules/monitor'

const loading = ref(false)
const tableData = ref<any[]>([])
const queryParams = ref({ username: '', ipaddr: '' })

async function fetchData() {
  loading.value = true
  try {
    const res = await listOnlineUser(queryParams.value)
    tableData.value = res.rows || []
  } finally { loading.value = false }
}

function handleReset() {
  queryParams.value.username = ''; queryParams.value.ipaddr = ''
  fetchData()
}

async function handleForceLogout(row) {
  try {
    await ElMessageBox.confirm(`确认强制下线用户"${row.username}"吗？`, '警告', { type: 'warning' })
    await forceLogout(row.token_id)
    ElMessage.success('已强制下线')
    fetchData()
  } catch { /* cancelled */ }
}

onMounted(() => fetchData())
</script>

<style scoped>
.search-card :deep(.el-form-item) { margin-bottom: 0 }
</style>
