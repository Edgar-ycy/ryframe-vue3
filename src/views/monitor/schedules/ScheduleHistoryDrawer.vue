<template>
  <el-drawer
    v-model="visible"
    :title="
      schedule
        ? t('monitor.schedules.historyTitle', { name: schedule.name })
        : t('monitor.schedules.history')
    "
    size="min(760px, calc(100vw - 32px))"
    direction="rtl"
    @open="handleOpen"
    @closed="handleClosed"
  >
    <template v-if="schedule">
      <el-form :model="queryParams" inline class="history-filters" @submit.prevent="handleSearch">
        <el-form-item :label="t('monitor.schedules.triggerKind')">
          <el-select
            v-model="queryParams.trigger_kind"
            :placeholder="t('monitor.schedules.triggerKindPlaceholder')"
            clearable
          >
            <el-option :label="t('monitor.schedules.triggerScheduled')" value="scheduled" />
            <el-option :label="t('monitor.schedules.triggerMisfire')" value="misfire" />
            <el-option :label="t('monitor.schedules.triggerManual')" value="manual" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('monitor.schedules.outcome')">
          <el-select
            v-model="queryParams.outcome"
            :placeholder="t('monitor.schedules.outcomePlaceholder')"
            clearable
          >
            <el-option :label="t('monitor.schedules.outcomeEnqueued')" value="enqueued" />
            <el-option
              :label="t('monitor.schedules.outcomeSkippedMisfire')"
              value="skipped_misfire"
            />
            <el-option
              :label="t('monitor.schedules.outcomeSkippedConcurrency')"
              value="skipped_concurrency"
            />
            <el-option
              :label="t('monitor.schedules.outcomeTargetUnavailable')"
              value="target_unavailable"
            />
            <el-option
              :label="t('monitor.schedules.outcomeInvalidConfiguration')"
              value="invalid_configuration"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('monitor.schedules.jobStatus')">
          <el-select
            v-model="queryParams.background_job_status"
            :placeholder="t('monitor.schedules.statusPlaceholder')"
            clearable
          >
            <el-option :label="t('monitor.schedules.statusPending')" value="pending" />
            <el-option :label="t('monitor.schedules.statusRunning')" value="running" />
            <el-option :label="t('monitor.schedules.statusSucceeded')" value="succeeded" />
            <el-option :label="t('monitor.schedules.statusDead')" value="dead" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">{{
            t('monitor.schedules.search')
          }}</el-button>
          <el-button icon="Refresh" @click="handleReset">{{
            t('monitor.schedules.reset')
          }}</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="executionsError?.message"
        :title="executionsError.message"
        type="error"
        show-icon
        :closable="false"
        class="history-error"
      />

      <div class="table-scroll">
        <el-table
          v-loading="loading"
          :data="executions?.items ?? []"
          border
          stripe
          class="history-table"
          :empty-text="t('monitor.schedules.emptyHistory')"
        >
          <el-table-column :label="t('monitor.schedules.triggerKind')" min-width="118">
            <template #default="{ row }"
              ><el-tag :type="triggerTagType(row.trigger_kind)" size="small">{{
                triggerLabel(row.trigger_kind)
              }}</el-tag></template
            >
          </el-table-column>
          <el-table-column :label="t('monitor.schedules.scheduledFor')" min-width="160">
            <template #default="{ row }">{{ formatDate(row.scheduled_for) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.schedules.outcome')" min-width="150">
            <template #default="{ row }"
              ><el-tag :type="outcomeTagType(row.outcome)" size="small">{{
                outcomeLabel(row.outcome)
              }}</el-tag></template
            >
          </el-table-column>
          <el-table-column :label="t('monitor.schedules.jobStatus')" min-width="126">
            <template #default="{ row }">
              <el-tag
                v-if="row.background_job_status"
                :type="jobStatusTagType(row.background_job_status)"
                size="small"
                >{{ jobStatusLabel(row.background_job_status) }}</el-tag
              >
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column
            :label="t('monitor.schedules.jobId')"
            min-width="170"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <el-button
                v-if="row.background_job_id"
                type="primary"
                link
                @click="goToJob(row.schedule_id)"
                >{{ row.background_job_id }}</el-button
              >
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="detail"
            :label="t('monitor.schedules.detail')"
            min-width="180"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{ row.detail || '—' }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.schedules.createdAt')" min-width="160">
            <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="executions?.total ?? 0"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @change="fetchData"
      />
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  listScheduleExecutions,
  type JobScheduleExecutionRecord,
  type JobScheduleRecord,
  type ScheduleExecutionQuery,
} from '@/api/modules/monitor'
import { formatLocalizedDate } from '@/i18n'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { MONITOR_SCHEDULE_EXECUTIONS_RESOURCE } from '../queryResources'

