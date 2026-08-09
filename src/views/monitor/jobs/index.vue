<template>
  <div class="page-container jobs-page">
    <section class="job-stats" :aria-label="t('monitor.jobs.title')">
      <el-card
        v-for="item in statItems"
        :key="item.key"
        shadow="never"
        class="job-stat-card"
        :class="`job-stat-card--${item.key}`"
      >
        <span class="job-stat-card__label">{{ item.label }}</span>
        <strong v-loading="statsLoading" class="job-stat-card__value">{{ item.value }}</strong>
      </el-card>
    </section>

    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline @submit.prevent="handleSearch">
        <el-form-item :label="t('monitor.jobs.jobType')">
          <el-input v-model="queryParams.job_type" :placeholder="t('monitor.jobs.jobTypePlaceholder')" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item :label="t('monitor.jobs.status')">
          <el-select v-model="queryParams.status" :placeholder="t('monitor.jobs.statusPlaceholder')" clearable>
            <el-option :label="t('monitor.jobs.statusPending')" value="pending" />
            <el-option :label="t('monitor.jobs.statusRunning')" value="running" />
            <el-option :label="t('monitor.jobs.statusSucceeded')" value="succeeded" />
            <el-option :label="t('monitor.jobs.statusDead')" value="dead" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('monitor.jobs.scheduleId')">
          <el-input v-model="queryParams.schedule_id" :placeholder="t('monitor.jobs.scheduleIdPlaceholder')" clearable inputmode="numeric" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'monitor:job:list'" type="primary" icon="Search" @click="handleSearch">{{ t('monitor.jobs.search') }}</el-button>
          <el-button v-perm="'monitor:job:list'" icon="Refresh" @click="handleReset">{{ t('monitor.jobs.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="jobs-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('monitor.jobs.listTitle') }}</span>
          <div>
            <el-button v-perm="'monitor:job:list'" icon="Refresh" :loading="loading || statsLoading" @click="refresh">{{ t('monitor.jobs.refresh') }}</el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="jobs-card__error" />

      <div class="table-scroll">
        <el-table v-loading="loading" :data="tableData" border stripe class="jobs-table" :empty-text="t('common.noData')">
          <el-table-column prop="id" :label="t('monitor.jobs.id')" min-width="178" show-overflow-tooltip />
          <el-table-column prop="job_type" :label="t('monitor.jobs.jobType')" min-width="150" show-overflow-tooltip />
          <el-table-column :label="t('monitor.jobs.scheduleId')" min-width="125" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ row.schedule_id ?? t('monitor.jobs.noSchedule') }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('monitor.jobs.status')" width="108" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="priority" :label="t('monitor.jobs.priority')" width="90" align="center" />
          <el-table-column :label="t('monitor.jobs.attempts')" width="112" align="center">
            <template #default="{ row }">{{ t('monitor.jobs.attemptsValue', { attempts: row.attempts, max: row.max_attempts }) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.jobs.scheduledFor')" min-width="160">
            <template #default="{ row }">{{ formatDate(row.scheduled_for) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.jobs.availableAt')" min-width="160">
            <template #default="{ row }">{{ formatDate(row.available_at) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.jobs.lease')" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <div v-if="row.lease_until" class="lease-cell">
                <span>{{ row.lease_owner ?? t('monitor.jobs.noLease') }}</span>
                <span>{{ formatDate(row.lease_until) }}</span>
              </div>
              <span v-else>{{ t('monitor.jobs.noLease') }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('monitor.jobs.createdAt')" min-width="160">
            <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.jobs.completedAt')" min-width="160">
            <template #default="{ row }">{{ formatDate(row.completed_at) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.jobs.lastError')" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button v-if="row.last_error" type="danger" link @click="showError(row)">{{ t('monitor.jobs.viewError') }}</el-button>
              <span v-else>{{ t('monitor.jobs.noError') }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('monitor.jobs.operation')" min-width="120" fixed="right" align="center">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'dead' && hasPermission('monitor:job:retry')"
                type="warning"
                link
                icon="RefreshRight"
                :loading="retryingId === row.id"
                :disabled="retryPending"
                @click="handleRetry(row)"
              >
                {{ t('monitor.jobs.retry') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @change="fetchData"
      />
    </el-card>

    <el-dialog v-model="errorDialogVisible" :title="t('monitor.jobs.errorTitle')" width="min(620px, calc(100vw - 32px))">
      <el-descriptions v-if="selectedError" :column="1" border size="small">
        <el-descriptions-item :label="t('monitor.jobs.id')">{{ selectedError.id }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.jobs.jobType')">{{ selectedError.job_type }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.jobs.scheduleId')">{{ selectedError.schedule_id ?? t('monitor.jobs.noSchedule') }}</el-descriptions-item>
        <el-descriptions-item :label="t('monitor.jobs.maxRuntime')">
          {{ selectedError.max_runtime_seconds === null || selectedError.max_runtime_seconds === undefined ? t('monitor.jobs.defaultRuntime') : t('monitor.jobs.maxRuntimeValue', { seconds: selectedError.max_runtime_seconds }) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('monitor.jobs.lastError')">
          <pre class="job-error-content">{{ selectedError.last_error ?? t('monitor.jobs.noError') }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="errorDialogVisible = false">{{ t('monitor.jobs.close') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { formatLocalizedDate } from '@/i18n'
import { usePermission } from '@/hooks/usePermission'
import { useJobManagement } from './useJobManagement'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { hasPermission } = usePermission()

const {
  errorDialogVisible,
  errorMessage,
  fetchData,
  handleReset,
  handleRetry,
  handleSearch,
  loading,
  queryParams,
  refresh,
  retryPending,
  retryingId,
  selectedError,
  showError,
  stats,
  statsLoading,
  syncFromRoute,
  tableData,
  total,
} = useJobManagement(t, route, scheduleId => {
  const query = scheduleId ? { schedule_id: String(scheduleId) } : {}
  if (route.query.schedule_id === query.schedule_id) return
  void router.replace({ query })
})

watch(() => route.fullPath, () => syncFromRoute(route))

const statItems = computed(() => [
  { key: 'total', label: t('monitor.jobs.total'), value: stats.value.total },
  { key: 'ready', label: t('monitor.jobs.ready'), value: stats.value.ready },
  { key: 'pending', label: t('monitor.jobs.pending'), value: stats.value.pending },
  { key: 'running', label: t('monitor.jobs.running'), value: stats.value.running },
  { key: 'succeeded', label: t('monitor.jobs.succeeded'), value: stats.value.succeeded },
  { key: 'dead', label: t('monitor.jobs.dead'), value: stats.value.dead },
])

function formatDate(value: string | null | undefined): string {
  return value ? formatLocalizedDate(value) : '—'
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: t('monitor.jobs.statusPending'),
    running: t('monitor.jobs.statusRunning'),
    succeeded: t('monitor.jobs.statusSucceeded'),
    dead: t('monitor.jobs.statusDead'),
  }
  return labels[status] ?? t('monitor.jobs.statusUnknown')
}

function statusTagType(status: string): TagProps['type'] {
  const types: Record<string, TagProps['type']> = {
    pending: 'warning',
    running: 'primary',
    succeeded: 'success',
    dead: 'danger',
  }
  return types[status] ?? 'info'
}
</script>

<style scoped lang="scss">
.jobs-page {
  min-width: 0;
  max-width: 100%;
}

.job-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.job-stat-card {
  min-width: 0;
  border-left: 3px solid var(--el-color-info) !important;

  &--ready {
    border-left-color: var(--el-color-primary) !important;
  }

  &--pending {
    border-left-color: var(--el-color-warning) !important;
  }

  &--running {
    border-left-color: var(--el-color-primary) !important;
  }

  &--succeeded {
    border-left-color: var(--el-color-success) !important;
  }

  &--dead {
    border-left-color: var(--el-color-danger) !important;
  }

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px;
  }
}

.job-stat-card__label {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-stat-card__value {
  color: var(--color-text-primary);
  font-size: 28px;
  line-height: 1.1;
}

.jobs-card {
  margin-top: 12px;
}

.jobs-card__error {
  margin-bottom: 12px;
}

.table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.jobs-table {
  min-width: 1900px;
}

.lease-cell {
  display: grid;
  gap: 2px;
}

.job-error-content {
  max-height: 280px;
  margin: 0;
  overflow: auto;
  color: var(--el-color-danger);
  font: inherit;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@media (width <= 1180px) {
  .job-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width <= 600px) {
  .job-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .job-stat-card :deep(.el-card__body) {
    padding: 12px;
  }

  .job-stat-card__value {
    font-size: 24px;
  }
}
</style>
