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
            {{
              t(
                `tenantConfigTransfer.${transfer.status === 'previewed' || transfer.status === 'failed' ? 'previewAgain' : 'preview'}`,
              )
            }}
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
          <el-tag :type="transferStatusTag(transfer.status)">{{
            transferStatusLabel(transfer.status)
          }}</el-tag>
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
        <div
          v-for="action in planActions"
          :key="action"
          :class="`change-count change-count--${action}`"
        >
          <span>{{ actionLabel(action) }}</span>
          <strong>{{ transfer.change_counts[action] ?? 0 }}</strong>
        </div>
      </section>

      <div class="desktop-items-table">
        <el-table
          v-loading="itemsLoading"
          :data="items"
          border
          stripe
          :empty-text="t('tenantConfigTransfer.itemsEmpty')"
        >
          <el-table-column :label="t('tenantConfigTransfer.itemResource')" min-width="140">
            <template #default="{ row }">{{ resourceLabel(row.resource_type) }}</template>
          </el-table-column>
          <el-table-column
            prop="display_name"
            :label="t('tenantConfigTransfer.itemName')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            prop="stable_key"
            :label="t('tenantConfigTransfer.stableKey')"
            min-width="220"
            show-overflow-tooltip
          />
          <el-table-column :label="t('tenantConfigTransfer.action')" width="112">
            <template #default="{ row }">
              <el-tag :type="actionTag(row.action)" size="small">{{
                actionLabel(row.action)
              }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('tenantConfigTransfer.outcome')" width="118">
            <template #default="{ row }">{{ outcomeLabel(row.outcome) }}</template>
          </el-table-column>
          <el-table-column
            :label="t('tenantConfigTransfer.detail')"
            min-width="220"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{
              detailLabelByKey(row.resource_type, row.stable_key)
            }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="items.length" v-loading="itemsLoading" class="mobile-item-list">
        <article
          v-for="item in items"
          :key="`${item.resource_type}:${item.stable_key}`"
          class="mobile-item-card"
        >
          <header>
            <strong>{{ item.display_name }}</strong>
            <el-tag :type="actionTag(item.action)" size="small">{{
              actionLabel(item.action)
            }}</el-tag>
          </header>
          <dl>
            <div>
              <dt>{{ t('tenantConfigTransfer.itemResource') }}</dt>
              <dd>{{ resourceLabel(item.resource_type) }}</dd>
            </div>
            <div>
              <dt>{{ t('tenantConfigTransfer.stableKey') }}</dt>
              <dd>{{ item.stable_key }}</dd>
            </div>
            <div>
              <dt>{{ t('tenantConfigTransfer.outcome') }}</dt>
              <dd>{{ outcomeLabel(item.outcome) }}</dd>
            </div>
            <div v-if="item.detail || item.detail_code">
              <dt>{{ t('tenantConfigTransfer.detail') }}</dt>
              <dd>{{ detailLabel(item) }}</dd>
            </div>
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
import type {
  TenantConfigTransfer,
  TenantConfigTransferItem,
} from '@/api/modules/tenantConfigTransfer'
import { formatOptionalLocalizedDate } from '@/i18n'
import {
  canApplyTenantConfigTransfer,
  canPreviewTenantConfigTransfer,
  canRollbackTenantConfigTransfer,
  tenantConfigResourceLabel,
} from '../presentation'

const props = defineProps<{
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
  return (transfer.change_counts.blocked ?? 0) > 0 || (transfer.change_counts.conflict ?? 0) > 0
}

function transferStatusLabel(status: string): string {
  const suffix =
    {
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
  return t(
    `tenantConfigTransfer.${planActions.includes(action as (typeof planActions)[number]) ? action : 'unchanged'}`,
  )
}

function actionTag(action: string): TagProps['type'] {
  if (action === 'create') return 'success'
  if (action === 'update') return 'primary'
  if (action === 'conflict' || action === 'blocked') return 'danger'
  return 'info'
}

function outcomeLabel(outcome: string): string {
  const suffix =
    {
      pending: 'Pending',
      applied: 'Applied',
      skipped: 'Skipped',
      failed: 'Failed',
      rolled_back: 'RolledBack',
    }[outcome] ?? 'Pending'
  return t(`tenantConfigTransfer.outcome${suffix}`)
}

function resourceLabel(resource: string): string {
  return tenantConfigResourceLabel(resource, t)
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

function detailLabelByKey(resourceType: string, stableKey: string): string {
  const item = props.items.find(
    (candidate) => candidate.resource_type === resourceType && candidate.stable_key === stableKey,
  )
  return item ? detailLabel(item) : '—'
}
</script>

<style scoped lang="scss" src="./ConfigTransferPlan.scss"></style>
