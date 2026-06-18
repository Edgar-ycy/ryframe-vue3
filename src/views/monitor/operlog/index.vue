<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="操作人员">
          <el-input v-model="queryParams.oper_name" placeholder="请输入操作人员" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width:100px">
            <el-option label="成功" value="1" />
            <el-option label="失败" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作时间">
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
          <span>操作日志</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" label="ID" width="170" align="center" />
        <el-table-column prop="title" label="操作模块" min-width="120" show-overflow-tooltip />
        <el-table-column prop="business_type" label="业务类型" />
        <el-table-column prop="oper_name" label="操作人员" />
        <el-table-column prop="oper_url" label="请求地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="oper_ip" label="操作IP" />
        <el-table-column prop="status" label="状态" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? '成功' : '失败' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cost_time" label="耗时(ms)" align="center" />
        <el-table-column prop="oper_time" label="操作时间" />
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
    <el-dialog v-model="detailVisible" title="操作日志详情" width="600px">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="操作模块">{{ detailRow.title }}</el-descriptions-item>
        <el-descriptions-item label="业务类型">{{ detailRow.business_type }}</el-descriptions-item>
        <el-descriptions-item label="操作人员">{{ detailRow.oper_name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detailRow.status === '1' ? 'success' : 'danger'" size="small">{{ detailRow.status === '1' ? '成功' : '失败' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="请求方法">{{ detailRow.request_method }}</el-descriptions-item>
        <el-descriptions-item label="操作 IP">{{ detailRow.oper_ip }}</el-descriptions-item>
        <el-descriptions-item label="请求地址" :span="2">{{ detailRow.oper_url }}</el-descriptions-item>
        <el-descriptions-item label="请求参数" :span="2">
          <div style="max-height:150px;overflow-y:auto;word-break:break-all;font-size:12px;font-family:monospace">{{ detailRow.oper_param }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="返回结果" :span="2">
          <div style="max-height:150px;overflow-y:auto;word-break:break-all;font-size:12px;font-family:monospace">{{ detailRow.json_result }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="耗时">{{ detailRow.cost_time }} ms</el-descriptions-item>
        <el-descriptions-item label="操作时间">{{ detailRow.oper_time }}</el-descriptions-item>
        <el-descriptions-item v-if="detailRow.error_msg" label="错误信息" :span="2">
          <span style="color:var(--el-color-danger)">{{ detailRow.error_msg }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { listOperLog } from '@/api/modules/monitor'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const dateRange = ref<any[]>([])

const queryParams = ref({
  page: 1, pageSize: 10, oper_name: '', status: '', begin_time: '', end_time: '',
})

async function fetchData() {
  loading.value = true
  try {
    queryParams.value.begin_time = dateRange.value?.[0] || ''
    queryParams.value.end_time = dateRange.value?.[1] || ''
    const res = await listOperLog(queryParams.value)
    tableData.value = res.rows || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() {
  queryParams.value.oper_name = ''; queryParams.value.status = ''; queryParams.value.begin_time = ''; queryParams.value.end_time = ''
  dateRange.value = []
  handleSearch()
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


