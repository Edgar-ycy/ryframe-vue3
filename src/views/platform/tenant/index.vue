<template>
  <div class="page-container tenant-capacity-page">
    <header class="page-heading">
      <div>
        <h1>{{ t('tenantCapacity.title') }}</h1>
        <p>{{ t('tenantCapacity.subtitle') }}</p>
      </div>
      <div class="page-heading__actions">
        <el-button icon="Refresh" :loading="refreshing" @click="handleRefresh">
          {{ t('tenantCapacity.refresh') }}
        </el-button>
        <el-button v-perm="'tenant:add'" type="primary" icon="Plus" @click="openCreate">
          {{ t('tenantCapacity.createTenant') }}
        </el-button>
      </div>
    </header>

    <el-card shadow="never" class="filter-card">
      <el-form
        :model="filters"
        class="filter-form"
        label-position="top"
        @submit.prevent="handleSearch"
      >
        <el-form-item :label="t('tenantCapacity.tenantId')">
          <el-input
            v-model="filters.tenant_id"
            :placeholder="t('tenantCapacity.tenantIdPlaceholder')"
            clearable
            maxlength="64"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item :label="t('tenantCapacity.tenantName')">
          <el-input
            v-model="filters.name"
            :placeholder="t('tenantCapacity.tenantNamePlaceholder')"
            clearable
            maxlength="100"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item :label="t('tenantCapacity.status')">
          <el-select
            v-model="filters.status"
            :placeholder="t('tenantCapacity.statusAll')"
            clearable
          >
            <el-option :label="t('tenantCapacity.statusEnabled')" value="enabled" />
            <el-option :label="t('tenantCapacity.statusDisabled')" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('tenantCapacity.expiration')">
          <el-select
            v-model="filters.expiration_status"
            :placeholder="t('tenantCapacity.expirationAll')"
            clearable
          >
            <el-option :label="t('tenantCapacity.expirationActive')" value="active" />
            <el-option :label="t('tenantCapacity.expirationExpiring')" value="expiring" />
            <el-option :label="t('tenantCapacity.expirationExpired')" value="expired" />
            <el-option :label="t('tenantCapacity.expirationNever')" value="never" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="canViewUsage" :label="t('tenantCapacity.capacityStatus')">
          <el-select
            v-model="filters.capacity_status"
            :placeholder="t('tenantCapacity.capacityAll')"
            clearable
          >
            <el-option :label="t('tenantCapacity.capacityNormal')" value="normal" />
            <el-option :label="t('tenantCapacity.capacityWarning')" value="warning" />
            <el-option :label="t('tenantCapacity.capacityCritical')" value="critical" />
            <el-option :label="t('tenantCapacity.capacityExceeded')" value="exceeded" />
            <el-option :label="t('tenantCapacity.capacityUnlimited')" value="unlimited" />
            <el-option :label="t('tenantCapacity.capacityUnknown')" value="unknown" />
          </el-select>
        </el-form-item>
        <div class="filter-actions">
          <el-button type="primary" icon="Search" @click="handleSearch">{{
            t('tenantCapacity.search')
          }}</el-button>
          <el-button icon="RefreshLeft" @click="handleReset">{{
            t('tenantCapacity.reset')
          }}</el-button>
        </div>
      </el-form>
    </el-card>

    <el-alert
      v-if="!canViewUsage"
      :title="t('tenantCapacity.usagePermissionHint')"
      type="info"
      show-icon
      :closable="false"
      class="permission-alert"
    />

    <TenantCapacityList
      :can-view-usage="canViewUsage"
      :loading="loading"
      :page="page"
      :page-size="pageSize"
      :status-pending="statusPending"
      :tenant-page="tenantPage"
      :toggling-tenant-id="togglingTenantId"
      :format-date="formatDate"
      :status-label="statusLabel"
      :capacity-type="capacityType"
      :capacity-label="capacityLabel"
      :expiration-type="expirationType"
      :expiration-label="expirationLabel"
      @detail="showDetail"
      @edit="openEdit"
      @toggle="handleToggle"
      @page-change="changePage"
      @page-size-change="changePageSize"
    />

    <TenantFormDialog
      v-model="formVisible"
      :tenant="editingTenant"
      :submitting="savePending"
      @create="handleCreate"
      @update="handleUpdate"
    />
    <TenantUsageDrawer
      v-model="detailVisible"
      :tenant="detail"
      :loading="detailLoading"
      :refreshing="detailRefreshing"
      @closed="closeDetail"
      @refresh="handleRefreshDetail"
      @edit="openEditFromDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { CreateTenantPayload, TenantCapacity, UpdateTenantPayload } from '@/api/modules/tenant'
