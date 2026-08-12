<template>
  <el-card shadow="never" class="transfer-card plan-card">
    <template #header>
      <div class="panel-header">
        <div>
          <h2>{{ t('tenantConfigTransfer.planTitle') }}</h2>
          <p>{{ t('tenantConfigTransfer.planHint') }}</p>
        </div>
        <div v-if="transfer" class="panel-actions">
          <el-button
            v-if="canPreviewTenantConfigTransfer(transfer)"
            v-perm="'system:config-transfer:preview'"
            type="primary"
            icon="View"
            :loading="previewing"
            :disabled="operationPending"
            @click="emit('preview', transfer)"
          >
            {{ t(`tenantConfigTransfer.${transfer.status === 'previewed' || transfer.status === 'failed' ? 'previewAgain' : 'preview'}`) }}
          </el-button>
          <el-button
            v-if="canApplyTenantConfigTransfer(transfer)"
            v-perm="'system:config-transfer:apply'"
            type="success"
            icon="CircleCheck"
            :loading="applying"
            :disabled="operationPending"
            @click="emit('apply', transfer)"
          >
            {{ t('tenantConfigTransfer.apply') }}
          </el-button>
          <el-button
            v-if="canRollbackTenantConfigTransfer(transfer)"
            v-perm="'system:config-transfer:rollback'"
            type="warning"
            icon="RefreshLeft"
            :loading="rollingBack"
            :disabled="operationPending"
            @click="emit('rollback', transfer)"
          >
            {{ t('tenantConfigTransfer.rollback') }}
          </el-button>
        </div>
      </div>
    </template>

    <el-empty v-if="!transfer" :description="t('tenantConfigTransfer.noTransfer')" />

    <template v-else>
      <section class="plan-overview" :aria-label="t('tenantConfigTransfer.planTitle')">
        <div class="plan-overview__source">
          <span>{{ t('tenantConfigTransfer.sourceTenant') }}</span>
          <strong>{{ transfer.bundle_summary.source_tenant_name }}</strong>
          <small>{{ transfer.bundle_summary.source_tenant_key }}</small>
        </div>
        <div>
          <span>{{ t('tenantConfigTransfer.transferStatus') }}</span>
          <el-tag :type="transferStatusTag(transfer.status)">{{ transferStatusLabel(transfer.status) }}</el-tag>
        </div>
        <div>
          <span>{{ t('tenantConfigTransfer.targetConfigVersion') }}</span>
          <strong>{{ transfer.target_configuration_version }}</strong>
        </div>
        <div>
          <span>{{ t('tenantConfigTransfer.targetAuthEpoch') }}</span>
          <strong>{{ transfer.target_authorization_epoch }}</strong>
        </div>
        <div>
          <span>{{ t('tenantConfigTransfer.previewedAt') }}</span>
          <strong>{{ formatOptionalLocalizedDate(transfer.preview_calculated_at) }}</strong>
        </div>
        <div>
          <span>{{ t('tenantConfigTransfer.rollbackUntil') }}</span>
          <strong>{{ formatOptionalLocalizedDate(transfer.rollback_expires_at) }}</strong>
        </div>
      </section>

      <el-alert
        v-if="hasBlockedItems(transfer)"
        :title="t('tenantConfigTransfer.blockedHint')"
        type="error"
        show-icon
        :closable="false"
        class="plan-alert"
      />
      <el-alert
        v-if="transfer.status === 'previewed'"
        :title="t('tenantConfigTransfer.planStaleHint')"
        type="warning"
        show-icon
        :closable="false"
        class="plan-alert"
      />
      <el-alert
        :title="t('tenantConfigTransfer.targetOwnedHint')"
        type="info"
        show-icon
        :closable="false"
        class="plan-alert"
      />
      <el-alert
        v-if="transfer.error_summary"
        :title="transfer.error_summary"
        type="error"
        show-icon
        :closable="false"
        class="plan-alert"
      />

      <section class="change-counts" :aria-label="t('tenantConfigTransfer.totalChanges')">
        <div v-for="action in planActions" :key="action" :class="`change-count change-count--${action}`">
          <span>{{ actionLabel(action) }}</span>
          <strong>{{ transfer.change_counts[action] ?? 0 }}</strong>
        </div>
      </section>

      <div class="desktop-items-table">
        <el-table v-loading="itemsLoading" :data="items" border stripe :empty-text="t('tenantConfigTransfer.itemsEmpty')">
          <el-table-column :label="t('tenantConfigTransfer.itemResource')" min-width="140">
            <template #default="{ row }">{{ resourceLabel(row.resource_type) }}</template>
          </el-table-column>
          <el-table-column prop="display_name" :label="t('tenantConfigTransfer.itemName')" min-width="180" show-overflow-tooltip />
          <el-table-column prop="stable_key" :label="t('tenantConfigTransfer.stableKey')" min-width="220" show-overflow-tooltip />
          <el-table-column :label="t('tenantConfigTransfer.action')" width="112">
            <template #default="{ row }">
              <el-tag :type="actionTag(row.action)" size="small">{{ actionLabel(row.action) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('tenantConfigTransfer.outcome')" width="118">
            <template #default="{ row }">{{ outcomeLabel(row.outcome) }}</template>
          </el-table-column>
          <el-table-column :label="t('tenantConfigTransfer.detail')" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ detailLabel(row) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="items.length" v-loading="itemsLoading" class="mobile-item-list">
        <article v-for="item in items" :key="`${item.resource_type}:${item.stable_key}`" class="mobile-item-card">
          <header>
            <strong>{{ item.display_name }}</strong>
            <el-tag :type="actionTag(item.action)" size="small">{{ actionLabel(item.action) }}</el-tag>
          </header>
          <dl>
            <div><dt>{{ t('tenantConfigTransfer.itemResource') }}</dt><dd>{{ resourceLabel(item.resource_type) }}</dd></div>
            <div><dt>{{ t('tenantConfigTransfer.stableKey') }}</dt><dd>{{ item.stable_key }}</dd></div>
            <div><dt>{{ t('tenantConfigTransfer.outcome') }}</dt><dd>{{ outcomeLabel(item.outcome) }}</dd></div>
            <div v-if="item.detail || item.detail_code"><dt>{{ t('tenantConfigTransfer.detail') }}</dt><dd>{{ detailLabel(item) }}</dd></div>
          </dl>
        </article>
      </div>

      <el-pagination
        v-if="itemsTotal > itemsPageSize"
        :current-page="itemsPage"
        :page-size="itemsPageSize"
        :total="itemsTotal"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="(page: number) => emit('items-page-change', page, itemsPageSize)"
        @size-change="(size: number) => emit('items-page-change', 1, size)"
      />
    </template>
  </el-card>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { TenantConfigTransfer, TenantConfigTransferItem } from '@/api/modules/tenantConfigTransfer'
import { formatOptionalLocalizedDate } from '@/i18n'
import {
  canApplyTenantConfigTransfer,
  canPreviewTenantConfigTransfer,
  canRollbackTenantConfigTransfer,
} from '../presentation'

defineProps<{
  transfer?: TenantConfigTransfer
  items: TenantConfigTransferItem[]
  itemsLoading: boolean
  itemsPage: number
  itemsPageSize: number
  itemsTotal: number
  previewing: boolean
  applying: boolean
  rollingBack: boolean
  operationPending: boolean
}>()

const emit = defineEmits<{
  preview: [transfer: TenantConfigTransfer]
  apply: [transfer: TenantConfigTransfer]
  rollback: [transfer: TenantConfigTransfer]
  'items-page-change': [page: number, pageSize: number]
}>()

const { t } = useI18n()
const planActions = ['create', 'update', 'unchanged', 'conflict', 'blocked'] as const

function hasBlockedItems(transfer: TenantConfigTransfer): boolean {
  return (transfer.change_counts.blocked ?? 0) > 0
    || (transfer.change_counts.conflict ?? 0) > 0
}

function transferStatusLabel(status: string): string {
  const suffix = {
    preview_ready: 'PreviewReady',
    preview_pending: 'PreviewPending',
    previewing: 'Previewing',
    previewed: 'Previewed',
    apply_pending: 'ApplyPending',
    applying: 'Applying',
    applied: 'Applied',
    rollback_pending: 'RollbackPending',
    rolling_back: 'RollingBack',
    rolled_back: 'RolledBack',
    failed: 'Failed',
  }[status] ?? 'Unknown'
  return t(`tenantConfigTransfer.status${suffix}`)
}

function transferStatusTag(status: string): TagProps['type'] {
  if (status === 'applied' || status === 'previewed') return 'success'
  if (status === 'rolled_back') return 'info'
  if (status === 'failed') return 'danger'
  if (status.includes('pending')) return 'warning'
  return 'primary'
}

function actionLabel(action: string): string {
  return t(`tenantConfigTransfer.${planActions.includes(action as typeof planActions[number]) ? action : 'unchanged'}`)
}

function actionTag(action: string): TagProps['type'] {
  if (action === 'create') return 'success'
  if (action === 'update') return 'primary'
  if (action === 'conflict' || action === 'blocked') return 'danger'
  return 'info'
}

function outcomeLabel(outcome: string): string {
  const suffix = {
    pending: 'Pending',
    applied: 'Applied',
    skipped: 'Skipped',
    failed: 'Failed',
    rolled_back: 'RolledBack',
  }[outcome] ?? 'Pending'
  return t(`tenantConfigTransfer.outcome${suffix}`)
}

function resourceLabel(resource: string): string {
  const suffix = {
    department: 'resourceDepartments',
    departments: 'resourceDepartments',
    post: 'resourcePosts',
    posts: 'resourcePosts',
    dict_type: 'resourceDictTypes',
    dict_types: 'resourceDictTypes',
    dictionary_type: 'resourceDictTypes',
    dictionary_types: 'resourceDictTypes',
    dict_datum: 'resourceDictData',
    dict_data: 'resourceDictData',
    dictionary_data: 'resourceDictData',
    config: 'resourceConfigs',
    configs: 'resourceConfigs',
    permission: 'resourcePermissions',
    permissions: 'resourcePermissions',
    menu: 'resourceMenus',
    menus: 'resourceMenus',
    role: 'resourceRoles',
    roles: 'resourceRoles',
    role_permission: 'resourceRolePermissions',
    role_permissions: 'resourceRolePermissions',
    role_department: 'resourceRoleDepartments',
    role_dept: 'resourceRoleDepartments',
    role_departments: 'resourceRoleDepartments',
    role_depts: 'resourceRoleDepartments',
  }[resource]
  return suffix ? t(`tenantConfigTransfer.${suffix}`) : resource
}

function detailLabel(item: TenantConfigTransferItem): string {
  if (!item.detail_code) return item.detail || '—'
  const suffix = {
    protected_permission: 'detailProtectedPermission',
    permission_not_registered: 'detailPermissionNotRegistered',
    permission_catalog_mismatch: 'detailPermissionCatalogMismatch',
    route_not_registered: 'detailRouteNotRegistered',
    route_catalog_mismatch: 'detailRouteCatalogMismatch',
  }[item.detail_code]
  return t(`tenantConfigTransfer.${suffix ?? 'detailUnknown'}`)
}
</script>

<style scoped lang="scss">
.plan-card {
  margin-top: 12px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 0 0 4px;
  }

  p {
    margin: 0;
    color: var(--color-text-secondary);
    font-weight: 400;
  }
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.plan-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.plan-overview > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--border-color-base);
  border-radius: 10px;
  background: var(--el-fill-color-light);

  > span,
  > small {
    color: var(--color-text-secondary);
  }

  > strong,
  > small {
    overflow-wrap: anywhere;
  }
}

