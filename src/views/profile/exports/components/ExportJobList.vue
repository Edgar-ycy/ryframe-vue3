<template>
  <div class="exports-desktop">
    <div class="exports-table-scroll">
      <el-table
        v-loading="loading"
        :data="visibleJobs"
        border
        stripe
        class="exports-table"
        :empty-text="t(jobs?.length ? 'exportCenter.filtersEmpty' : 'exportCenter.empty')"
      >
        <el-table-column width="52" align="center">
          <template #header>
            <el-checkbox
              :model-value="allTerminalSelected()"
              :indeterminate="someTerminalSelected()"
              :disabled="deletingJobIds.length > 0 || terminalVisibleIds().length === 0"
              :aria-label="t('exportCenter.selectAllTerminal')"
              @change="toggleVisibleSelection"
            />
          </template>
          <template #default="{ row }">
            <el-checkbox
              v-if="canDelete(row.status)"
              :model-value="selectedJobIds.includes(row.id)"
              :disabled="deletingJobIds.length > 0"
              :aria-label="t('exportCenter.selectJob', { name: displayNameById(row.id) })"
              @change="toggleJobSelection(row.id, $event)"
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('exportCenter.fileName')" min-width="190" show-overflow-tooltip>
          <template #default="{ row }">{{ displayNameById(row.id) }}</template>
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
          <template #default="{ row }">{{
            formatOptionalLocalizedDate(row.completed_at)
          }}</template>
        </el-table-column>
        <el-table-column :label="t('exportCenter.expiresAt')" min-width="165">
          <template #default="{ row }">{{ formatOptionalLocalizedDate(row.expires_at) }}</template>
        </el-table-column>
        <el-table-column :label="t('exportCenter.errorSummary')" min-width="140">
          <template #default="{ row }">
            <el-button v-if="row.error_message" type="danger" link @click="showErrorById(row.id)">
              {{ t('exportCenter.viewError') }}
            </el-button>
            <span v-else>{{ t('exportCenter.noError') }}</span>
          </template>
        </el-table-column>
        <el-table-column
          :label="t('exportCenter.operation')"
          width="220"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <div
              class="row-actions"
              role="group"
              :aria-label="t('exportCenter.ariaActions', { name: displayNameById(row.id) })"
            >
              <el-button
                v-if="canCancel(row.status)"
                type="danger"
                link
                :loading="cancellingJobId === row.id"
                :disabled="
                  Boolean(cancellingJobId) ||
                  downloadingJobId === row.id ||
                  deletingJobIds.includes(row.id)
                "
                @click="cancelById(row.id)"
              >
                {{ t('exportCenter.cancel') }}
              </el-button>
              <el-button
                v-if="row.status === 'succeeded'"
                type="primary"
                link
                :loading="downloadingJobId === row.id"
                :disabled="
                  isDownloadUnavailableById(row.id) ||
                  Boolean(downloadingJobId) ||
                  cancellingJobId === row.id ||
                  deletingJobIds.includes(row.id)
                "
                :title="
                  isDownloadUnavailableById(row.id)
                    ? t('exportCenter.downloadExpired')
                    : t('exportCenter.download')
                "
                @click="downloadById(row.id)"
              >
                {{
                  isDownloadUnavailableById(row.id)
                    ? t('exportCenter.expired')
                    : t('exportCenter.download')
                }}
              </el-button>
              <el-button
                v-if="canDelete(row.status)"
                type="danger"
                link
                :loading="deletingJobIds.includes(row.id)"
                :disabled="
                  deletingJobIds.length > 0 ||
                  cancellingJobId === row.id ||
                  downloadingJobId === row.id
                "
                @click="deleteById(row.id)"
              >
                {{ t('exportCenter.delete') }}
              </el-button>
              <span
                v-if="
                  !canCancel(row.status) && row.status !== 'succeeded' && !canDelete(row.status)
                "
                >—</span
              >
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>

  <div v-loading="loading" class="exports-mobile" :aria-label="t('exportCenter.title')">
    <el-empty
      v-if="visibleJobs.length === 0"
      :description="t(jobs?.length ? 'exportCenter.filtersEmpty' : 'exportCenter.empty')"
    />
    <div v-if="terminalVisibleIds().length > 0" class="exports-mobile__selection">
      <el-checkbox
        :model-value="allTerminalSelected()"
        :indeterminate="someTerminalSelected()"
        :disabled="deletingJobIds.length > 0"
        @change="toggleVisibleSelection"
      >
        {{ t('exportCenter.selectAllTerminal') }}
      </el-checkbox>
    </div>
    <article v-for="job in visibleJobs" :key="job.id" class="export-card">
      <div class="export-card__title">
        <div class="export-card__title-main">
          <el-checkbox
            v-if="canDelete(job.status)"
            :model-value="selectedJobIds.includes(job.id)"
            :disabled="deletingJobIds.length > 0"
            :aria-label="t('exportCenter.selectJob', { name: displayName(job) })"
            @change="toggleJobSelection(job.id, $event)"
          />
          <strong>{{ displayName(job) }}</strong>
        </div>
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
        @click="emit('error', job)"
      >
        {{ job.error_message }}
      </button>
      <div
        v-if="canCancel(job.status) || job.status === 'succeeded' || canDelete(job.status)"
        class="export-card__actions"
        role="group"
        :aria-label="t('exportCenter.ariaActions', { name: displayName(job) })"
      >
        <el-button
          v-if="canCancel(job.status)"
          type="danger"
          plain
          :loading="cancellingJobId === job.id"
          :disabled="
            Boolean(cancellingJobId) ||
            downloadingJobId === job.id ||
            deletingJobIds.includes(job.id)
          "
          @click="emit('cancel', job)"
        >
          {{ t('exportCenter.cancel') }}
        </el-button>
        <el-button
          v-if="job.status === 'succeeded'"
          type="primary"
          :loading="downloadingJobId === job.id"
          :disabled="
            isDownloadUnavailable(job) ||
            Boolean(downloadingJobId) ||
            cancellingJobId === job.id ||
            deletingJobIds.includes(job.id)
          "
          :title="
            isDownloadUnavailable(job)
              ? t('exportCenter.downloadExpired')
              : t('exportCenter.download')
          "
          @click="emit('download', job)"
        >
          {{ isDownloadUnavailable(job) ? t('exportCenter.expired') : t('exportCenter.download') }}
        </el-button>
        <el-button
          v-if="canDelete(job.status)"
          type="danger"
          :loading="deletingJobIds.includes(job.id)"
          :disabled="
            deletingJobIds.length > 0 || cancellingJobId === job.id || downloadingJobId === job.id
          "
          @click="emit('delete', job)"
        >
          {{ t('exportCenter.delete') }}
        </el-button>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ExportJob } from '@/api/modules/exportJob'
