<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('monitor.operationLog.operator')">
          <el-input
            v-model="queryParams.oper_name"
            :placeholder="t('monitor.operationLog.operatorPlaceholder')"
            clearable
          />
        </el-form-item>
        <el-form-item :label="t('monitor.operationLog.status')">
          <el-select
            v-model="queryParams.status"
            :placeholder="t('monitor.operationLog.statusPlaceholder')"
            clearable
            style="width: 100px"
          >
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
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            style="width: 340px"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            v-perm="'system:operlog:list'"
            type="primary"
            icon="Search"
            @click="handleSearch"
            >{{ t('monitor.operationLog.search') }}</el-button
          >
          <el-button v-perm="'system:operlog:list'" icon="Refresh" @click="handleReset">{{
            t('monitor.operationLog.reset')
          }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('monitor.operationLog.title') }}</span>
          <el-button
            v-perm="'system:operlog:export'"
            icon="Download"
            :loading="exportLoading"
            :disabled="!canExport"
            :title="canExport ? undefined : t('system.common.exportRequiresSuccessfulQuery')"
            @click="handleExport"
          >
            {{ t('monitor.operationLog.export') }}
          </el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="operationLogPage?.items ?? []" border stripe>
        <el-table-column
          prop="id"
          :label="t('monitor.operationLog.id')"
          width="170"
          align="center"
        />
        <el-table-column
          prop="title"
          :label="t('monitor.operationLog.operationModule')"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column prop="business_type" :label="t('monitor.operationLog.businessType')" />
        <el-table-column prop="oper_name" :label="t('monitor.operationLog.operator')" />
        <el-table-column
          prop="oper_url"
          :label="t('monitor.operationLog.requestUrl')"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column prop="oper_ip" :label="t('monitor.operationLog.operationIp')" />
        <el-table-column prop="status" :label="t('monitor.operationLog.status')" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{
              row.status === '1'
                ? t('monitor.operationLog.success')
                : t('monitor.operationLog.failed')
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="cost_time"
          :label="t('monitor.operationLog.duration')"
          align="center"
        />
        <el-table-column :label="t('monitor.operationLog.operationTime')" min-width="160">
          <template #default="{ row }">{{ formatOptionalLocalizedDate(row.oper_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('monitor.operationLog.operation')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-perm="'system:operlog:list'"
              type="primary"
              link
              icon="View"
              @click="showOperationLogDetail(row.id)"
              >{{ t('monitor.operationLog.details') }}</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="operationLogPage?.total ?? 0"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @change="fetchData"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="t('monitor.operationLog.detailTitle')" width="600px">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item :label="t('monitor.operationLog.operationModule')">{{
          detailRow.title
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.businessType')">{{
          detailRow.business_type
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.operator')">{{
          detailRow.oper_name
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.status')">
          <el-tag :type="detailRow.status === '1' ? 'success' : 'danger'" size="small">{{
            detailRow.status === '1'
              ? t('monitor.operationLog.success')
              : t('monitor.operationLog.failed')
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.requestMethod')">{{
          detailRow.request_method
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.operationIp')">{{
          detailRow.oper_ip
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.requestUrl')" :span="2">{{
          detailRow.oper_url
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.requestParameters')" :span="2">
          <div
            style="
              max-height: 150px;
              overflow-y: auto;
              word-break: break-all;
              font-size: 12px;
              font-family: monospace;
            "
          >
            {{ detailRow.oper_param }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.responseResult')" :span="2">
          <div
            style="
              max-height: 150px;
              overflow-y: auto;
              word-break: break-all;
              font-size: 12px;
              font-family: monospace;
            "
          >
            {{ detailRow.json_result }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.duration')">{{
          t('monitor.operationLog.durationValue', { value: detailRow.cost_time })
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.operationLog.operationTime')">{{
          formatOptionalLocalizedDate(detailRow.oper_time)
        }}</el-descriptions-item>
        <el-descriptions-item
          v-if="detailRow.error_msg"
          :label="t('monitor.operationLog.errorMessage')"
          :span="2"
        >
          <span style="color: var(--el-color-danger)">{{ detailRow.error_msg }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">{{ t('monitor.operationLog.close') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { formatOptionalLocalizedDate } from '@/i18n'
import {
  exportOperLog,
  listOperLog,
  type OperLogQuery,
  type OperLogRecord,
} from '@/api/modules/monitor'
import { confirmExportIntent, normalizeExportIntent } from '@/app/exports/exportIntent'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
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
} = useAppliedListQuery<OperLogQuery>({
  page: 1,
  page_size: 10,
  oper_name: '',
  status: '',
  begin_time: '',
  end_time: '',
})

watch(
  () => [userStore.tenantId, userStore.userId] as const,
  () => clearSuccessfulQuery(),
  { flush: 'sync' },
)

const operationLogsQuery = useServerStateQuery<PageResponse<OperLogRecord>>(
  () => userStore.sessionStatus === 'authenticated' && pageActive.value,
  'monitor-operation-logs',
  () => ({ scope: 'list', filters: { ...appliedQueryParams.value } }),
  (signal) =>
    runAppliedQuery(signal, async (query, requestSignal) => {
      const params = { ...query }
      const response = await listOperLog(params, requestSignal)
      return response.data ?? emptyPageResponse<OperLogRecord>(params)
    }),
)

const loading = operationLogsQuery.isFetching
const operationLogPage = operationLogsQuery.data

async function handleExport(): Promise<void> {
  const successfulQuery = lastSuccessfulQuery.value
  if (!successfulQuery) {
    ElMessage.warning(t('system.common.exportRequiresSuccessfulQuery'))
    return
  }
  const intent = normalizeExportIntent('operlogs', successfulQuery)
  if (!(await confirmExportIntent(intent))) return

  await submitExport(intent.signature, (idempotencyKey, signal) =>
    exportOperLog(intent.filter, idempotencyKey, signal, intent.isEmpty),
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
    await operationLogsQuery.refetch({ throwOnError: true })
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

function showOperationLogDetail(id: string): void {
  const row = operationLogPage.value?.items.find((item) => item.id === id)
  if (row) handleDetail(row)
}

useKeepAlivePageActive(pageActive, refreshData)
</script>
