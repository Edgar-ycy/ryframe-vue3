<template>
  <div class="page-container profile-exports-page">
    <el-card shadow="never" class="exports-card">
      <template #header>
        <div class="exports-header">
          <div class="exports-heading">
            <h2>{{ t('exportCenter.title') }}</h2>
            <p>{{ t('exportCenter.listHint') }}</p>
          </div>
          <el-button
            icon="Refresh"
            :loading="loading"
            :aria-label="t('exportCenter.refresh')"
            @click="handleRefresh"
          >
            {{ t('exportCenter.refresh') }}
          </el-button>
        </div>
      </template>

      <el-alert
        v-if="error"
        :title="listErrorMessage(error)"
        type="error"
        show-icon
        :closable="false"
        class="exports-error"
      />

      <div class="exports-filters" role="search" :aria-label="t('exportCenter.title')">
        <el-select
          v-model="statusFilter"
          :placeholder="t('exportCenter.statusFilter')"
          :aria-label="t('exportCenter.statusFilter')"
          @change="handleVisibleJobsChange"
        >
          <el-option :label="t('exportCenter.allStatuses')" value="" />
          <el-option
            v-for="status in STATUS_OPTIONS"
            :key="status"
            :label="statusLabel(status)"
            :value="status"
          />
        </el-select>
        <el-select
          v-model="resourceFilter"
          :placeholder="t('exportCenter.resourceFilter')"
          :aria-label="t('exportCenter.resourceFilter')"
          @change="handleVisibleJobsChange"
        >
          <el-option :label="t('exportCenter.allResources')" value="" />
          <el-option
            v-for="resource in RESOURCE_OPTIONS"
            :key="resource"
            :label="resourceLabel(resource)"
            :value="resource"
          />
        </el-select>
        <el-button
          type="danger"
          plain
          :loading="deletingJobIds.length > 0"
          :disabled="selectedJobIds.length === 0 || deletingJobIds.length > 0"
          @click="handleBatchDelete"
        >
          {{ t('exportCenter.deleteSelected', { count: selectedJobIds.length }) }}
        </el-button>
      </div>

      <ExportJobList
        v-model:selected-job-ids="selectedJobIds"
        :cancelling-job-id="cancellingJobId"
        :deleting-job-ids="deletingJobIds"
        :downloading-job-id="downloadingJobId"
        :jobs="jobs"
        :loading="loading"
        :visible-jobs="visibleJobs()"
        :can-cancel="canCancel"
        :can-delete="canDelete"
        :display-name="displayName"
        :is-download-unavailable="isDownloadUnavailable"
        :resource-label="resourceLabel"
        :status-label="statusLabel"
        @cancel="handleCancel"
        @delete="handleDelete"
        @download="handleDownload"
        @error="showError"
      />
    </el-card>

    <el-dialog
      v-model="errorDialogVisible"
      :title="t('exportCenter.errorDetail')"
      width="min(620px, calc(100vw - 32px))"
      @closed="selectedErrorJob = undefined"
    >
      <template v-if="selectedErrorJob">
        <p class="error-job-name">{{ displayName(selectedErrorJob) }}</p>
        <pre class="error-content">{{ selectedErrorJob.error_message }}</pre>
      </template>
      <template #footer>
        <el-button @click="errorDialogVisible = false">{{ t('exportCenter.close') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ExportJob } from '@/api/modules/exportJob'
import {
  exportJobDisplayName,
  exportJobResourceKey,
  exportJobStatusKey,
  isExportDownloadExpired,
} from '@/app/exports/exportJobPresentation'
import {
  useExportJobActions,
  useExportJobList,
  useExportNotificationState,
} from '@/app/exports/useExportJobs'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { HttpError } from '@/shared/http/client'
import { confirmAction } from '@/utils/confirmAction'
import ExportJobList from './components/ExportJobList.vue'

const { t } = useI18n()
const pageActive = ref(true)
const statusFilter = ref('')
const resourceFilter = ref('')
const selectedJobIds = ref<string[]>([])
const errorDialogVisible = ref(false)
const selectedErrorJob = ref<ExportJob>()

const { jobs, loading, error, refresh } = useExportJobList(() => pageActive.value)
const { markVisibleNotificationsRead } = useExportNotificationState(() => pageActive.value)
const {
  cancelJob,
  cancellingJobId,
  deleteJobs,
  deletingJobIds,
  downloadJob,
  downloadingJobId,
  isJobActionBusy,
} = useExportJobActions()

useKeepAlivePageActive(pageActive, handleRefresh)

onMounted(() => {
  void handleRefresh()
})

const STATUS_OPTIONS = ['queued', 'running', 'succeeded', 'failed', 'cancelled', 'expired'] as const
const RESOURCE_OPTIONS = [
  'users',
  'roles',
  'posts',
  'configs',
  'dict-types',
  'operlogs',
  'loginlogs',
] as const
const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'expired'])