import { exportJobStatusTag, formatExportFileSize } from '@/app/exports/exportJobPresentation'
import { formatOptionalLocalizedDate } from '@/i18n'
import {
  areAllExportJobsSelected,
  areSomeExportJobsSelected,
  terminalExportJobIds,
  updateExportJobSelection,
  updateVisibleExportJobSelection,
} from './exportJobSelection'

const props = defineProps<{
  cancellingJobId?: string
  deletingJobIds: readonly string[]
  downloadingJobId?: string
  jobs?: ExportJob[]
  loading: boolean
  selectedJobIds: readonly string[]
  visibleJobs: ExportJob[]
  canCancel: (status: string) => boolean
  canDelete: (status: string) => boolean
  displayName: (job: ExportJob) => string
  isDownloadUnavailable: (job: ExportJob) => boolean
  resourceLabel: (resource: string) => string
  statusLabel: (status: string) => string
}>()

const emit = defineEmits<{
  cancel: [job: ExportJob]
  delete: [job: ExportJob]
  download: [job: ExportJob]
  error: [job: ExportJob]
  'update:selectedJobIds': [jobIds: string[]]
}>()

const { t } = useI18n()

function terminalVisibleIds(): string[] {
  return terminalExportJobIds(props.visibleJobs, props.canDelete)
}

function allTerminalSelected(): boolean {
  return areAllExportJobsSelected(terminalVisibleIds(), props.selectedJobIds)
}

function someTerminalSelected(): boolean {
  return areSomeExportJobsSelected(terminalVisibleIds(), props.selectedJobIds)
}

function toggleJobSelection(jobId: string, checked: unknown): void {
  if (checked && props.selectedJobIds.includes(jobId)) return
  emit(
    'update:selectedJobIds',
    updateExportJobSelection(props.selectedJobIds, jobId, Boolean(checked)),
  )
}

function toggleVisibleSelection(checked: unknown): void {
  emit(
    'update:selectedJobIds',
    updateVisibleExportJobSelection(props.selectedJobIds, terminalVisibleIds(), Boolean(checked)),
  )
}

function findVisibleJob(id: string): ExportJob | undefined {
  return props.visibleJobs.find((job) => job.id === id)
}

function displayNameById(id: string): string {
  const job = findVisibleJob(id)
  return job ? props.displayName(job) : ''
}

function isDownloadUnavailableById(id: string): boolean {
  const job = findVisibleJob(id)
  return job ? props.isDownloadUnavailable(job) : true
}

function showErrorById(id: string): void {
  const job = findVisibleJob(id)
  if (job) emit('error', job)
}

function cancelById(id: string): void {
  const job = findVisibleJob(id)
  if (job) emit('cancel', job)
}

function downloadById(id: string): void {
  const job = findVisibleJob(id)
  if (job) emit('download', job)
}

function deleteById(id: string): void {
  const job = findVisibleJob(id)
  if (job) emit('delete', job)
}
</script>

<style scoped lang="scss">
.exports-table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.exports-table {
  min-width: 1340px;
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
  .exports-desktop {
    display: none;
  }

  .exports-mobile {
    display: grid;
    gap: 12px;
  }

  .exports-mobile__selection {
    padding: 10px 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
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

  .export-card__title-main {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: 8px;

    strong {
      min-width: 0;
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
