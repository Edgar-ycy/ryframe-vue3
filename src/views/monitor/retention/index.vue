<template>
  <div class="page-container retention-page">
    <el-alert
      :title="t('monitor.retention.hardDeleteWarning')"
      type="warning"
      show-icon
      :closable="false"
      class="retention-warning"
    />

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div>
            <span>{{ t('monitor.retention.title') }}</span>
            <p class="card-subtitle">{{ t('monitor.retention.subtitle') }}</p>
          </div>
          <div class="header-actions">
            <el-button
              v-perm="'monitor:retention:list'"
              icon="Refresh"
              :loading="overviewQuery.isFetching.value || runsQuery.isFetching.value"
              @click="refresh"
            >
              {{ t('common.refresh') }}
            </el-button>
            <el-button
              v-perm="'monitor:retention:list'"
              type="primary"
              plain
              icon="View"
              :loading="previewLoading"
              @click="loadPreview"
            >
              {{ t('monitor.retention.preview') }}
            </el-button>
            <el-button
              v-perm="'monitor:retention:run'"
              type="danger"
              icon="Delete"
              :loading="runMutation.pending.value"
              :disabled="previewLoading"
              @click="handleRun"
            >
              {{ t('monitor.retention.runNow') }}
            </el-button>
          </div>
        </div>
      </template>

      <el-skeleton v-if="overviewQuery.isLoading.value" :rows="4" animated />
      <template v-else-if="overviewQuery.data.value">
        <h3 class="section-title">{{ t('monitor.retention.effectivePolicy') }}</h3>
        <div class="policy-grid">
          <div class="policy-item">
            <span>{{ t('monitor.retention.policyBatchSize') }}</span>
            <strong>{{
              t('monitor.retention.rows', {
                value: formatNumber(overviewQuery.data.value.policy.cleanup_batch_size),
              })
            }}</strong>
          </div>
          <div class="policy-item">
            <span>{{ t('monitor.retention.policyRunLimit') }}</span>
            <strong>{{
              t('monitor.retention.rows', {
                value: formatNumber(overviewQuery.data.value.policy.max_rows_per_resource_per_run),
              })
            }}</strong>
          </div>
          <div class="policy-item">
            <span>{{ t('monitor.retention.protectedData') }}</span>
            <strong>{{ t('monitor.retention.protectedDataValue') }}</strong>
          </div>
          <div
            v-for="item in policyWindows(overviewQuery.data.value.policy)"
            :key="item.key"
            class="policy-item"
          >
            <span>{{ resourceLabel(item.key) }}</span>
            <strong>{{
              item.unit === 'hours'
                ? t('monitor.retention.hours', { value: item.value })
                : t('monitor.retention.days', { value: item.value })
            }}</strong>
          </div>
        </div>

        <h3 class="section-title">{{ t('monitor.retention.cutoffs') }}</h3>
        <div class="table-scroll">
          <el-table :data="overviewQuery.data.value.cutoffs" border stripe class="cutoff-table">
            <el-table-column :label="t('monitor.retention.resource')" min-width="190">
              <template #default="{ row }">{{ resourceLabel(row.resource) }}</template>
            </el-table-column>
            <el-table-column :label="t('monitor.retention.cutoff')" min-width="180">
              <template #default="{ row }">{{ formatLocalizedDate(row.before) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-card>

    <el-card v-if="preview || previewError" shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <div>
            <span>{{ t('monitor.retention.previewTitle') }}</span>
            <p class="card-subtitle">{{ t('monitor.retention.previewHint') }}</p>
          </div>
          <span v-if="preview" class="calculated-at">
            {{ t('monitor.retention.calculatedAt') }}：{{
              formatLocalizedDate(preview.calculated_at)
            }}
          </span>
        </div>
      </template>
      <el-alert
        v-if="previewError"
        :title="previewError"
        type="error"
        show-icon
        :closable="false"
      />
      <el-empty
        v-else-if="preview && totalCount(preview.eligible_counts) === 0"
        :description="t('monitor.retention.previewEmpty')"
      />
      <div v-else-if="preview" class="count-grid">
        <div
          v-for="entry in countEntries(preview.eligible_counts)"
          :key="entry[0]"
          class="count-item"
        >
          <span>{{ resourceLabel(entry[0]) }}</span>
          <strong>{{ formatNumber(entry[1]) }}</strong>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('monitor.retention.runs') }}</span>
          <el-button icon="Refresh" :loading="runsQuery.isFetching.value" @click="refreshRuns">
            {{ t('common.refresh') }}
          </el-button>
        </div>
      </template>
      <div class="table-scroll">
        <el-table
          v-loading="runsQuery.isFetching.value"
          :data="runsQuery.data.value?.items ?? []"
          border
          stripe
          class="runs-table"
          :empty-text="t('common.noData')"
        >
          <el-table-column
            prop="id"
            :label="t('system.common.id')"
            min-width="150"
            show-overflow-tooltip
          />
          <el-table-column :label="t('monitor.retention.triggerKind')" width="120">
            <template #default="{ row }">{{ triggerLabel(row.trigger_kind) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.retention.status')" width="120">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" size="small">{{
                statusLabel(row.status)
              }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('monitor.retention.deleted')" min-width="200">
            <template #default="{ row }">{{ countSummary(row.deleted_counts) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.retention.remaining')" min-width="200">
            <template #default="{ row }">{{ countSummary(row.remaining_counts) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.retention.startedAt')" min-width="165">
            <template #default="{ row }">{{
              formatOptionalLocalizedDate(row.started_at)
            }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.retention.completedAt')" min-width="165">
            <template #default="{ row }">{{
              formatOptionalLocalizedDate(row.completed_at)
            }}</template>
          </el-table-column>
          <el-table-column
            prop="error_summary"
            :label="t('monitor.retention.error')"
            min-width="220"
            show-overflow-tooltip
          />
          <el-table-column
            :label="t('monitor.retention.backgroundJob')"
            min-width="160"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button type="primary" link @click="openJobs(row.background_job_id)">
                {{ row.background_job_id }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.page_size"
        :total="runsQuery.data.value?.total ?? 0"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @change="fetchRuns"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { onDeactivated, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getDataRetention,
  listDataRetentionRuns,
  previewDataRetention,
  runDataRetention,
  type DataRetentionPreview,
  type DataRetentionRunRecord,
} from '@/api/modules/monitor'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { formatLocalizedDate, formatOptionalLocalizedDate, getApplicationLocale } from '@/i18n'
import { requireOperationData } from '@/shared/http/client'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import { invalidateActiveServerStateResource } from '@/shared/query/client'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import {
  MONITOR_JOBS_RESOURCE,
  MONITOR_JOB_STATS_RESOURCE,
  MONITOR_RETENTION_RESOURCE,
  MONITOR_RETENTION_RUNS_RESOURCE,
} from '../queryResources'
import {
  countEntries,
  countSummary as summarizeCounts,
  policyWindows,
  retentionResourceKey,
  retentionStatusKey,
  retentionStatusTag,
  retentionTriggerKey,
  totalCount,
} from './presentation'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const pageActive = ref(true)
const query = ref({ page: 1, page_size: 10 })
const preview = ref<DataRetentionPreview>()
const previewLoading = ref(false)
const previewError = ref('')
let previewController: AbortController | undefined
let pendingRunKey: string | undefined

const overviewQuery = useServerStateQuery(
  () => userStore.sessionStatus === 'authenticated' && pageActive.value,
  MONITOR_RETENTION_RESOURCE,
  () => ({ scope: 'policy' }),
  async (signal) => requireOperationData(await getDataRetention(signal)),
  { refetchInterval: false },
)

const runsQuery = useServerStateQuery<PageResponse<DataRetentionRunRecord>>(
  () => userStore.sessionStatus === 'authenticated' && pageActive.value,
  MONITOR_RETENTION_RUNS_RESOURCE,
  () => ({ scope: 'list', ...query.value }),
  async (signal) => {
    const response = await listDataRetentionRuns(query.value, signal)
    return response.data ?? emptyPageResponse<DataRetentionRunRecord>(query.value)
  },
)

const runMutation = useServerStateMutation(MONITOR_RETENTION_RUNS_RESOURCE, {
  mutationFn: (idempotencyKey: string) => runDataRetention(idempotencyKey),
  onSuccess: () => ElMessage.success(t('monitor.retention.runSuccess')),
})

useKeepAlivePageActive(pageActive, refresh)

onDeactivated(cancelPreview)
onUnmounted(cancelPreview)

function formatNumber(value: number): string {
  return new Intl.NumberFormat(getApplicationLocale()).format(value)
}

function resourceLabel(resource: string): string {
  const key = retentionResourceKey(resource)
  return key ? t(key) : resource
}

function countSummary(value: unknown): string {
  return summarizeCounts(value, resourceLabel, formatNumber)
}

function triggerLabel(value: string): string {
  return t(retentionTriggerKey(value))
}

function statusLabel(value: string): string {
  return t(retentionStatusKey(value))
}

function statusTag(value: string): 'danger' | 'info' | 'primary' | 'success' | 'warning' {
  return retentionStatusTag(value)
}

function cancelPreview(): void {
  previewController?.abort()
  previewController = undefined
  previewLoading.value = false
}

async function loadPreview(): Promise<void> {
  cancelPreview()
  const controller = new AbortController()
  previewController = controller
  previewLoading.value = true
  previewError.value = ''
  try {
    preview.value = requireOperationData(await previewDataRetention(controller.signal))
  } catch (error) {
    if (!controller.signal.aborted) {
      preview.value = undefined
      previewError.value = error instanceof Error ? error.message : String(error)
    }
  } finally {
    if (previewController === controller) {
      previewController = undefined
      previewLoading.value = false
    }
  }
}

async function handleRun(): Promise<void> {
  if (runMutation.pending.value) return
  const confirmed = await confirmAction(
    t('monitor.retention.runConfirm'),
    t('monitor.retention.runConfirmTitle'),
    { type: 'error', confirmButtonText: t('monitor.retention.runNow') },
  )
  if (!confirmed || runMutation.pending.value) return
  const key = pendingRunKey ?? createIdempotencyKey('retention')
  try {
    await runMutation.mutateAsync(key)
    pendingRunKey = undefined
  } catch (error) {
    pendingRunKey = shouldReuseIdempotencyKey(error) ? key : undefined
    throw error
  }
  await Promise.all([
    refreshRuns(),
    invalidateActiveServerStateResource(MONITOR_JOBS_RESOURCE),
    invalidateActiveServerStateResource(MONITOR_JOB_STATS_RESOURCE),
  ])
}

function fetchRuns(): void {
  void runsQuery.refetch({ throwOnError: true })
}

async function refreshRuns(): Promise<void> {
  await runsQuery.refetch({ throwOnError: true })
}

async function refresh(): Promise<void> {
  await Promise.all([
    overviewQuery.refetch({ throwOnError: true }),
    runsQuery.refetch({ throwOnError: true }),
  ])
}

function openJobs(backgroundJobId: string): void {
  void router.push({ path: '/monitor/jobs', query: { job_id: backgroundJobId } })
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