watch(
  [jobs, statusFilter, resourceFilter],
  () => {
    const visibleTerminalIds = new Set(
      visibleJobs()
        .filter((job) => canDelete(job.status))
        .map((job) => job.id),
    )
    const selected = selectedJobIds.value.filter((id) => visibleTerminalIds.has(id))
    if (selected.length !== selectedJobIds.value.length) selectedJobIds.value = selected
  },
  { flush: 'sync' },
)

function visibleJobs(): ExportJob[] {
  return (jobs.value ?? []).filter(
    (job) =>
      (!statusFilter.value || job.status === statusFilter.value) &&
      (!resourceFilter.value || job.resource === resourceFilter.value),
  )
}

function handleVisibleJobsChange(): void {
  void markVisibleNotificationsRead(visibleJobs()).catch(() => undefined)
}

function displayName(job: ExportJob): string {
  return exportJobDisplayName(job)
}

function resourceLabel(resource: string): string {
  return t(exportJobResourceKey(resource))
}

function statusLabel(status: string): string {
  return t(exportJobStatusKey(status))
}

function canCancel(status: string): boolean {
  return status === 'queued' || status === 'running'
}

function canDelete(status: string): boolean {
  return TERMINAL_STATUSES.has(status)
}

function isDownloadUnavailable(job: ExportJob): boolean {
  return isExportDownloadExpired(job)
}

function listErrorMessage(value: unknown): string {
  if (value instanceof Error && value.message) return value.message
  return t('exportCenter.loadFailed')
}

function showError(job: ExportJob): void {
  selectedErrorJob.value = job
  errorDialogVisible.value = true
}

async function handleCancel(job: ExportJob): Promise<void> {
  if (!canCancel(job.status) || cancellingJobId.value || isJobActionBusy(job.id)) return
  const confirmed = await confirmAction(
    t('exportCenter.cancelConfirm', { name: displayName(job) }),
    t('exportCenter.cancelConfirmTitle'),
    { type: 'warning', confirmButtonText: t('exportCenter.cancel') },
  )
  if (!confirmed || cancellingJobId.value) return
  try {
    await cancelJob(job.id)
  } catch {
    await refreshAfterAction()
    const current = jobs.value?.find((item) => item.id === job.id)
    if (current && !canCancel(current.status)) {
      ElMessage.info(`${displayName(current)}：${statusLabel(current.status)}`)
      return
    }
    ElMessage.error(t('exportCenter.cancelFailed'))
  }
}

