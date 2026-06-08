<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="任务名称">
          <el-input v-model="queryParams.job_name" placeholder="请输入任务名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="执行状态">
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width:100px">
            <el-option label="成功" value="1" />
            <el-option label="失败" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行时间">
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
          <span>调度日志</span>
          <div>
            <el-button @click="$router.push('/system/job')">返回任务列表</el-button>
            <el-button type="danger" icon="Delete" @click="handleClear">清空日志</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="job_name" label="任务名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="job_group" label="任务组" />
        <el-table-column prop="invoke_target" label="调用目标" min-width="200" show-overflow-tooltip />
        <el-table-column prop="job_message" label="日志信息" min-width="180" show-overflow-tooltip />
        <el-table-column prop="status" label="执行状态" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? '成功' : '失败' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时(ms)" align="center" />
        <el-table-column prop="created_at" label="执行时间" />
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link icon="View" @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.pageSize"
        :total="total" :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper" background
        @change="fetchData"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="调度日志详情" width="550px">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="任务名称">{{ detailRow.job_name }}</el-descriptions-item>
        <el-descriptions-item label="任务组">{{ detailRow.job_group }}</el-descriptions-item>
        <el-descriptions-item label="调用目标" :span="2">{{ detailRow.invoke_target }}</el-descriptions-item>
        <el-descriptions-item label="执行状态">
          <el-tag :type="detailRow.status === '1' ? 'success' : 'danger'" size="small">{{ detailRow.status === '1' ? '成功' : '失败' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="耗时">{{ detailRow.duration }} ms</el-descriptions-item>
        <el-descriptions-item label="执行时间" :span="2">{{ detailRow.created_at }}</el-descriptions-item>
        <el-descriptions-item label="日志信息" :span="2">
          <div style="max-height:200px;overflow-y:auto;word-break:break-all">{{ detailRow.job_message }}</div>
        </el-descriptions-item>
        <el-descriptions-item v-if="detailRow.exception_info" label="异常信息" :span="2">
          <div style="max-height:200px;overflow-y:auto;word-break:break-all;font-size:12px;font-family:monospace;color:var(--el-color-danger)">{{ detailRow.exception_info }}</div>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { listJobLog, clearJobLog } from '@/api/modules/job'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const dateRange = ref<any[]>([])

const queryParams = ref({
  page: 1, pageSize: 10, job_name: '', status: '', begin_time: '', end_time: '',
})

async function fetchData() {
  loading.value = true
  try {
    queryParams.value.begin_time = dateRange.value?.[0] || ''
    queryParams.value.end_time = dateRange.value?.[1] || ''
    const res = await listJobLog(queryParams.value)
    tableData.value = res.rows || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() {
  queryParams.value.job_name = ''; queryParams.value.status = ''
  queryParams.value.begin_time = ''; queryParams.value.end_time = ''
  dateRange.value = []; handleSearch()
}

async function handleClear() {
  try {
    await ElMessageBox.confirm('确认清空所有调度日志吗？此操作不可恢复。', '警告', { type: 'warning' })
    await clearJobLog()
    ElMessage.success('清空成功'); fetchData()
  } catch { /* cancelled */ }
}

// ----- 详情 -----
const detailVisible = ref(false)
const detailRow = ref<any>({})
function handleDetail(row: any) {
  detailRow.value = row
  detailVisible.value = true
}

onMounted(() => fetchData())
</script>