import { formatLocalizedDate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import { confirmAction } from '@/utils/confirmAction'
import TenantCapacityList from './components/TenantCapacityList.vue'
import TenantFormDialog from './components/TenantFormDialog.vue'
import TenantUsageDrawer from './components/TenantUsageDrawer.vue'
import { capacityStatusType } from './presentation'
import { useTenantCapacityManagement } from './useTenantCapacityManagement'

const { t } = useI18n()
const formVisible = ref(false)
const detailVisible = ref(false)
const editingTenant = ref<TenantCapacity>()

const {
  canViewUsage,
  changePage,
  changePageSize,
  closeDetail,
  createTenantRecord,
  detail,
  detailLoading,
  detailRefreshing,
  filters,
  loading,
  openDetail,
  page,
  pageSize,
  refresh,
  refreshing,
  refreshDetail,
  resetFilters,
  savePending,
  statusPending,
  tenantPage,
  togglingTenantId,
  toggleTenantStatus,
  updateTenantRecord,
  applyFilters,
} = useTenantCapacityManagement()

function openCreate(): void {
  editingTenant.value = undefined
  formVisible.value = true
}

function openEdit(tenant: TenantCapacity): void {
  editingTenant.value = tenant
  formVisible.value = true
}

function openEditFromDrawer(tenant: TenantCapacity): void {
  detailVisible.value = false
  openEdit(tenant)
}

async function handleCreate(payload: CreateTenantPayload): Promise<void> {
  try {
    await createTenantRecord(payload)
    formVisible.value = false
    ElMessage.success(t('tenantCapacity.tenantCreated'))
  } catch (error) {
    showError(error)
  }
}

async function handleUpdate(tenantId: string, payload: UpdateTenantPayload): Promise<void> {
  try {
    await updateTenantRecord(tenantId, payload)
    formVisible.value = false
    ElMessage.success(t('tenantCapacity.tenantUpdated'))
  } catch (error) {
    showError(error)
  }
}

async function handleToggle(tenant: TenantCapacity): Promise<void> {
  if (statusPending.value) return
  if (tenant.status !== 'enabled' && tenant.status !== 'disabled') return
  if (tenant.tenant_id === 'system') {
    ElMessage.warning(t('tenantCapacity.systemTenantCannotDisable'))
    return
  }
  const nextEnabled = tenant.status !== 'enabled'
  const confirmed = await confirmAction(
    t('tenantCapacity.statusConfirm', {
      name: tenant.name || tenant.tenant_id,
      status: nextEnabled ? t('tenantCapacity.statusEnabled') : t('tenantCapacity.statusDisabled'),
    }),
    t('tenantCapacity.statusConfirmTitle'),
    { type: 'warning' },
  )
  if (!confirmed || statusPending.value) return
  try {
    await toggleTenantStatus(tenant.tenant_id, nextEnabled ? 'enabled' : 'disabled')
    ElMessage.success(t('tenantCapacity.tenantStatusUpdated'))
  } catch (error) {
    showError(error)
  }
}

async function handleSearch(): Promise<void> {
  try {
    await applyFilters()
  } catch (error) {
    showError(error)
  }
}

async function handleReset(): Promise<void> {
  try {
    await resetFilters()
  } catch (error) {
    showError(error)
  }
}

async function handleRefresh(): Promise<void> {
  try {
    await refresh()
  } catch (error) {
    showError(error)
  }
}

async function showDetail(tenantId: string): Promise<void> {
  detailVisible.value = true
  try {
    await openDetail(tenantId)
  } catch (error) {
    showError(error)
  }
}

async function handleRefreshDetail(): Promise<void> {
  try {
    await refreshDetail()
  } catch (error) {
    showError(error)
  }
}

function showError(error: unknown): void {
  if (error instanceof HttpError && error.kind === 'cancelled') return
  ElMessage.error(error instanceof Error ? error.message : t('shell.http.requestFailed'))
}

function formatDate(value: string | null | undefined): string {
  return value ? formatLocalizedDate(value) : t('tenantCapacity.notAvailable')
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    enabled: 'statusEnabled',
    disabled: 'statusDisabled',
    provisioning: 'statusProvisioning',
    provisioning_failed: 'statusProvisioningFailed',
  }
  return t(`tenantCapacity.${labels[status] ?? 'statusUnknown'}`)
}

function capacityType(status: string | null | undefined): TagProps['type'] {
  return capacityStatusType(status)
}

function capacityLabel(status: string | null | undefined): string {
  const suffixes: Record<string, string> = {
    normal: 'Normal',
    warning: 'Warning',
    critical: 'Critical',
    exceeded: 'Exceeded',
    unlimited: 'Unlimited',
    unknown: 'Unknown',
  }
  return t(`tenantCapacity.capacity${status ? (suffixes[status] ?? 'Unknown') : 'Unknown'}`)
}

function expirationType(status: string): TagProps['type'] {
  if (status === 'expired') return 'danger'
  if (status === 'expiring') return 'warning'
  if (status === 'active') return 'success'
  return 'info'
}

function expirationLabel(status: string): string {
  const suffixes: Record<string, string> = {
    active: 'Active',
    expiring: 'Expiring',
    expired: 'Expired',
    never: 'Never',
  }
  return t(`tenantCapacity.expiration${suffixes[status] ?? 'Active'}`)
}
</script>

<style scoped lang="scss">
.tenant-capacity-page {
  min-width: 0;
  max-width: 100%;
}

.page-heading,
.page-heading__actions,
.filter-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-heading {
  align-items: flex-start;
  margin-bottom: 16px;
}

.page-heading h1 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 24px;
}

.page-heading p {
  max-width: 760px;
  margin: 7px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.filter-card,
.permission-alert {
  margin-bottom: 16px;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 1fr)) auto;
  gap: 12px;
  align-items: end;
}

.filter-form :deep(.el-form-item) {
  min-width: 0;
  margin-bottom: 0;
}

.filter-form :deep(.el-select) {
  width: 100%;
}

.filter-actions {
  justify-content: flex-end;
  padding-bottom: 1px;
}

@media (width <= 1100px) {
  .filter-form {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }
}

@media (width <= 767px) {
  .page-heading {
    flex-direction: column;
  }

  .page-heading__actions,
  .page-heading__actions :deep(.el-button) {
    width: 100%;
  }

  .page-heading__actions :deep(.el-button) {
    min-height: 42px;
  }

  .filter-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-actions {
    grid-column: 1 / -1;
  }

  .filter-actions :deep(.el-button) {
    flex: 1;
    min-height: 42px;
  }
}

@media (width <= 480px) {
  .filter-form {
    grid-template-columns: minmax(0, 1fr);
  }

  .filter-actions {
    grid-column: auto;
  }

  .filter-card :deep(.el-card__body) {
    padding: 12px;
  }
}
</style>
