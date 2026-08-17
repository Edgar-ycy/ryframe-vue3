<template>
  <div class="backup-panel" aria-live="polite">
    <header class="panel-heading">
      <div>
        <h3>{{ t('tenantData.backupTitle') }}</h3>
        <p>{{ t('tenantData.backupHint') }}</p>
      </div>
      <el-button icon="Refresh" :loading="loading" @click="refreshAll">{{ t('tenantData.refresh') }}</el-button>
    </header>

    <el-alert v-if="!canView" :title="t('tenantData.noBackupPermission')" type="info" show-icon :closable="false" />
    <el-alert v-else-if="placementQuery.error.value" :title="t('tenantData.placementUnavailable')" type="warning" show-icon :closable="false">
      <el-button type="warning" plain @click="refreshAll">{{ t('tenantData.retry') }}</el-button>
    </el-alert>
    <template v-else-if="placement">
      <el-descriptions :column="2" border>
        <el-descriptions-item :label="t('tenantData.currentTarget')">{{ placement.current_target_key }}</el-descriptions-item>
        <el-descriptions-item :label="t('tenantData.placementGeneration')">{{ placement.placement_generation }}</el-descriptions-item>
      </el-descriptions>

      <el-alert v-if="backupQuery.error.value" :title="t('tenantData.backupUnavailable')" type="warning" show-icon :closable="false">
        <el-button type="warning" plain @click="refreshBackups">{{ t('tenantData.retry') }}</el-button>
      </el-alert>

      <div class="backup-table-wrap">
        <el-table v-loading="backupQuery.isFetching.value" :data="backupPoints" row-key="id" border class="backup-table">
          <el-table-column :label="t('tenantData.scope')" width="100">
            <template #default="{ row }">{{ row.scope === 'tenant' ? t('tenantData.scopeTenant') : t('tenantData.scopeShard') }}</template>
          </el-table-column>
          <el-table-column :label="t('tenantData.capturedAt')" min-width="170">
            <template #default="{ row }">{{ formatDate(row.captured_at) }}</template>
          </el-table-column>
          <el-table-column :label="t('tenantData.validationStatus')" width="125">
            <template #default="{ row }">
              <el-tag :type="stateTagType(row.validation_status)">{{ validationLabel(row.validation_status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="placement_generation" :label="t('tenantData.placementGeneration')" width="120">
            <template #default="{ row }">{{ row.placement_generation ?? t('tenantData.notAvailable') }}</template>
          </el-table-column>
          <el-table-column prop="schema_fingerprint" :label="t('tenantData.schemaFingerprint')" min-width="220" show-overflow-tooltip />
          <el-table-column :label="t('tenantData.retentionUntil')" min-width="170">
            <template #default="{ row }">{{ formatDate(row.retention_until) }}</template>
          </el-table-column>
          <el-table-column :label="t('tenantData.expiresAt')" min-width="170">
            <template #default="{ row }">{{ formatDate(row.expires_at) }}</template>
          </el-table-column>
          <el-table-column :label="t('tenantData.restoreDrillAt')" min-width="170">
            <template #default="{ row }">{{ formatDate(row.last_restore_drill_at) }}</template>
          </el-table-column>
          <template #empty><el-empty :description="t('tenantData.noBackupPoints')" :image-size="64" /></template>
        </el-table>
      </div>

      <div v-loading="backupQuery.isFetching.value" class="backup-card-list">
        <el-empty v-if="!backupQuery.isFetching.value && backupPoints.length === 0" :description="t('tenantData.noBackupPoints')" />
        <article v-for="point in backupPoints" :key="point.id" class="backup-card">
          <header>
            <strong>{{ formatDate(point.captured_at) }}</strong>
            <el-tag :type="stateTagType(point.validation_status)" size="small">{{ validationLabel(point.validation_status) }}</el-tag>
          </header>
          <dl>
            <div><dt>{{ t('tenantData.scope') }}</dt><dd>{{ point.scope === 'tenant' ? t('tenantData.scopeTenant') : t('tenantData.scopeShard') }}</dd></div>
            <div><dt>{{ t('tenantData.placementGeneration') }}</dt><dd>{{ point.placement_generation ?? t('tenantData.notAvailable') }}</dd></div>
            <div><dt>{{ t('tenantData.retentionUntil') }}</dt><dd>{{ formatDate(point.retention_until) }}</dd></div>
            <div><dt>{{ t('tenantData.expiresAt') }}</dt><dd>{{ formatDate(point.expires_at) }}</dd></div>
            <div class="wide"><dt>{{ t('tenantData.schemaFingerprint') }}</dt><dd>{{ point.schema_fingerprint }}</dd></div>
            <div class="wide"><dt>{{ t('tenantData.restoreDrillAt') }}</dt><dd>{{ formatDate(point.last_restore_drill_at) }}</dd></div>
          </dl>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  getTenantDataPlacement,
  listTenantDataBackupPoints,
  type TenantDataBackupPoint,
  type TenantDataPlacement,
} from '@/api/modules/tenantData'
import { TENANT_DATA_PERMISSIONS } from '@/features/tenant-data/permissions'
import { stateTagType } from '@/features/tenant-data/presentation'
import { formatLocalizedDate } from '@/i18n'
import { requireOperationData } from '@/shared/http/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/permission'

const props = defineProps<{ active: boolean, tenantId: string }>()
const { t } = useI18n()
const userStore = useUserStore()
const canView = computed(() => hasPermission(
  userStore.permissions,
  TENANT_DATA_PERMISSIONS.backupList,
  userStore.roles,
))

const placementQuery = useTenantQuery<TenantDataPlacement>(
  () => userStore.tenantId,
  () => props.active && userStore.tenantId === 'system' && canView.value,
  'platform-tenant-data-placement-for-backups',
  () => ({ tenant_id: props.tenantId }),
  async signal => requireOperationData(await getTenantDataPlacement(props.tenantId, signal)),
  { staleTime: 0, refetchInterval: false, meta: { errorMode: 'silent' } },
)
const placement = placementQuery.data
const backupQuery = useTenantQuery<TenantDataBackupPoint[]>(
  () => userStore.tenantId,
  () => props.active && canView.value && Boolean(placement.value?.current_target_key),
  'platform-tenant-data-backup-points',
  () => ({ tenant_id: props.tenantId, target_key: placement.value?.current_target_key }),
  async signal => requireOperationData(await listTenantDataBackupPoints(
    placement.value?.current_target_key || '',
    { tenant_id: props.tenantId },
    signal,
  )),
  { staleTime: 0, refetchInterval: false, meta: { errorMode: 'silent' } },
)
const backupPoints = computed(() => backupQuery.data.value ?? [])
const loading = computed(() => placementQuery.isFetching.value || backupQuery.isFetching.value)

function validationLabel(status: TenantDataBackupPoint['validation_status']): string {
  const suffix = { pending: 'Pending', valid: 'Valid', invalid: 'Invalid' }[status]
  return t(`tenantData.validation${suffix}`)
}

function formatDate(value: string | null | undefined): string {
  return value ? formatLocalizedDate(value) : t('tenantData.notAvailable')
}

async function refreshBackups(): Promise<void> {
  await backupQuery.refetch()
}

async function refreshAll(): Promise<void> {
  const placementResult = await placementQuery.refetch()
  if (placementResult.data?.current_target_key) await backupQuery.refetch()
}
</script>

<style scoped>
.backup-panel {
  display: grid;
  gap: 14px;
}

.panel-heading,
.backup-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-heading h3,
.panel-heading p {
  margin: 0;
}

.panel-heading p {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.backup-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.backup-table {
  min-width: 1120px;
}

.backup-card-list {
  display: none;
}

@media (width <= 640px) {
  .panel-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .panel-heading :deep(.el-button) {
    min-height: 42px;
  }

  .backup-table-wrap {
    display: none;
  }

  .backup-card-list {
    display: grid;
    gap: 12px;
    min-height: 100px;
  }

  .backup-card {
    padding: 14px;
    border: 1px solid var(--el-border-color);
    border-radius: 10px;
  }

  .backup-card dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 14px 0 0;
  }

  .backup-card dl > div {
    min-width: 0;
  }

  .backup-card .wide {
    grid-column: 1 / -1;
  }

  dt {
    margin-bottom: 4px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
}
</style>
