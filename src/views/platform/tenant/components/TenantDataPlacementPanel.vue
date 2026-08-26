<template>
  <div class="tenant-data-panel">
    <section v-loading="placementQuery.isFetching.value" aria-live="polite">
      <div class="section-heading">
        <div>
          <h3>{{ t('tenantData.placementTitle') }}</h3>
          <p>{{ t('tenantData.placementHint') }}</p>
        </div>
        <el-button
          v-if="canCreate"
          type="primary"
          :disabled="!canStartMigration"
          @click="migrationVisible = true"
        >
          {{ t('tenantData.createMigration') }}
        </el-button>
      </div>

      <el-alert
        v-if="!canViewPlacement"
        :title="t('tenantData.noPlacementPermission')"
        type="info"
        show-icon
        :closable="false"
      />
      <el-alert
        v-else-if="placementQuery.error.value"
        :title="t('tenantData.placementUnavailable')"
        type="warning"
        show-icon
        :closable="false"
      >
        <el-button type="warning" plain @click="refreshPlacement">{{
          t('tenantData.retry')
        }}</el-button>
      </el-alert>
      <el-descriptions v-else-if="placement" :column="2" border>
        <el-descriptions-item :label="t('tenantData.currentTarget')">{{
          placement.current_target_key
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('tenantData.placementGeneration')">{{
          placement.placement_generation
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('tenantData.placementState')">
          <el-tag :type="stateTagType(placement.state)">{{ stateLabel(placement.state) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="t('tenantData.updatedAt')">{{
          formatDate(placement.updated_at)
        }}</el-descriptions-item>
      </el-descriptions>
    </section>

    <section aria-live="polite">
      <div class="section-heading">
        <div>
          <h3>{{ t('tenantData.migrationTitle') }}</h3>
          <p>{{ t('tenantData.migrationHint') }}</p>
        </div>
        <el-button
          v-if="canListMigrations"
          icon="Refresh"
          :loading="migrationQuery.isFetching.value"
          @click="refreshMigrations"
        >
          {{ t('tenantData.refresh') }}
        </el-button>
      </div>

      <el-alert
        v-if="!canListMigrations"
        :title="t('tenantData.noMigrationPermission')"
        type="info"
        show-icon
        :closable="false"
      />
      <el-alert
        v-else-if="migrationQuery.error.value"
        :title="t('tenantData.migrationsUnavailable')"
        type="warning"
        show-icon
        :closable="false"
      >
        <el-button type="warning" plain @click="refreshMigrations">{{
          t('tenantData.retry')
        }}</el-button>
      </el-alert>
      <template v-else>
        <div class="migration-table-wrap">
          <el-table
            v-loading="migrationQuery.isFetching.value"
            :data="migrations"
            row-key="id"
            border
            class="migration-table"
          >
            <el-table-column
              prop="id"
              :label="t('tenantData.migrationId')"
              min-width="130"
              show-overflow-tooltip
            />
            <el-table-column
              :label="t('tenantData.sourceTarget')"
              min-width="150"
              show-overflow-tooltip
            >
              <template #default="{ row }">{{ row.source_target_key }}</template>
            </el-table-column>
            <el-table-column
              :label="t('tenantData.targetTarget')"
              min-width="150"
              show-overflow-tooltip
            >
              <template #default="{ row }">{{ row.target_target_key }}</template>
            </el-table-column>
            <el-table-column :label="t('tenantData.migrationState')" width="130">
              <template #default="{ row }"
                ><el-tag :type="stateTagType(row.state)">{{
                  stateLabel(row.state)
                }}</el-tag></template
              >
            </el-table-column>
            <el-table-column :label="t('tenantData.createdAt')" min-width="165">
              <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
            </el-table-column>
            <el-table-column
              :label="t('tenantData.actions')"
              width="100"
              fixed="right"
              align="center"
            >
              <template #default="{ row }">
                <el-button type="primary" link @click="openMigration(row.id)">{{
                  t('tenantData.details')
                }}</el-button>
              </template>
            </el-table-column>
            <template #empty
              ><el-empty :description="t('tenantData.noMigrations')" :image-size="64"
            /></template>
          </el-table>
        </div>

        <div v-loading="migrationQuery.isFetching.value" class="migration-card-list">
          <el-empty
            v-if="!migrationQuery.isFetching.value && migrations.length === 0"
            :description="t('tenantData.noMigrations')"
          />
          <article v-for="migration in migrations" :key="migration.id" class="migration-card">
            <header>
              <strong>{{ migration.id }}</strong>
              <el-tag :type="stateTagType(migration.state)" size="small">{{
                stateLabel(migration.state)
              }}</el-tag>
            </header>
            <p>{{ migration.source_target_key }} → {{ migration.target_target_key }}</p>
            <small>{{ formatDate(migration.created_at) }}</small>
            <el-button type="primary" plain @click="openMigration(migration.id)">{{
              t('tenantData.details')
            }}</el-button>
          </article>
        </div>
      </template>
    </section>

    <TenantDataMigrationDialog
      v-if="placement"
      v-model="migrationVisible"
      :active="active"
      :tenant-id="tenantId"
      :placement="placement"
      @created="handleMigrationCreated"
    />
    <TenantDataMigrationDetailDialog
      v-model="detailVisible"
      :active="active"
      :tenant-id="tenantId"
      :migration-id="selectedMigrationId"
      :can-cancel="canCancel"
      :can-finalize="canFinalize"
      @updated="handleMigrationUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import type { PermissionCode } from '@/api/generated/permissions'
import { useI18n } from 'vue-i18n'
import {
  getTenantDataPlacement,
  listTenantDataMigrations,
  type TenantDataMigration,
  type TenantDataPlacement,
} from '@/api/modules/tenantData'
import { TENANT_DATA_PERMISSIONS } from '@/features/tenant-data/permissions'
import { isMigrationInProgress, stateTagType } from '@/features/tenant-data/presentation'
import { useActivePolling } from '@/features/tenant-data/useActivePolling'
import { formatLocalizedDate } from '@/i18n'
import { requireOperationData } from '@/shared/http/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/permission'
import TenantDataMigrationDetailDialog from './TenantDataMigrationDetailDialog.vue'
import TenantDataMigrationDialog from './TenantDataMigrationDialog.vue'

const props = defineProps<{ active: boolean; tenantId: string }>()
const { t, te } = useI18n()
const userStore = useUserStore()
const migrationVisible = ref(false)
const detailVisible = ref(false)
const selectedMigrationId = ref<string>()
const can = (permission: PermissionCode) => hasPermission(userStore.permissions, permission)
const canViewPlacement = computed(() => can(TENANT_DATA_PERMISSIONS.placementView))
const canListMigrations = computed(() => can(TENANT_DATA_PERMISSIONS.migrationList))
const canCreate = computed(() => can(TENANT_DATA_PERMISSIONS.migrationCreate))
const canCancel = computed(() => can(TENANT_DATA_PERMISSIONS.migrationCancel))
const canFinalize = computed(() => can(TENANT_DATA_PERMISSIONS.migrationFinalize))

const placementQuery = useTenantQuery<TenantDataPlacement>(
  () => userStore.tenantId,
  () => props.active && userStore.tenantId === 'system' && canViewPlacement.value,
  'platform-tenant-data-placement',
  () => ({ tenant_id: props.tenantId }),
  async (signal) => requireOperationData(await getTenantDataPlacement(props.tenantId, signal)),
  { staleTime: 0, refetchInterval: false, meta: { errorMode: 'silent' } },
)
const migrationQuery = useTenantQuery<TenantDataMigration[]>(
  () => userStore.tenantId,
  () => props.active && userStore.tenantId === 'system' && canListMigrations.value,
  'platform-tenant-data-migrations',
  () => ({ tenant_id: props.tenantId }),
  async (signal) =>
    requireOperationData(await listTenantDataMigrations(props.tenantId, undefined, signal)),
  { staleTime: 0, refetchInterval: false, meta: { errorMode: 'silent' } },
)
const placement = placementQuery.data
const migrations = computed(() => migrationQuery.data.value ?? [])
const hasOngoingMigration = computed(() =>
  migrations.value.some(
    (migration) =>
      isMigrationInProgress(migration.state) ||
      migration.cancel_requested ||
      migration.finalize_requested,
  ),
)
const canStartMigration = computed(() =>
  Boolean(canCreate.value && placement.value?.state === 'active' && !hasOngoingMigration.value),
)

useActivePolling(
  () => props.active,
  () => hasOngoingMigration.value,
  async () => {
    const requests: Promise<unknown>[] = [migrationQuery.refetch()]
    if (canViewPlacement.value) requests.push(placementQuery.refetch())
    await Promise.all(requests)
  },
)

watch(
  () => props.active,
  (active) => {
    if (active) return
    migrationVisible.value = false
    detailVisible.value = false
  },
)

watch(canCreate, (allowed) => {
  if (!allowed) migrationVisible.value = false
})

watch(canListMigrations, (allowed) => {
  if (!allowed) detailVisible.value = false
})

function stateLabel(state: string): string {
  const key = `tenantData.state.${state}`
  return te(key) ? t(key) : state
}

function formatDate(value: string | null | undefined): string {
  return value ? formatLocalizedDate(value) : t('tenantData.notAvailable')
}

async function refreshPlacement(): Promise<void> {
  await placementQuery.refetch()
}

async function refreshMigrations(): Promise<void> {
  await migrationQuery.refetch()
}

function openMigration(id: string): void {
  selectedMigrationId.value = id
  detailVisible.value = true
}

async function handleMigrationCreated(migration: TenantDataMigration): Promise<void> {
  ElMessage.success(t('tenantData.migrationCreated'))
  selectedMigrationId.value = migration.id
  detailVisible.value = true
  await Promise.all([placementQuery.refetch(), migrationQuery.refetch()])
}

async function handleMigrationUpdated(): Promise<void> {
  await Promise.all([placementQuery.refetch(), migrationQuery.refetch()])
}
</script>

<style scoped>
.tenant-data-panel,
section {
  display: grid;
  gap: 14px;
}

section + section {
  padding-top: 18px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.section-heading,
.migration-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-heading h3,
.section-heading p {
  margin: 0;
}

.section-heading p {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.migration-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.migration-table {
  min-width: 820px;
}

.migration-card-list {
  display: none;
}

@media (width <= 640px) {
  .section-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .section-heading :deep(.el-button) {
    min-height: 42px;
  }

  .migration-table-wrap {
    display: none;
  }

  .migration-card-list {
    display: grid;
    gap: 12px;
    min-height: 100px;
  }

  .migration-card {
    display: grid;
    gap: 10px;
    padding: 14px;
    border: 1px solid var(--el-border-color);
    border-radius: 10px;
  }

  .migration-card strong,
  .migration-card p {
    overflow-wrap: anywhere;
  }

  .migration-card p {
    margin: 0;
  }

  .migration-card small {
    color: var(--el-text-color-secondary);
  }

  .migration-card :deep(.el-button) {
    min-height: 42px;
  }
}
</style>
