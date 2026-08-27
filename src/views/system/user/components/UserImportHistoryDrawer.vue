<template>
  <el-drawer
    v-model="visible"
    :title="t('system.userImport.history')"
    size="min(980px, calc(100vw - 24px))"
    @open="handleOpen"
    @closed="handleClosed"
  >
    <div class="drawer-actions">
      <el-button icon="Refresh" :loading="importsQuery.isFetching.value" @click="refreshImports">
        {{ t('system.userImport.refresh') }}
      </el-button>
    </div>
    <div class="table-scroll">
      <el-table
        v-loading="importsQuery.isFetching.value"
        :data="importsQuery.data.value?.items ?? []"
        border
        stripe
        class="imports-table"
        :empty-text="t('common.noData')"
      >
        <el-table-column
          prop="source_name"
          :label="t('system.userImport.sourceName')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          :label="t('system.userImport.requester')"
          min-width="130"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ row.requester_username || '—' }}</template>
        </el-table-column>
        <el-table-column :label="t('system.userImport.status')" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{
              statusLabel(row.status)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('system.userImport.progress')" min-width="190">
          <template #default="{ row }">
            <el-progress :percentage="progressById(row.id)" :status="progressStatus(row.status)" />
            <small>{{ row.processed_rows }} / {{ row.total_rows || '—' }}</small>
          </template>
        </el-table-column>
        <el-table-column
          prop="success_count"
          :label="t('system.userImport.successCount')"
          width="86"
        />
        <el-table-column
          prop="skipped_count"
          :label="t('system.userImport.skippedCount')"
          width="86"
        />
        <el-table-column
          prop="failure_count"
          :label="t('system.userImport.failureCount')"
          width="86"
        />
        <el-table-column :label="t('system.userImport.createdAt')" min-width="160">
          <template #default="{ row }">{{ formatLocalizedDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column :label="t('system.userImport.operation')" min-width="230" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetailsById(row.id)">{{
              t('system.userImport.details')
            }}</el-button>
            <el-button
              v-if="isActive(row.status) && hasPermission('system:user-import:cancel')"
              type="danger"
              link
              :loading="isCancelling(row.id)"
              :disabled="cancelMutation.pending.value"
              @click="cancelImportById(row.id)"
            >
              {{ t('system.userImport.cancel') }}
            </el-button>
            <el-button
              v-if="row.report_available"
              type="success"
              link
              :loading="reportLoadingId === row.id"
              @click="downloadReportById(row.id)"
            >
              {{ t('system.userImport.report') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-pagination
      v-model:current-page="query.page"
      v-model:page-size="query.page_size"
      :total="importsQuery.data.value?.total ?? 0"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      background
      @change="fetchImports"
    />

    <template v-if="selectedId && currentJob()">
      <el-divider />
      <h3 class="detail-title">{{ t('system.userImport.details') }}</h3>
      <el-descriptions :column="2" border class="job-details">
        <el-descriptions-item :label="t('system.userImport.sourceName')">{{
          currentJob()!.source_name
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('system.userImport.requester')">{{
          currentJob()!.requester_username || '—'
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('system.userImport.status')">{{
          statusLabel(currentJob()!.status)
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('system.userImport.totalRows')">{{
          currentJob()!.total_rows
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('system.userImport.processedRows')">{{
          currentJob()!.processed_rows
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('system.userImport.startedAt')">{{
          formatOptionalLocalizedDate(currentJob()!.started_at)
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('system.userImport.completedAt')">{{
          formatOptionalLocalizedDate(currentJob()!.completed_at)
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('system.userImport.lastError')" :span="2">{{
          currentJob()!.last_error || '—'
        }}</el-descriptions-item>
      </el-descriptions>

      <h3 class="detail-title">{{ t('system.userImport.rowResults') }}</h3>
      <div class="table-scroll">
        <el-table
          v-loading="rowsQuery.isFetching.value"
          :data="rowsQuery.data.value?.items ?? []"
          border
          stripe
          class="rows-table"
          :empty-text="t('system.userImport.noRows')"
        >
          <el-table-column
            prop="row_number"
            :label="t('system.userImport.rowNumber')"
            width="110"
          />
          <el-table-column
            prop="username"
            :label="t('system.userImport.username')"
            min-width="140"
            show-overflow-tooltip
          />
          <el-table-column :label="t('system.userImport.outcome')" width="100">
            <template #default="{ row }">{{ outcomeLabel(row.outcome) }}</template>
          </el-table-column>
          <el-table-column
            prop="code"
            :label="t('system.userImport.code')"
            min-width="150"
            show-overflow-tooltip
          />
          <el-table-column
            prop="message"
            :label="t('system.userImport.message')"
            min-width="240"
            show-overflow-tooltip
          />
        </el-table>
      </div>
      <el-pagination
        v-model:current-page="rowQuery.page"
        v-model:page-size="rowQuery.page_size"
        :total="rowsQuery.data.value?.total ?? 0"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @change="fetchRows"
      />
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onActivated, onDeactivated, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  cancelUserImport,
  downloadUserImportReport,
  getUserImport,
  listUserImportRows,
  listUserImports,
  type UserImportJob,
  type UserImportRow,
} from '@/api/modules/userImport'
import { downloadBlobDirect } from '@/hooks/useDownload'
import { usePermission } from '@/hooks/usePermission'
import { formatLocalizedDate, formatOptionalLocalizedDate } from '@/i18n'
import { requireOperationData } from '@/shared/http/client'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const { hasPermission } = usePermission()
const userStore = useUserStore()
const queryReady = ref(false)
const selectedId = ref('')
const query = ref({ page: 1, page_size: 10 })
const rowQuery = ref({ page: 1, page_size: 10 })
const reportLoadingId = ref('')
let pollTimer: number | undefined

const importsQuery = useServerStateQuery<PageResponse<UserImportJob>>(
  () => userStore.sessionStatus === 'authenticated' && visible.value && queryReady.value,
  'user-imports',
  () => ({ scope: 'list', ...query.value }),
  async (signal) => {
    const response = await listUserImports(query.value, signal)
    return response.data ?? emptyPageResponse<UserImportJob>(query.value)
  },
  { refetchInterval: false },
)

const detailQuery = useServerStateQuery<UserImportJob>(
  () => userStore.sessionStatus === 'authenticated' && visible.value && Boolean(selectedId.value),
  'user-import-detail',
  () => ({ id: selectedId.value }),
  async (signal) => requireOperationData(await getUserImport(selectedId.value, signal)),
  { refetchInterval: false },
)

const rowsQuery = useServerStateQuery<PageResponse<UserImportRow>>(
  () => userStore.sessionStatus === 'authenticated' && visible.value && Boolean(selectedId.value),
  'user-import-rows',
  () => ({ id: selectedId.value, ...rowQuery.value }),
  async (signal) => {
    if (!selectedId.value) return emptyPageResponse<UserImportRow>(rowQuery.value)
    const response = await listUserImportRows(selectedId.value, rowQuery.value, signal)
    return response.data ?? emptyPageResponse<UserImportRow>(rowQuery.value)
  },
  { refetchInterval: false },
)

const cancelMutation = useServerStateMutation('user-imports', {
  mutationFn: (job: UserImportJob) => cancelUserImport(job.id),
  onSuccess: () => ElMessage.success(t('system.userImport.cancelSuccess')),
})

onActivated(() => {
  if (visible.value) void refreshImports()
})
onDeactivated(clearPolling)
onUnmounted(clearPolling)

function isActive(status: string): boolean {
  return status === 'pending' || status === 'running'
}

function hasActiveJobs(): boolean {
  return (importsQuery.data.value?.items ?? []).some((job) => isActive(job.status))
}

function clearPolling(): void {
  if (pollTimer !== undefined) window.clearTimeout(pollTimer)
  pollTimer = undefined
}

function schedulePolling(): void {
  clearPolling()
  if (!visible.value || !queryReady.value || !hasActiveJobs()) return
  pollTimer = window.setTimeout(async () => {
    pollTimer = undefined
    await Promise.all([
      importsQuery.refetch(),
      selectedId.value ? detailQuery.refetch() : Promise.resolve(),
    ])
    schedulePolling()
  }, 5_000)
}

function handleOpen(): void {
  queryReady.value = true
  void refreshImports()
}

function handleClosed(): void {
  queryReady.value = false
  selectedId.value = ''
  clearPolling()
}

function fetchImports(): void {
  void refreshImports()
}

async function refreshImports(): Promise<void> {
  clearPolling()
  await importsQuery.refetch({ throwOnError: true })
  schedulePolling()
}

function currentJob(): UserImportJob | undefined {
  return (
    detailQuery.data.value ??
    importsQuery.data.value?.items.find((job) => job.id === selectedId.value)
  )
}

function progressById(id: string): number {
  const job = importsQuery.data.value?.items.find((item) => item.id === id)
  if (!job) return 0
  if (job.total_rows <= 0) return isActive(job.status) ? 0 : 100
  return Math.min(100, Math.round((job.processed_rows / job.total_rows) * 100))
}

function openDetailsById(id: string): void {
  const job = importsQuery.data.value?.items.find((item) => item.id === id)
  if (!job) return
  selectedId.value = job.id
  rowQuery.value = { page: 1, page_size: rowQuery.value.page_size }
}

function progressStatus(status: string): '' | 'exception' | 'success' | 'warning' {
  if (status === 'succeeded') return 'success'
  if (status === 'failed' || status === 'cancelled') return 'exception'
  if (status === 'partial') return 'warning'
  return ''
}

function statusLabel(status: string): string {
  const key =
    {
      pending: 'statusPending',
      running: 'statusRunning',
      succeeded: 'statusSucceeded',
      partial: 'statusPartial',
      failed: 'statusFailed',
      cancelled: 'statusCancelled',
    }[status] ?? 'statusFailed'
  return t(`system.userImport.${key}`)
}

function statusTag(status: string): 'danger' | 'info' | 'primary' | 'success' | 'warning' {
  if (status === 'succeeded') return 'success'
  if (status === 'partial') return 'warning'
  if (status === 'failed' || status === 'cancelled') return 'danger'
  if (status === 'running') return 'primary'
  return 'info'
}

function outcomeLabel(outcome: string): string {
  return t(
    outcome === 'skipped' ? 'system.userImport.outcomeSkipped' : 'system.userImport.outcomeFailed',
  )
}

function isCancelling(id: string): boolean {
  return cancelMutation.pending.value && cancelMutation.variables.value?.id === id
}

async function cancelImportById(id: string): Promise<void> {
  const job = importsQuery.data.value?.items.find((item) => item.id === id)
  if (!job || cancelMutation.pending.value) return
  const confirmed = await confirmAction(
    t('system.userImport.cancelConfirm', { name: job.source_name }),
    t('system.userImport.cancelConfirmTitle'),
    { type: 'warning' },
  )
  if (!confirmed || cancelMutation.pending.value) return
  await cancelMutation.mutateAsync(job)
  await refreshImports()
}

async function downloadReportById(id: string): Promise<void> {
  const job = importsQuery.data.value?.items.find((item) => item.id === id)
  if (!job || reportLoadingId.value) return
  reportLoadingId.value = job.id
  try {
    const blob = await downloadUserImportReport(job.id)
    downloadBlobDirect(blob, `${job.source_name.replace(/\.xlsx$/iu, '')}-report.xlsx`)
    ElMessage.success(t('shell.download.success'))
  } finally {
    reportLoadingId.value = ''
  }
}

function fetchRows(): void {
  void rowsQuery.refetch({ throwOnError: true })
}
</script>

<style scoped lang="scss" src="./UserImportHistoryDrawer.scss"></style>
