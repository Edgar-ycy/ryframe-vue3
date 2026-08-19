<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('monitor.loginLog.username')">
          <el-input v-model="queryParams.user_name" :placeholder="t('monitor.loginLog.usernamePlaceholder')" clearable />
        </el-form-item>
        <el-form-item :label="t('monitor.loginLog.status')">
          <el-select v-model="queryParams.status" :placeholder="t('monitor.loginLog.statusPlaceholder')" clearable style="width:100px">
            <el-option :label="t('monitor.loginLog.success')" value="1" />
            <el-option :label="t('monitor.loginLog.failed')" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('monitor.loginLog.loginTime')">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            :range-separator="t('monitor.loginLog.rangeSeparator')"
            :start-placeholder="t('monitor.loginLog.startTime')"
            :end-placeholder="t('monitor.loginLog.endTime')"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            style="width:340px"
          />
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'system:logininfor:list'" type="primary" icon="Search" @click="handleSearch">{{ t('monitor.loginLog.search') }}</el-button>
          <el-button v-perm="'system:logininfor:list'" icon="Refresh" @click="handleReset">{{ t('monitor.loginLog.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('monitor.loginLog.title') }}</span>
          <el-button
            v-perm="'system:logininfor:export'"
            icon="Download"
            :loading="exportLoading"
            :disabled="!canExport"
            :title="canExport ? undefined : t('system.common.exportRequiresSuccessfulQuery')"
            @click="handleExport"
          >
            {{ t('monitor.loginLog.export') }}
          </el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="loginLogPage?.items ?? []" border stripe>
        <el-table-column prop="user_name" :label="t('monitor.loginLog.username')" />
        <el-table-column prop="ipaddr" :label="t('monitor.loginLog.ipAddress')" />
        <el-table-column prop="login_location" :label="t('monitor.loginLog.loginLocation')" show-overflow-tooltip />
        <el-table-column prop="browser" :label="t('monitor.loginLog.browser')" show-overflow-tooltip />
        <el-table-column prop="os" :label="t('monitor.loginLog.operatingSystem')" show-overflow-tooltip />
        <el-table-column prop="status" :label="t('monitor.loginLog.status')" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">
              {{
                row.status === '1' ? t('monitor.loginLog.success') : t('monitor.loginLog.failed')
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="msg" :label="t('monitor.loginLog.message')" min-width="150" show-overflow-tooltip />
        <el-table-column :label="t('monitor.loginLog.loginTime')" min-width="160">
          <template #default="{ row }">{{ formatOptionalLocalizedDate(row.login_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('monitor.loginLog.operation')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'system:logininfor:list'" type="primary" link icon="View" @click="handleDetail(row)">{{ t('monitor.loginLog.details') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="loginLogPage?.total ?? 0" :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper" background
        @change="fetchData"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="t('monitor.loginLog.detailTitle')" width="550px">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item :label="t('monitor.loginLog.username')">{{ detailRow.user_name }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.loginLog.status')">
          <el-tag :type="detailRow.status === '1' ? 'success' : 'danger'" size="small">{{ detailRow.status === '1' ? t('monitor.loginLog.success') : t('monitor.loginLog.failed') }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('monitor.loginLog.ipAddress')">{{ detailRow.ipaddr }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.loginLog.loginLocation')">{{ detailRow.login_location }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.loginLog.browser')">{{ detailRow.browser }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.loginLog.operatingSystem')">{{ detailRow.os }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.loginLog.loginTime')" :span="2">{{ formatOptionalLocalizedDate(detailRow.login_time) }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.loginLog.message')" :span="2">{{ detailRow.msg }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">{{ t('monitor.loginLog.close') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatOptionalLocalizedDate } from '@/i18n'
import {
  exportLoginLog,
  listLoginLog,
  type LoginLogQuery,
  type LoginLogRecord,
} from '@/api/modules/monitor'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const dateRange = ref<[string, string] | []>([])
const userStore = useUserStore()
const pageActive = ref(true)
const { pending: exportLoading, submitExport } = useExportJobRequest()

const {
  appliedQuery: appliedQueryParams,
  applyDraft,
  clearSuccessfulQuery,
  draftQuery: queryParams,
  hasSuccessfulQuery: canExport,
  lastSuccessfulQuery,
  refreshApplied,
  runAppliedQuery,
} = useAppliedListQuery<LoginLogQuery>({
  page: 1,
  page_size: 10,
  user_name: '',
  status: '',
  begin_time: '',
  end_time: '',
})

watch(
  () => [userStore.tenantId, userStore.userId] as const,
  () => clearSuccessfulQuery(),
  { flush: 'sync' },
)

const loginLogsQuery = useTenantQuery<PageResponse<LoginLogRecord>>(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated' && pageActive.value,
  'monitor-login-logs',
  () => ({ scope: 'list', filters: { ...appliedQueryParams.value } }),
  signal => runAppliedQuery(signal, async (query, requestSignal) => {
    const params = { ...query }
    const response = await listLoginLog(params, requestSignal)
    return response.data ?? emptyPageResponse<LoginLogRecord>(params)
  }),
)

const loading = loginLogsQuery.isFetching
const loginLogPage = loginLogsQuery.data

async function handleExport(): Promise<void> {
  const successfulQuery = lastSuccessfulQuery.value
  if (!successfulQuery) {
    ElMessage.warning(t('system.common.exportRequiresSuccessfulQuery'))
    return
  }
  const filters = {
    user_name: successfulQuery.user_name,
    status: successfulQuery.status,
    begin_time: successfulQuery.begin_time,
    end_time: successfulQuery.end_time,
  }
  await submitExport(
    `loginlogs:${JSON.stringify(filters)}`,
    (idempotencyKey, signal) => exportLoginLog(filters, idempotencyKey, signal),
  )
}

async function fetchData(): Promise<void> {
  queryParams.value.begin_time = dateRange.value[0] ?? ''
  queryParams.value.end_time = dateRange.value[1] ?? ''
  if (applyDraft()) return
  await refreshData()
}

async function refreshData(): Promise<void> {
  await refreshApplied(async () => {
    await loginLogsQuery.refetch({ throwOnError: true })
  })
}

function handleSearch(): void {
  queryParams.value.page = 1
  void fetchData()
}

function handleReset(): void {
  queryParams.value = {
    page: 1,
    page_size: queryParams.value.page_size,
    user_name: '',
    status: '',
    begin_time: '',
    end_time: '',
  }
  dateRange.value = []
  void fetchData()
}

const detailVisible = ref(false)
const detailRow = ref<Partial<LoginLogRecord>>({})
function handleDetail(row: LoginLogRecord): void {
  detailRow.value = row
  detailVisible.value = true
}

useKeepAlivePageActive(pageActive, refreshData)
</script>
