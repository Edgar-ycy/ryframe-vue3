<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('monitor.operationLog.operator')">
          <el-input v-model="queryParams.oper_name" :placeholder="t('monitor.operationLog.operatorPlaceholder')" clearable />
        </el-form-item>
        <el-form-item :label="t('monitor.operationLog.status')">
          <el-select v-model="queryParams.status" :placeholder="t('monitor.operationLog.statusPlaceholder')" clearable style="width:100px">
            <el-option :label="t('monitor.operationLog.success')" value="1" />
            <el-option :label="t('monitor.operationLog.failed')" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('monitor.operationLog.operationTime')">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            :range-separator="t('monitor.operationLog.rangeSeparator')"
            :start-placeholder="t('monitor.operationLog.startTime')"
            :end-placeholder="t('monitor.operationLog.endTime')"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width:340px"
          />
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'system:operlog:list'" type="primary" icon="Search" @click="handleSearch">{{ t('monitor.operationLog.search') }}</el-button>
          <el-button v-perm="'system:operlog:list'" icon="Refresh" @click="handleReset">{{ t('monitor.operationLog.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('monitor.operationLog.title') }}</span>
          <el-button v-perm="'system:operlog:export'" icon="Download" :loading="exportLoading" @click="handleExport">{{ t('monitor.operationLog.export') }}</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" :label="t('monitor.operationLog.id')" width="170" align="center" />
        <el-table-column prop="title" :label="t('monitor.operationLog.operationModule')" min-width="120" show-overflow-tooltip />
        <el-table-column prop="business_type" :label="t('monitor.operationLog.businessType')" />
        <el-table-column prop="oper_name" :label="t('monitor.operationLog.operator')" />
        <el-table-column prop="oper_url" :label="t('monitor.operationLog.requestUrl')" min-width="200" show-overflow-tooltip />
        <el-table-column prop="oper_ip" :label="t('monitor.operationLog.operationIp')" />
        <el-table-column prop="status" :label="t('monitor.operationLog.status')" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? t('monitor.operationLog.success') : t('monitor.operationLog.failed') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cost_time" :label="t('monitor.operationLog.duration')" align="center" />
        <el-table-column :label="t('monitor.operationLog.operationTime')" min-width="160">
          <template #default="{ row }">{{ formatDate(row.oper_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('monitor.operationLog.operation')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'system:operlog:list'" type="primary" link icon="View" @click="handleDetail(row)">{{ t('monitor.operationLog.details') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="total" :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper" background
        @change="fetchData"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="t('monitor.operationLog.detailTitle')" width="600px">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item :label="t('monitor.operationLog.operationModule')">{{ detailRow.title }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.businessType')">{{ detailRow.business_type }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.operator')">{{ detailRow.oper_name }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.status')">
          <el-tag :type="detailRow.status === '1' ? 'success' : 'danger'" size="small">{{ detailRow.status === '1' ? t('monitor.operationLog.success') : t('monitor.operationLog.failed') }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.requestMethod')">{{ detailRow.request_method }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.operationIp')">{{ detailRow.oper_ip }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.requestUrl')" :span="2">{{ detailRow.oper_url }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.requestParameters')" :span="2">
          <div style="max-height:150px;overflow-y:auto;word-break:break-all;font-size:12px;font-family:monospace">{{ detailRow.oper_param }}</div>
        </el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.responseResult')" :span="2">
          <div style="max-height:150px;overflow-y:auto;word-break:break-all;font-size:12px;font-family:monospace">{{ detailRow.json_result }}</div>
        </el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.duration')">{{ t('monitor.operationLog.durationValue', { value: detailRow.cost_time }) }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.operationTime')">{{ formatDate(detailRow.oper_time) }}</el-descriptions-item>
        <el-descriptions-item v-if="detailRow.error_msg" :label="t('monitor.operationLog.errorMessage')" :span="2">
          <span style="color:var(--el-color-danger)">{{ detailRow.error_msg }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">{{ t('monitor.operationLog.close') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatLocalizedDate } from '@/i18n'
import {
  exportOperLog,
  listOperLog,
  type OperLogQuery,
  type OperLogRecord,
} from '@/api/modules/monitor'
import { useAsyncExport } from '@/hooks/useAsyncExport'
import type { PageResponse } from '@/shared/http/types'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const dateRange = ref<[string, string] | []>([])
const userStore = useUserStore()
const pageActive = ref(true)
const { pending: exportLoading, exportAndDownload } = useAsyncExport(() => userStore.tenantId)

const queryParams = ref<OperLogQuery>({
  page: 1, page_size: 10, oper_name: '', status: '', begin_time: '', end_time: '',
})
const activeQueryParams = ref<OperLogQuery>({ ...queryParams.value })

const operationLogsQuery = useTenantQuery<PageResponse<OperLogRecord>>(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated' && pageActive.value,
  'monitor-operation-logs',
  () => ({ scope: 'list', filters: { ...activeQueryParams.value } }),
  async signal => {
    const response = await listOperLog({ ...activeQueryParams.value }, signal)
    return response.data ?? {
      items: [],
      page: activeQueryParams.value.page ?? 1,
      page_size: activeQueryParams.value.page_size ?? 10,
      total: 0,
      total_pages: 0,
      max_page_size: activeQueryParams.value.page_size ?? 10,
    }
  },
)

const loading = computed(() => operationLogsQuery.isFetching.value)
const tableData = computed(() => operationLogsQuery.data.value?.items ?? [])
const total = computed(() => operationLogsQuery.data.value?.total ?? 0)

function handleExport() {
  return exportAndDownload(
    signal => exportOperLog({
      name: activeQueryParams.value.oper_name,
      status: activeQueryParams.value.status,
      begin_time: activeQueryParams.value.begin_time,
      end_time: activeQueryParams.value.end_time,
    }, signal),
    { filename: t('monitor.operationLog.exportFilename') },
  )
}

async function fetchData(): Promise<void> {
  queryParams.value.begin_time = dateRange.value[0] ?? ''
  queryParams.value.end_time = dateRange.value[1] ?? ''
  const nextParams = { ...queryParams.value }
  if (JSON.stringify(nextParams) !== JSON.stringify(activeQueryParams.value)) {
    activeQueryParams.value = nextParams
    return
  }
  await operationLogsQuery.refetch({ throwOnError: true })
}

function handleSearch(): void {
  queryParams.value.page = 1
  void fetchData()
}

function handleReset(): void {
  queryParams.value = {
    page: 1,
    page_size: queryParams.value.page_size,
    oper_name: '',
    status: '',
    begin_time: '',
    end_time: '',
  }
  dateRange.value = []
  void fetchData()
}

const detailVisible = ref(false)
const detailRow = ref<Partial<OperLogRecord>>({})
function handleDetail(row: OperLogRecord): void {
  detailRow.value = row
  detailVisible.value = true
}

function formatDate(value: string | null | undefined): string {
  return value ? formatLocalizedDate(value) : '—'
}

onActivated(() => {
  if (pageActive.value) return
  pageActive.value = true
  void operationLogsQuery.refetch()
})

onDeactivated(() => {
  pageActive.value = false
})
</script>
