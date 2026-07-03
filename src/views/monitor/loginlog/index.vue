<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="用户名">
          <el-input v-model="queryParams.user_name" placeholder="请输入用户名" clearable/>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width:100px">
            <el-option label="成功" value="1"/>
            <el-option label="失败" value="0"/>
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
          <el-button v-perm="'system:logininfor:list'" type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button v-perm="'system:logininfor:list'" icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>登录日志</span>
          <el-button v-perm="'system:logininfor:export'" icon="Download" :loading="exportLoading" @click="handleExport">导出</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="user_name" label="用户名" />
        <el-table-column prop="ipaddr" label="IP地址" />
        <el-table-column prop="login_location" label="登录地点" show-overflow-tooltip/>
        <el-table-column prop="browser" label="浏览器" show-overflow-tooltip/>
        <el-table-column prop="os" label="操作系统" show-overflow-tooltip/>
        <el-table-column prop="status" label="状态" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{
                row.status === '1' ? '成功' : '失败'
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="msg" label="提示消息" min-width="150" show-overflow-tooltip/>
        <el-table-column prop="login_time" label="登录时间" />
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'system:logininfor:list'" type="primary" link icon="View" @click="handleDetail(row)">详情</el-button>
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
    <el-dialog v-model="detailVisible" title="登录日志详情" width="550px">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="用户名">{{ detailRow.user_name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detailRow.status === '1' ? 'success' : 'danger'" size="small">{{ detailRow.status === '1' ? '成功' : '失败' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="IP 地址">{{ detailRow.ipaddr }}</el-descriptions-item>
        <el-descriptions-item label="登录地点">{{ detailRow.login_location }}</el-descriptions-item>
        <el-descriptions-item label="浏览器">{{ detailRow.browser }}</el-descriptions-item>
        <el-descriptions-item label="操作系统">{{ detailRow.os }}</el-descriptions-item>
        <el-descriptions-item label="登录时间" :span="2">{{ detailRow.login_time }}</el-descriptions-item>
        <el-descriptions-item label="提示消息" :span="2">{{ detailRow.msg }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { listLoginLog, exportLoginLog } from '@/api/modules/monitor'
import { useDownload } from '@/hooks/useDownload'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const dateRange = ref<any[]>([])
const { downloading: exportLoading, downloadBlob } = useDownload()

const queryParams = ref({
  page: 1, pageSize: 10, user_name: '', status: '', begin_time: '', end_time: '',
})

function handleExport() {
  return downloadBlob(() => exportLoginLog(queryParams.value), { filename: '登录日志.xlsx' })
}

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

// ----- 详情 -----
const detailVisible = ref(false)
const detailRow = ref<any>({})
function handleDetail(row: any) {
  detailRow.value = row
  detailVisible.value = true
}

onMounted(() => fetchData())
</script>


