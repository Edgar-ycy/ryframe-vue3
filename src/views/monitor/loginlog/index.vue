<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="用户名">
          <el-input v-model="queryParams.user_name" placeholder="请输入用户名" clearable/>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width:100px">
            <el-option label="成功" value="0"/>
            <el-option label="失败" value="1"/>
          </el-select>
        </el-form-item>
        <el-form-item label="登录时间">
          <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              range-separator="—"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DDTHH:mm:ss"
              style="width:340px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>登录日志</span>
          <el-button type="danger" icon="Delete" @click="handleClear">清空日志</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="user_name" label="用户名" width="100"/>
        <el-table-column prop="ipaddr" label="IP地址" width="140"/>
        <el-table-column prop="login_location" label="登录地点" width="120" show-overflow-tooltip/>
        <el-table-column prop="browser" label="浏览器" width="100" show-overflow-tooltip/>
        <el-table-column prop="os" label="操作系统" width="100" show-overflow-tooltip/>
        <el-table-column prop="status" label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '0' ? 'success' : 'danger'" size="small">{{
                row.status === '0' ? '成功' : '失败'
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="msg" label="提示消息" min-width="140" show-overflow-tooltip/>
        <el-table-column prop="login_time" label="登录时间" width="170"/>
      </el-table>
      <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.pageSize"
          :total="total" :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper" background
          style="margin-top:16px;justify-content:flex-end"
          @change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import {listLoginLog, clearLoginLog} from '@/api/modules/monitor'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const dateRange = ref([])

const queryParams = ref({
  page: 1, pageSize: 10, user_name: '', status: '', begin_time: '', end_time: '',
})

async function fetchData() {
  loading.value = true
  try {
    queryParams.value.begin_time = dateRange.value?.[0] || ''
    queryParams.value.end_time = dateRange.value?.[1] || ''
    const res = await listLoginLog(queryParams.value)
    tableData.value = res.rows || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  queryParams.value.page = 1
  fetchData()
}

function handleReset() {
  queryParams.value.user_name = ''
  queryParams.value.status = ''
  queryParams.value.begin_time = ''
  queryParams.value.end_time = ''
  dateRange.value = []
  handleSearch()
}

async function handleClear() {
  try {
    await ElMessageBox.confirm('确认清空所有登录日志吗？此操作不可恢复。', '警告', {type: 'warning'})
    await clearLoginLog()
    ElMessage.success('清空成功')
    fetchData()
  } catch { /* cancelled */
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.search-card :deep(.el-form-item) {
  margin-bottom: 0
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center
}
</style>
