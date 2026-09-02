<template>
  <el-dialog
    v-model="visible"
    :title="t('tenantData.migrationDetailTitle')"
    width="min(820px, calc(100vw - 24px))"
    destroy-on-close
    @open="handleOpen"
  >
    <div v-loading="detailQuery.isFetching.value" class="detail-body" aria-live="polite">
      <el-alert
        v-if="detailQuery.error.value"
        :title="t('tenantData.migrationDetailUnavailable')"
        type="warning"
        show-icon
        :closable="false"
      >
        <el-button type="warning" plain @click="refreshDetail">{{
          t('tenantData.retry')
        }}</el-button>
      </el-alert>

      <template v-if="migration">
        <header class="detail-heading">
          <div>
            <strong>{{ migration.id }}</strong>
            <p>{{ migration.source_target_key }} → {{ migration.target_target_key }}</p>
          </div>
          <el-tag :type="stateTagType(migration.state)">{{ stateLabel(migration.state) }}</el-tag>
        </header>

        <el-alert
          v-if="cutoverStarted && migration.state !== 'finalized'"
          :title="t('tenantData.switchedCannotCancel')"
          type="warning"
          show-icon
          :closable="false"
        />
        <el-alert
          v-if="migration.error_code"
          :title="migration.error_code"
          type="error"
          show-icon
          :closable="false"
        />
        <el-alert
          v-if="migration.cancel_requested"
          :title="t('tenantData.cancellationInProgress')"
          type="warning"
          show-icon
          :closable="false"
        />
        <el-alert
          v-if="migration.finalize_requested"
          :title="t('tenantData.finalizationInProgress')"
          type="warning"
          show-icon
          :closable="false"
        />

        <el-descriptions :column="2" border>
          <el-descriptions-item :label="t('tenantData.sourceGeneration')">{{
            migration.source_generation
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.targetGeneration')">{{
            migration.target_generation
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.createdAt')">{{
            formatDate(migration.created_at)
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.updatedAt')">{{
            formatDate(migration.updated_at)
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.retentionUntil')" :span="2">
            {{ formatDate(migration.retention_until) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="(migration.action_reasons ?? []).length"
          :title="t('tenantData.actionUnavailable')"
          type="info"
          :closable="false"
        >
          <ul>
            <li v-for="reason in migration.action_reasons" :key="reason">{{ reason }}</li>
          </ul>
        </el-alert>

        <section>
          <h3>{{ t('tenantData.migrationItems') }}</h3>
          <div class="item-table-wrap">
            <el-table :data="migration.items ?? []" row-key="id" border>
              <el-table-column
                prop="table_name"
                :label="t('tenantData.tableName')"
                min-width="190"
                show-overflow-tooltip
              />
              <el-table-column :label="t('tenantData.progressState')" width="120">
                <template #default="{ row }">
                  <el-tag :type="stateTagType(row.state)" effect="plain">{{
                    stateLabel(row.state)
                  }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column :label="t('tenantData.rowCounts')" min-width="150">
                <template #default="{ row }"
                  >{{ row.source_row_count ?? '—' }} / {{ row.target_row_count ?? '—' }}</template
                >
              </el-table-column>
              <el-table-column :label="t('tenantData.error')" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ row.error_code || '—' }}</template>
              </el-table-column>
              <template #empty
                ><el-empty :description="t('tenantData.noItems')" :image-size="56"
              /></template>
            </el-table>
          </div>
        </section>
      </template>
      <el-alert
        v-if="actionError"
        :title="t('tenantData.migrationActionFailed')"
        type="error"
        show-icon
        :closable="false"
      />
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ t('tenantData.close') }}</el-button>
      <el-button
        v-if="canCancel"
        type="warning"
        :loading="cancelMutation.pending.value"
        :disabled="!migration || !cancelAllowed || actionPending"
        @click="handleCancel"
      >
        {{ t('tenantData.cancelMigration') }}
      </el-button>
      <el-button
        v-if="canFinalize"
        type="danger"
        :loading="finalizeMutation.pending.value"
        :disabled="!migration || !finalizeAllowed || actionPending"
        @click="handleFinalize"
      >
        {{ t('tenantData.finalizeMigration') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getTenantDataMigration, type TenantDataMigration } from '@/api/modules/tenantData'
import {
  canCancelMigration,
  canFinalizeMigration,
  isMigrationInProgress,
  stateTagType,
} from '@/features/tenant-data/presentation'
import { useActivePolling } from '@/features/tenant-data/useActivePolling'
import { formatLocalizedDate } from '@/i18n'
import { requireOperationData } from '@/shared/http/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useTenantMigrationDetailActions } from './useTenantMigrationDetailActions'

const props = defineProps<{
  active: boolean
  tenantId: string
  migrationId?: string
  canCancel: boolean
  canFinalize: boolean
}>()
const emit = defineEmits<{
  updated: [migration: TenantDataMigration, scope: ServerStateScope]
}>()
const visible = defineModel<boolean>({ required: true })
const { t, te } = useI18n()

const detailQuery = useServerStateQuery<TenantDataMigration>(
  () => props.active && visible.value && Boolean(props.migrationId),
  'platform-tenant-data-migration-detail',
  () => ({ tenant_id: props.tenantId, migration_id: props.migrationId }),
  async (signal) =>
    requireOperationData(await getTenantDataMigration(props.migrationId || '', signal)),
  { staleTime: 0, refetchInterval: false, meta: { errorMode: 'silent' } },
)
const migration = detailQuery.data
const cancelAllowed = computed(() =>
  Boolean(migration.value && canCancelMigration(migration.value)),
)
const finalizeAllowed = computed(() =>
  Boolean(migration.value && canFinalizeMigration(migration.value)),
)
const cutoverStarted = computed(() =>
  Boolean(
    migration.value &&
    ['cutting_over', 'activating', 'succeeded', 'retention_pending', 'finalized'].includes(
      migration.value.state,
    ),
  ),
)

const {
  actionError,
  actionPending,
  cancelMutation,
  finalizeMutation,
  handleCancel,
  handleFinalize,
  handleOpen,
} = useTenantMigrationDetailActions({
  active: () => props.active,
  canCancel: () => cancelAllowed.value,
  canFinalize: () => finalizeAllowed.value,
  emitUpdated: (updated, scope) => emit('updated', updated, scope),
  migration,
  refresh: refreshDetail,
  t,
  visible,
})

useActivePolling(
  () => props.active && visible.value,
  () =>
    Boolean(
      migration.value &&
      (isMigrationInProgress(migration.value.state) ||
        migration.value.cancel_requested ||
        migration.value.finalize_requested),
    ),
  async () => {
    await detailQuery.refetch()
  },
)

function stateLabel(state: string): string {
  const key = `tenantData.state.${state}`
  return te(key) ? t(key) : state
}

function formatDate(value: string | null | undefined): string {
  return value ? formatLocalizedDate(value) : t('tenantData.notAvailable')
}

async function refreshDetail(): Promise<void> {
  if (props.migrationId) await detailQuery.refetch()
}
</script>

<style scoped>
.detail-body,
section {
  display: grid;
  gap: 14px;
}

.detail-body {
  min-height: 180px;
}

.detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.detail-heading strong,
.detail-heading p {
  overflow-wrap: anywhere;
}

.detail-heading p {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
}

section {
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

section h3 {
  margin: 0;
}

ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.item-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.item-table-wrap :deep(.el-table) {
  min-width: 700px;
}

@media (width <= 640px) {
  .detail-heading {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
