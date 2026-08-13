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
      </div>

      <div class="exports-desktop">
        <div class="exports-table-scroll">
          <el-table
            v-loading="loading"
            :data="visibleJobs()"
            border
            stripe
            class="exports-table"
            :empty-text="t(jobs?.length ? 'exportCenter.filtersEmpty' : 'exportCenter.empty')"
          >
            <el-table-column :label="t('exportCenter.fileName')" min-width="190" show-overflow-tooltip>
              <template #default="{ row }">
                {{ displayName(row) }}
              </template>
            </el-table-column>
            <el-table-column :label="t('exportCenter.resource')" min-width="120">
              <template #default="{ row }">{{ resourceLabel(row.resource) }}</template>
            </el-table-column>
            <el-table-column :label="t('exportCenter.status')" width="112" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="exportJobStatusTag(row.status)"
                  size="small"
                  :aria-label="t('exportCenter.ariaStatus', { status: statusLabel(row.status) })"
                >
                  <span v-if="row.status === 'running'" class="running-dot" aria-hidden="true" />
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('exportCenter.fileSize')" min-width="105" align="right">
              <template #default="{ row }">{{ formatExportFileSize(row.file_size) }}</template>
            </el-table-column>
            <el-table-column :label="t('exportCenter.createdAt')" min-width="165">
              <template #default="{ row }">{{ formatOptionalLocalizedDate(row.created_at) }}</template>
            </el-table-column>
            <el-table-column :label="t('exportCenter.completedAt')" min-width="165">
              <template #default="{ row }">{{ formatOptionalLocalizedDate(row.completed_at) }}</template>
            </el-table-column>
            <el-table-column :label="t('exportCenter.expiresAt')" min-width="165">
              <template #default="{ row }">{{ formatOptionalLocalizedDate(row.expires_at) }}</template>
            </el-table-column>
            <el-table-column :label="t('exportCenter.errorSummary')" min-width="140">
              <template #default="{ row }">
                <el-button
                  v-if="row.error_message"
                  type="danger"
                  link
                  @click="showError(row)"
                >
                  {{ t('exportCenter.viewError') }}
                </el-button>
                <span v-else>{{ t('exportCenter.noError') }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="t('exportCenter.operation')" width="176" fixed="right" align="center">
              <template #default="{ row }">
                <div
                  class="row-actions"
                  role="group"
                  :aria-label="t('exportCenter.ariaActions', { name: displayName(row) })"
                >
                  <el-button
                    v-if="canCancel(row.status)"
                    type="danger"
                    link
                    :loading="cancellingJobId === row.id"
                    :disabled="Boolean(cancellingJobId)"
                    @click="handleCancel(row)"
                  >
                    {{ t('exportCenter.cancel') }}
                  </el-button>
                  <el-button
                    v-if="row.status === 'succeeded'"
                    type="primary"
                    link
                    :loading="downloadingJobId === row.id"
                    :disabled="isDownloadUnavailable(row) || Boolean(downloadingJobId)"
                    :title="isDownloadUnavailable(row) ? t('exportCenter.downloadExpired') : t('exportCenter.download')"
                    @click="handleDownload(row)"
                  >
                    {{ isDownloadUnavailable(row) ? t('exportCenter.expired') : t('exportCenter.download') }}
                  </el-button>
                  <span v-if="!canCancel(row.status) && row.status !== 'succeeded'">—</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div
        v-loading="loading"
        class="exports-mobile"
        :aria-label="t('exportCenter.title')"
      >
        <el-empty
          v-if="visibleJobs().length === 0"
          :description="t(jobs?.length ? 'exportCenter.filtersEmpty' : 'exportCenter.empty')"
        />
        <article
          v-for="job in visibleJobs()"
          :key="job.id"
          class="export-card"
        >
          <div class="export-card__title">
            <strong>{{ displayName(job) }}</strong>
            <el-tag :type="exportJobStatusTag(job.status)" size="small">
              <span v-if="job.status === 'running'" class="running-dot" aria-hidden="true" />
              {{ statusLabel(job.status) }}
            </el-tag>
          </div>
          <dl class="export-card__details">
            <div>
              <dt>{{ t('exportCenter.resource') }}</dt>
              <dd>{{ resourceLabel(job.resource) }}</dd>
            </div>
            <div>
              <dt>{{ t('exportCenter.fileSize') }}</dt>
              <dd>{{ formatExportFileSize(job.file_size) }}</dd>
            </div>
            <div>
              <dt>{{ t('exportCenter.createdAt') }}</dt>
              <dd>{{ formatOptionalLocalizedDate(job.created_at) }}</dd>
            </div>
            <div>
              <dt>{{ t('exportCenter.completedAt') }}</dt>
              <dd>{{ formatOptionalLocalizedDate(job.completed_at) }}</dd>
            </div>
            <div>
              <dt>{{ t('exportCenter.expiresAt') }}</dt>
              <dd>{{ formatOptionalLocalizedDate(job.expires_at) }}</dd>
            </div>
          </dl>
          <button
            v-if="job.error_message"
            type="button"
            class="export-card__error"
            @click="showError(job)"
          >
            {{ job.error_message }}
          </button>
          <div
            v-if="canCancel(job.status) || job.status === 'succeeded'"
            class="export-card__actions"
            role="group"
            :aria-label="t('exportCenter.ariaActions', { name: displayName(job) })"
          >
            <el-button
              v-if="canCancel(job.status)"
              type="danger"
              plain
              :loading="cancellingJobId === job.id"
              :disabled="Boolean(cancellingJobId)"
              @click="handleCancel(job)"
            >
              {{ t('exportCenter.cancel') }}
            </el-button>
            <el-button
              v-if="job.status === 'succeeded'"
              type="primary"
              :loading="downloadingJobId === job.id"
              :disabled="isDownloadUnavailable(job) || Boolean(downloadingJobId)"
              :title="isDownloadUnavailable(job) ? t('exportCenter.downloadExpired') : t('exportCenter.download')"
              @click="handleDownload(job)"
            >
              {{ isDownloadUnavailable(job) ? t('exportCenter.expired') : t('exportCenter.download') }}
            </el-button>
          </div>
        </article>
      </div>
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
  exportJobStatusTag,
  formatExportFileSize,
  isExportDownloadExpired,
} from '@/app/exports/exportJobPresentation'
import {
  useExportJobActions,
  useExportJobList,
  useExportNotificationState,
} from '@/app/exports/useExportJobs'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { formatOptionalLocalizedDate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import { confirmAction } from '@/utils/confirmAction'

const { t } = useI18n()
const pageActive = ref(true)
const statusFilter = ref('')
const resourceFilter = ref('')
const errorDialogVisible = ref(false)
const selectedErrorJob = ref<ExportJob>()

const { jobs, loading, error, refresh } = useExportJobList(() => pageActive.value)
const { markVisibleNotificationsRead } = useExportNotificationState(() => pageActive.value)
const {
  cancelJob,
  cancellingJobId,
  downloadJob,
  downloadingJobId,
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

function visibleJobs(): ExportJob[] {
  return (jobs.value ?? []).filter(job => (
    (!statusFilter.value || job.status === statusFilter.value)
    && (!resourceFilter.value || job.resource === resourceFilter.value)
  ))
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
  if (!canCancel(job.status) || cancellingJobId.value) return
  const confirmed = await confirmAction(
    t('exportCenter.cancelConfirm', { name: displayName(job) }),
    t('exportCenter.cancelConfirmTitle'),
    { type: 'warning', confirmButtonText: t('exportCenter.cancel') },
  )
  if (!confirmed || cancellingJobId.value) return
  try {
    await cancelJob(job.id)
  }
  catch {
    await refreshAfterAction()
    const current = jobs.value?.find(item => item.id === job.id)
    if (current && !canCancel(current.status)) {
      ElMessage.info(`${displayName(current)}：${statusLabel(current.status)}`)
      return
    }
    ElMessage.error(t('exportCenter.cancelFailed'))
  }
}

async function handleDownload(job: ExportJob): Promise<void> {
  if (job.status !== 'succeeded' || isDownloadUnavailable(job) || downloadingJobId.value) return
  try {
    await downloadJob(job)
  }
  catch (error) {
    await refreshAfterAction()
    const current = jobs.value?.find(item => item.id === job.id)
    if (current?.status === 'expired' || isDownloadUnavailable(current ?? job)) {
      ElMessage.error(t('exportCenter.downloadExpired'))
    }
    else if (error instanceof HttpError && error.status === 403) {
      ElMessage.error(t('exportCenter.downloadForbidden'))
    }
    else if (error instanceof HttpError && error.status === 404) {
      ElMessage.error(t('exportCenter.downloadMissing'))
    }
    else {
      ElMessage.error(t('exportCenter.downloadFailed'))
    }
  }
}

async function refreshAfterAction(): Promise<void> {
  try {
    await refresh()
  }
  catch {
    return
  }
}

async function handleRefresh(): Promise<void> {
  try {
    await refresh()
  }
  catch {
    ElMessage.error(t('exportCenter.loadFailed'))
    return
  }
  try {
    await markVisibleNotificationsRead(visibleJobs())
  }
  catch {
    // 已读确认失败时保留徽标，不把已成功加载的任务列表误报为读取失败。
  }
}
</script>

<style scoped lang="scss">
.profile-exports-page {
  min-width: 0;
  max-width: 100%;
}

.exports-card {
  min-width: 0;
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

.exports-table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.exports-table {
  min-width: 1260px;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.running-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 4px;
  border-radius: 50%;
  background: currentcolor;
  animation: running-pulse 1.4s ease-in-out infinite;
}

.exports-mobile {
  display: none;
  min-height: 80px;
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

@keyframes running-pulse {
  0%,
  100% {
    opacity: 0.4;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .running-dot {
    animation: none;
  }
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

  .exports-desktop {
    display: none;
  }

  .exports-mobile {
    display: grid;
    gap: 12px;
  }

  .export-card {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-bg-color);
  }

  .export-card__title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;

    strong {
      min-width: 0;
      color: var(--color-text-primary);
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .el-tag {
      flex: none;
    }
  }

  .export-card__details {
    display: grid;
    gap: 8px;
    margin: 12px 0 0;

    div {
      display: grid;
      grid-template-columns: minmax(88px, 0.4fr) minmax(0, 1fr);
      gap: 8px;
    }

    dt,
    dd {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }

    dt {
      color: var(--color-text-secondary);
    }

    dd {
      color: var(--color-text-primary);
      overflow-wrap: anywhere;
    }
  }

  .export-card__error {
    display: -webkit-box;
    width: 100%;
    max-height: 44px;
    margin-top: 12px;
    padding: 0;
    overflow: hidden;
    border: 0;
    background: transparent;
    color: var(--el-color-danger);
    font: inherit;
    line-height: 22px;
    text-align: left;
    overflow-wrap: anywhere;
    cursor: pointer;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .export-card__actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;

    .el-button {
      min-height: 40px;
      margin-left: 0;
    }
  }
}
</style>