const props = defineProps<{ schedule?: JobScheduleRecord }>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const queryParams = ref<ScheduleExecutionQuery>(defaultQuery())
const activeQueryParams = ref<ScheduleExecutionQuery>(normalizeQueryParams(queryParams.value))
const queryReady = ref(false)

const executionsQuery = useTenantQuery<PageResponse<JobScheduleExecutionRecord>>(
  () => userStore.tenantId,
  () =>
    userStore.sessionStatus === 'authenticated' &&
    visible.value &&
    queryReady.value &&
    Boolean(props.schedule),
  MONITOR_SCHEDULE_EXECUTIONS_RESOURCE,
  () => ({
    scheduleId: props.schedule?.id,
    filters: normalizeQueryParams(activeQueryParams.value),
  }),
  async (signal) => {
    const params = normalizeQueryParams(activeQueryParams.value)
    if (!props.schedule) return emptyPageResponse<JobScheduleExecutionRecord>(params)
    const response = await listScheduleExecutions(props.schedule.id, params, signal)
    return response.data ?? emptyPageResponse<JobScheduleExecutionRecord>(params)
  },
  { refetchInterval: false },
)

const loading = executionsQuery.isFetching
const executions = executionsQuery.data
const executionsError = executionsQuery.error

function defaultQuery(): ScheduleExecutionQuery {
  return {
    page: 1,
    page_size: 10,
    trigger_kind: '',
    outcome: '',
    background_job_status: '',
  }
}

function normalizeQueryParams(params: ScheduleExecutionQuery): ScheduleExecutionQuery {
  return {
    ...params,
    trigger_kind: params.trigger_kind || undefined,
    outcome: params.outcome || undefined,
    background_job_status: params.background_job_status || undefined,
  }
}

function resetQuery(): void {
  queryParams.value = defaultQuery()
  activeQueryParams.value = normalizeQueryParams(queryParams.value)
}

function handleOpen(): void {
  resetQuery()
  queryReady.value = true
}

function handleClosed(): void {
  queryReady.value = false
}

async function fetchData(): Promise<void> {
  const nextParams = normalizeQueryParams(queryParams.value)
  if (JSON.stringify(nextParams) !== JSON.stringify(activeQueryParams.value)) {
    activeQueryParams.value = nextParams
    return
  }
  await executionsQuery.refetch({ throwOnError: true })
}

function handleSearch(): void {
  queryParams.value.page = 1
  void fetchData()
}

function handleReset(): void {
  queryParams.value = defaultQuery()
  void fetchData()
}

function formatDate(value: string): string {
  return formatLocalizedDate(value)
}

function goToJob(scheduleId: string): void {
  visible.value = false
  void router.push({ path: '/monitor/jobs', query: { schedule_id: scheduleId } })
}

function triggerLabel(value: string): string {
  const labels: Record<string, string> = {
    scheduled: t('monitor.schedules.triggerScheduled'),
    misfire: t('monitor.schedules.triggerMisfire'),
    manual: t('monitor.schedules.triggerManual'),
  }
  return labels[value] ?? value
}

function triggerTagType(value: string): TagProps['type'] {
  const types: Record<string, TagProps['type']> = {
    scheduled: 'primary',
    misfire: 'warning',
    manual: 'info',
  }
  return types[value] ?? 'info'
}

function outcomeLabel(value: string): string {
  const labels: Record<string, string> = {
    enqueued: t('monitor.schedules.outcomeEnqueued'),
    skipped_misfire: t('monitor.schedules.outcomeSkippedMisfire'),
    skipped_concurrency: t('monitor.schedules.outcomeSkippedConcurrency'),
    target_unavailable: t('monitor.schedules.outcomeTargetUnavailable'),
    invalid_configuration: t('monitor.schedules.outcomeInvalidConfiguration'),
  }
  return labels[value] ?? value
}

function outcomeTagType(value: string): TagProps['type'] {
  const types: Record<string, TagProps['type']> = {
    enqueued: 'success',
    skipped_misfire: 'warning',
    skipped_concurrency: 'info',
    target_unavailable: 'warning',
    invalid_configuration: 'danger',
  }
  return types[value] ?? 'info'
}

function jobStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    pending: t('monitor.schedules.statusPending'),
    running: t('monitor.schedules.statusRunning'),
    succeeded: t('monitor.schedules.statusSucceeded'),
    dead: t('monitor.schedules.statusDead'),
  }
  return labels[value] ?? value
}

function jobStatusTagType(value: string): TagProps['type'] {
  const types: Record<string, TagProps['type']> = {
    pending: 'warning',
    running: 'primary',
    succeeded: 'success',
    dead: 'danger',
  }
  return types[value] ?? 'info'
}
</script>

<style scoped lang="scss">
.history-filters {
  margin-bottom: 12px;
}

.history-error {
  margin-bottom: 12px;
}

.table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.history-table {
  min-width: 1040px;
}
</style>