async function handleDownload(job: ExportJob): Promise<void> {
  if (
    job.status !== 'succeeded' ||
    isDownloadUnavailable(job) ||
    downloadingJobId.value ||
    isJobActionBusy(job.id)
  )
    return
  try {
    await downloadJob(job)
  } catch (error) {
    await refreshAfterAction()
    const current = jobs.value?.find((item) => item.id === job.id)
    if (current?.status === 'expired' || isDownloadUnavailable(current ?? job)) {
      ElMessage.error(t('exportCenter.downloadExpired'))
    } else if (error instanceof HttpError && error.status === 403) {
      ElMessage.error(t('exportCenter.downloadForbidden'))
    } else if (error instanceof HttpError && error.status === 404) {
      ElMessage.error(t('exportCenter.downloadMissing'))
    } else {
      ElMessage.error(t('exportCenter.downloadFailed'))
    }
  }
}

async function handleDelete(job: ExportJob): Promise<void> {
  await handleDeleteJobs([job])
}

async function handleBatchDelete(): Promise<void> {
  const selected = new Set(selectedJobIds.value)
  await handleDeleteJobs(
    visibleJobs().filter((job) => selected.has(job.id) && canDelete(job.status)),
  )
}

async function handleDeleteJobs(selectedJobs: readonly ExportJob[]): Promise<void> {
  if (
    selectedJobs.length === 0 ||
    selectedJobs.length > 100 ||
    deletingJobIds.value.length > 0 ||
    selectedJobs.some((job) => !canDelete(job.status) || isJobActionBusy(job.id))
  )
    return
  const message =
    selectedJobs.length === 1
      ? t('exportCenter.deleteConfirm', { name: displayName(selectedJobs[0]!) })
      : t('exportCenter.deleteBatchConfirm', { count: selectedJobs.length })
  const confirmed = await confirmAction(message, t('exportCenter.deleteConfirmTitle'), {
    type: 'warning',
    confirmButtonText: t('exportCenter.delete'),
  })
  if (!confirmed || deletingJobIds.value.length > 0) return
  try {
    const accepted = await deleteJobs(selectedJobs.map((job) => job.id))
    const removed = new Set(accepted.accepted_ids)
    selectedJobIds.value = selectedJobIds.value.filter((id) => !removed.has(id))
    ElMessage.success(
      t(
        accepted.accepted_count === 1
          ? 'exportCenter.deleteSuccess'
          : 'exportCenter.deleteBatchSuccess',
        { count: accepted.accepted_count },
      ),
    )
  } catch (actionError) {
    if (actionError instanceof HttpError && actionError.status === 409) {
      await refreshAfterAction()
      ElMessage.warning(t('exportCenter.deleteConflict'))
      return
    }
    ElMessage.error(t('exportCenter.deleteFailed'))
  }
}

async function refreshAfterAction(): Promise<void> {
  try {
    await refresh()
  } catch {
    return
  }
}

async function handleRefresh(): Promise<void> {
  try {
    await refresh()
  } catch {
    ElMessage.error(t('exportCenter.loadFailed'))
    return
  }
  try {
    await markVisibleNotificationsRead(visibleJobs())
  } catch {
    // 已读确认失败时保留徽标，不把已成功加载的任务列表误报为读取失败。
  }
}
</script>

<style scoped lang="scss">
.profile-exports-page,
.exports-card {
  min-width: 0;
  max-width: 100%;
}

.exports-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.exports-heading {
  min-width: 0;

  h2 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 18px;
    line-height: 1.4;
  }

  p {
    margin: 6px 0 0;
    color: var(--color-text-secondary);
    font-size: 13px;
    line-height: 1.5;
  }
}

.exports-error {
  margin-bottom: 12px;
}

.exports-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;

  :deep(.el-select) {
    width: min(220px, 100%);
  }
}

.error-job-name {
  margin: 0 0 12px;
  color: var(--color-text-primary);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.error-content {
  max-height: min(52vh, 360px);
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-color-danger);
  font: inherit;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@media (width <= 600px) {
  .exports-header {
    align-items: stretch;
    flex-direction: column;
  }

  .exports-header > .el-button {
    align-self: flex-start;
  }

  .exports-filters {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .exports-filters :deep(.el-select) {
    width: 100%;
  }
}
</style>
