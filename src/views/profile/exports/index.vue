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
import ExportJobList from './components/ExportJobList.vue'
import { useExportsPage } from './useExportsPage'

const {
  t,
  loading,
  error,
  listErrorMessage,
  statusFilter,
  resourceFilter,
  STATUS_OPTIONS,
  RESOURCE_OPTIONS,
  statusLabel,
  resourceLabel,
  handleVisibleJobsChange,
  deletingJobIds,
  selectedJobIds,
  handleBatchDelete,
  cancellingJobId,
  downloadingJobId,
  jobs,
  visibleJobs,
  canCancel,
  canDelete,
  displayName,
  isDownloadUnavailable,
  handleCancel,
  handleDelete,
  handleDownload,
  showError,
  errorDialogVisible,
  selectedErrorJob,
  handleRefresh,
} = useExportsPage()
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
