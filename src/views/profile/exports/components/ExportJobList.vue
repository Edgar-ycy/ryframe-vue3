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
        <el-table-column :label="t('exportCenter.fileName')" min-width="190" show-overflow-tooltip>
          <template #default="{ row }">{{ displayName(row) }}</template>
        </el-table-column>
        <el-table-column :label="t('exportCenter.resource')" min-width="120">
          <template #default="{ row }">{{ resourceLabel(row.resource) }}</template>
        </el-table-column>
        <el-table-column :label="t('exportCenter.status')" width="112" align="center">
          <template #default="{ row }">
            <el-tag :type="exportJobStatusTag(row.status)" size="small" :aria-label="t('exportCenter.ariaStatus', { status: statusLabel(row.status) })">
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
            <el-button v-if="row.error_message" type="danger" link @click="emit('error', row)">
              {{ t('exportCenter.viewError') }}
            </el-button>
            <span v-else>{{ t('exportCenter.noError') }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('exportCenter.operation')" width="176" fixed="right" align="center">
          <template #default="{ row }">
            <div class="row-actions" role="group" :aria-label="t('exportCenter.ariaActions', { name: displayName(row) })">
              <el-button
                v-if="canCancel(row.status)"
                type="danger"
                link
                :loading="cancellingJobId === row.id"
                :disabled="Boolean(cancellingJobId)"
                @click="emit('cancel', row)"
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
                @click="emit('download', row)"
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

  <div v-loading="loading" class="exports-mobile" :aria-label="t('exportCenter.title')">
    <el-empty v-if="visibleJobs.length === 0" :description="t(jobs?.length ? 'exportCenter.filtersEmpty' : 'exportCenter.empty')" />
    <article v-for="job in visibleJobs" :key="job.id" class="export-card">
      <div class="export-card__title">
        <strong>{{ displayName(job) }}</strong>
        <el-tag :type="exportJobStatusTag(job.status)" size="small">
          <span v-if="job.status === 'running'" class="running-dot" aria-hidden="true" />
          {{ statusLabel(job.status) }}
        </el-tag>
      </div>
      <dl class="export-card__details">
        <div><dt>{{ t('exportCenter.resource') }}</dt><dd>{{ resourceLabel(job.resource) }}</dd></div>
        <div><dt>{{ t('exportCenter.fileSize') }}</dt><dd>{{ formatExportFileSize(job.file_size) }}</dd></div>
        <div><dt>{{ t('exportCenter.createdAt') }}</dt><dd>{{ formatOptionalLocalizedDate(job.created_at) }}</dd></div>
        <div><dt>{{ t('exportCenter.completedAt') }}</dt><dd>{{ formatOptionalLocalizedDate(job.completed_at) }}</dd></div>
        <div><dt>{{ t('exportCenter.expiresAt') }}</dt><dd>{{ formatOptionalLocalizedDate(job.expires_at) }}</dd></div>
      </dl>
      <button v-if="job.error_message" type="button" class="export-card__error" @click="emit('error', job)">
        {{ job.error_message }}
      </button>
      <div v-if="canCancel(job.status) || job.status === 'succeeded'" class="export-card__actions" role="group" :aria-label="t('exportCenter.ariaActions', { name: displayName(job) })">
        <el-button v-if="canCancel(job.status)" type="danger" plain :loading="cancellingJobId === job.id" :disabled="Boolean(cancellingJobId)" @click="emit('cancel', job)">
          {{ t('exportCenter.cancel') }}
        </el-button>
        <el-button
          v-if="job.status === 'succeeded'"
          type="primary"
          :loading="downloadingJobId === job.id"
          :disabled="isDownloadUnavailable(job) || Boolean(downloadingJobId)"
          :title="isDownloadUnavailable(job) ? t('exportCenter.downloadExpired') : t('exportCenter.download')"
          @click="emit('download', job)"
        >
          {{ isDownloadUnavailable(job) ? t('exportCenter.expired') : t('exportCenter.download') }}
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

defineProps<{
  cancellingJobId?: string
  downloadingJobId?: string
  jobs?: ExportJob[]
  loading: boolean
  visibleJobs: ExportJob[]
  canCancel: (status: string) => boolean
  displayName: (job: ExportJob) => string
  isDownloadUnavailable: (job: ExportJob) => boolean
  resourceLabel: (resource: string) => string
  statusLabel: (status: string) => string
}>()

const emit = defineEmits<{
  cancel: [job: ExportJob]
  download: [job: ExportJob]
  error: [job: ExportJob]
}>()

const { t } = useI18n()
</script>

<style scoped lang="scss">
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
