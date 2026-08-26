<template>
  <el-drawer
    v-model="visible"
    class="export-center-drawer"
    :title="t('exportCenter.title')"
    size="min(520px, 100vw)"
    append-to-body
    @open="emit('drawer-open')"
  >
    <div class="export-center__toolbar">
      <p>{{ t('exportCenter.recentHint') }}</p>
      <el-button text :loading="loading" @click="emit('refresh')">
        {{ t('exportCenter.refresh') }}
      </el-button>
    </div>

    <div v-loading="loading" class="export-center__body">
      <el-alert
        v-if="error"
        type="warning"
        :title="t('exportCenter.loadFailed')"
        :closable="false"
        show-icon
      />
      <el-empty
        v-if="jobs.length === 0 && !loading && !error"
        :description="t('exportCenter.empty')"
      />
      <el-scrollbar v-if="jobs.length > 0" class="export-center__scrollbar">
        <article
          v-for="job in jobs"
          :key="job.id"
          class="export-job-card"
          :class="{ 'export-job-card--unread': isUnreadExportNotification(job) }"
        >
          <div class="export-job-card__heading">
            <div class="export-job-card__title-wrap">
              <strong class="export-job-card__title" :title="displayName(job)">
                {{ displayName(job) }}
              </strong>
              <span class="export-job-card__resource">{{ resourceLabel(job.resource) }}</span>
              <el-tag
                v-if="isUnreadExportNotification(job)"
                class="export-job-card__unread"
                type="primary"
                size="small"
                effect="dark"
              >
                {{ t('exportCenter.unread') }}
              </el-tag>
            </div>
            <el-tag
              :type="exportJobStatusTag(job.status)"
              size="small"
              effect="plain"
              :aria-label="
                t('exportCenter.ariaStatus', { status: t(exportJobStatusKey(job.status)) })
              "
            >
              <el-icon v-if="job.status === 'running'" class="export-job-card__running"
                ><Loading
              /></el-icon>
              {{ t(exportJobStatusKey(job.status)) }}
            </el-tag>
          </div>

          <div class="export-job-card__meta">
            <span
              >{{ t('exportCenter.createdAt') }}：{{
                formatOptionalLocalizedDate(job.created_at)
              }}</span
            >
            <span v-if="job.completed_at">
              {{ t('exportCenter.completedAt') }}：{{
                formatOptionalLocalizedDate(job.completed_at)
              }}
            </span>
            <span v-if="job.file_size !== null && job.file_size !== undefined">
              {{ t('exportCenter.fileSize') }}：{{ formatExportFileSize(job.file_size) }}
            </span>
          </div>

          <p v-if="job.error_message" class="export-job-card__error">
            {{ job.error_message }}
          </p>

          <div
            class="export-job-card__actions"
            role="group"
            :aria-label="t('exportCenter.ariaActions', { name: displayName(job) })"
          >
            <el-button
              v-if="job.status === 'queued' || job.status === 'running'"
              link
              type="danger"
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
              link
              type="primary"
              :loading="downloadingJobId === job.id"
              :disabled="
                Boolean(downloadingJobId) ||
                cancellingJobId === job.id ||
                deletingJobIds.includes(job.id) ||
                isExportDownloadExpired(job)
              "
              @click="emit('download', job)"
            >
              {{
                isExportDownloadExpired(job)
                  ? t('exportCenter.expired')
                  : t('exportCenter.download')
              }}
            </el-button>
            <el-button
              v-if="isTerminalExportJob(job)"
              link
              type="danger"
              :loading="deletingJobIds.includes(job.id)"
              :disabled="
                deletingJobIds.length > 0 ||
                cancellingJobId === job.id ||
                downloadingJobId === job.id
              "
              @click="emit('delete', job)"
            >
              {{ t('exportCenter.delete') }}
            </el-button>
          </div>
        </article>
      </el-scrollbar>
    </div>

    <template #footer>
      <el-button type="primary" plain @click="emit('view-all')">
        {{ t('exportCenter.viewAll') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { ExportJob } from '@/api/modules/exportJob'
import { formatOptionalLocalizedDate } from '@/i18n'
import {
  exportJobDisplayName,
  exportJobResourceKey,
  exportJobStatusKey,
  exportJobStatusTag,
  formatExportFileSize,
  isExportDownloadExpired,
} from '@/app/exports/exportJobPresentation'
import { isTerminalExportJob, isUnreadExportNotification } from '@/app/exports/exportJobCache'

defineProps<{
  jobs: ExportJob[]
  loading: boolean
  error: unknown
  cancellingJobId?: string
  deletingJobIds: readonly string[]
  downloadingJobId?: string
}>()

const emit = defineEmits<{
  'drawer-open': []
  refresh: []
  cancel: [job: ExportJob]
  delete: [job: ExportJob]
  download: [job: ExportJob]
  'view-all': []
}>()

const visible = defineModel<boolean>('visible', { required: true })
const { t } = useI18n()

function resourceLabel(resource: string): string {
  return t(exportJobResourceKey(resource))
}

function displayName(job: ExportJob): string {
  return exportJobDisplayName(job)
}
</script>

<style scoped lang="scss">
.export-center__toolbar,
.export-job-card__heading,
.export-job-card__actions {
  display: flex;
  align-items: center;
}

.export-job-card__running {
  margin-right: 3px;
  animation: export-job-rotate 1s linear infinite;
}

@keyframes export-job-rotate {
  to {
    transform: rotate(360deg);
  }
}

.export-center__toolbar {
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.export-center__body {
  min-height: 240px;
  padding-top: 10px;
}

.export-center__scrollbar {
  max-height: calc(100vh - 190px);
}

.export-job-card {
  padding: 14px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.export-job-card--unread {
  box-shadow: inset 3px 0 0 var(--el-color-primary);
}

.export-job-card__unread {
  margin-top: 6px;
}

.export-job-card__heading {
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.export-job-card__title-wrap {
  min-width: 0;
}

.export-job-card__title,
.export-job-card__resource {
  display: block;
}

.export-job-card__title {
  overflow: hidden;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.export-job-card__resource {
  margin-top: 3px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.export-job-card__meta {
  display: grid;
  gap: 3px;
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.export-job-card__error {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 8px;
  color: var(--el-color-danger);
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.export-job-card__actions {
  justify-content: flex-end;
  min-height: 28px;
  margin-top: 5px;
}

@media (width <= 480px) {
  .export-center__scrollbar {
    max-height: calc(100dvh - 180px);
  }

  .export-center__toolbar .el-button,
  .export-job-card__actions .el-button {
    min-width: 40px;
    min-height: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .export-job-card__running {
    animation: none;
  }
}
</style>