.plan-alert {
  margin-bottom: 12px;
}

.change-counts {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0;
}

.change-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  border-left: 3px solid var(--el-color-info);
  border-radius: 8px;
  background: var(--el-fill-color-light);

  &--create { border-left-color: var(--el-color-success); }

  &--update { border-left-color: var(--el-color-primary); }

  &--conflict,
  &--blocked { border-left-color: var(--el-color-danger); }

  strong {
    font-size: 20px;
  }
}

.desktop-items-table {
  max-width: 100%;
  overflow-x: auto;

  :deep(.el-table) {
    min-width: 980px;
  }
}

.mobile-item-list {
  display: none;
}

@media (width <= 900px) {
  .plan-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .change-counts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width <= 767px) {
  .panel-header {
    flex-direction: column;
  }

  .panel-actions {
    width: 100%;
    justify-content: flex-start;

    :deep(.el-button) {
      min-height: 40px;
      margin-left: 0;
    }
  }

  .plan-overview {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .change-counts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .desktop-items-table {
    display: none;
  }

  .mobile-item-list {
    display: grid;
    gap: 10px;
  }

  .mobile-item-card {
    padding: 12px;
    border: 1px solid var(--border-color-base);
    border-radius: 10px;

    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    dl {
      display: grid;
      gap: 8px;
      margin: 12px 0 0;
    }

    dl > div {
      display: grid;
      grid-template-columns: minmax(90px, 0.75fr) minmax(0, 1.25fr);
      gap: 8px;
    }

    dt {
      color: var(--color-text-secondary);
    }

    dd {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
      text-align: right;
    }
  }
}
</style>
