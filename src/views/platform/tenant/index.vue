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
    <el-alert
      v-if="tenantPageError"
      :title="tenantPageError.message"
      type="error"
      show-icon
      :closable="false"
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
      :error="detailError"
      :loading="detailLoading"
      :refreshing="detailRefreshing"
      @closed="closeDetail"
      @refresh="handleRefreshDetail"
      @edit="openEditFromDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onBeforeUnmount, onDeactivated, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CreateTenantPayload, TenantCapacity, UpdateTenantPayload } from '@/api/modules/tenant'
import { useServerStateScope } from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import type { ServerStateScope } from '@/shared/query/scope'
import { confirmAction } from '@/utils/confirmAction'
import TenantCapacityList from './components/TenantCapacityList.vue'
import TenantFormDialog from './components/TenantFormDialog.vue'
import TenantUsageDrawer from './components/TenantUsageDrawer.vue'
import { tenantPagePresentation } from './tenantPagePresentation'
import { useTenantCapacityManagement } from './useTenantCapacityManagement'

const { t } = useI18n()
const {
  capacityLabel,
  capacityType,
  expirationLabel,
  expirationType,
  formatDate,
  showError,
  statusLabel,
} = tenantPagePresentation(t)
const formVisible = ref(false)
const detailVisible = ref(false)
const editingTenant = ref<TenantCapacity>()
const pageGeneration = ref(0)

const {
  canViewUsage,
  changePage,
  changePageSize,
  closeDetail,
  createTenantRecord,
  detail,
  detailError,
  detailLoading,
  detailRefreshing,
  filters,
  loading,
  openDetail,
  page,
  pageActive,
  pageSize,
  refresh,
  refreshing,
  refreshDetail,
  resetFilters,
  savePending,
  statusPending,
  tenantPage,
  tenantPageError,
  togglingTenantId,
  toggleTenantStatus,
  updateTenantRecord,
  applyFilters,
} = useTenantCapacityManagement()

function invalidatePageProjection(): void {
  pageGeneration.value += 1
  formVisible.value = false
  detailVisible.value = false
  editingTenant.value = undefined
  void closeDetail()
}

watch(useServerStateScope(), invalidatePageProjection, { flush: 'sync' })
watch(formVisible, (visible, previous) => !visible && previous && (pageGeneration.value += 1), {
  flush: 'sync',
})
onDeactivated(invalidatePageProjection)
onBeforeUnmount(invalidatePageProjection)

function openCreate(): void {
  pageGeneration.value += 1
  editingTenant.value = undefined
  formVisible.value = true
}

function openEdit(tenant: TenantCapacity): void {
  pageGeneration.value += 1
  editingTenant.value = tenant
  formVisible.value = true
}

function openEditFromDrawer(tenant: TenantCapacity): void {
  detailVisible.value = false
  openEdit(tenant)
}

async function handleCreate(payload: CreateTenantPayload, scope: ServerStateScope): Promise<void> {
  const generation = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () =>
    pageActive.value && formVisible.value && pageGeneration.value === generation
  try {
    operation.assertCurrent(ownsOperation)
    await createTenantRecord(payload, scope, () => operation.assertCurrent(ownsOperation))
    operation.apply(() => {
      formVisible.value = false
      ElMessage.success(t('tenantCapacity.tenantCreated'))
    }, ownsOperation)
  } catch (error) {
    if (operation.isCurrent(ownsOperation)) showError(error)
  }
}

async function handleUpdate(
  tenantId: string,
  payload: UpdateTenantPayload,
  scope: ServerStateScope,
): Promise<void> {
  const generation = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () =>
    pageActive.value && formVisible.value && pageGeneration.value === generation
  try {
    operation.assertCurrent(ownsOperation)
    await updateTenantRecord(tenantId, payload, scope, () => operation.assertCurrent(ownsOperation))
    operation.apply(() => {
      formVisible.value = false
      ElMessage.success(t('tenantCapacity.tenantUpdated'))
    }, ownsOperation)
  } catch (error) {
    if (operation.isCurrent(ownsOperation)) showError(error)
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
  const generation = pageGeneration.value
  const ownsOperation = () => pageActive.value && pageGeneration.value === generation
  const operation = await confirmServerStatePageOperation(
    () =>
      confirmAction(
        t('tenantCapacity.statusConfirm', {
          name: tenant.name || tenant.tenant_id,
          status: nextEnabled
            ? t('tenantCapacity.statusEnabled')
            : t('tenantCapacity.statusDisabled'),
        }),
        t('tenantCapacity.statusConfirmTitle'),
        { type: 'warning' },
      ),
    ownsOperation,
  )
  if (!operation || statusPending.value) return
  try {
    operation.assertCurrent(ownsOperation)
    await toggleTenantStatus(
      tenant.tenant_id,
      nextEnabled ? 'enabled' : 'disabled',
      operation.scope,
      () => operation.assertCurrent(ownsOperation),
    )
    operation.apply(() => ElMessage.success(t('tenantCapacity.tenantStatusUpdated')), ownsOperation)
  } catch (error) {
    if (operation.isCurrent(ownsOperation)) showError(error)
  }
}

async function handleSearch(): Promise<void> {
  await applyFilters().catch(() => undefined)
}

async function handleReset(): Promise<void> {
  await resetFilters().catch(() => undefined)
}

async function handleRefresh(): Promise<void> {
  await refresh().catch(() => undefined)
}

async function showDetail(tenantId: string): Promise<void> {
  const generation = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () => pageActive.value && pageGeneration.value === generation
  detailVisible.value = true
  try {
    operation.assertCurrent(ownsOperation)
    await openDetail(tenantId)
    operation.assertCurrent(ownsOperation)
  } catch {
    return
  }
}

async function handleRefreshDetail(): Promise<void> {
  await refreshDetail().catch(() => undefined)
}
</script>

<style scoped lang="scss" src="./tenantPage.scss"></style>
