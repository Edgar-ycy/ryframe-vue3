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
      <el-form :model="filters" class="filter-form" label-position="top" @submit.prevent="handleSearch">
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
          <el-select v-model="filters.status" :placeholder="t('tenantCapacity.statusAll')" clearable>
            <el-option :label="t('tenantCapacity.statusEnabled')" value="enabled" />
            <el-option :label="t('tenantCapacity.statusDisabled')" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('tenantCapacity.expiration')">
          <el-select v-model="filters.expiration_status" :placeholder="t('tenantCapacity.expirationAll')" clearable>
            <el-option :label="t('tenantCapacity.expirationActive')" value="active" />
            <el-option :label="t('tenantCapacity.expirationExpiring')" value="expiring" />
            <el-option :label="t('tenantCapacity.expirationExpired')" value="expired" />
            <el-option :label="t('tenantCapacity.expirationNever')" value="never" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="canViewUsage" :label="t('tenantCapacity.capacityStatus')">
          <el-select v-model="filters.capacity_status" :placeholder="t('tenantCapacity.capacityAll')" clearable>
            <el-option :label="t('tenantCapacity.capacityNormal')" value="normal" />
            <el-option :label="t('tenantCapacity.capacityWarning')" value="warning" />
            <el-option :label="t('tenantCapacity.capacityCritical')" value="critical" />
            <el-option :label="t('tenantCapacity.capacityExceeded')" value="exceeded" />
            <el-option :label="t('tenantCapacity.capacityUnlimited')" value="unlimited" />
            <el-option :label="t('tenantCapacity.capacityUnknown')" value="unknown" />
          </el-select>
        </el-form-item>
        <div class="filter-actions">
          <el-button type="primary" icon="Search" @click="handleSearch">{{ t('tenantCapacity.search') }}</el-button>
          <el-button icon="RefreshLeft" @click="handleReset">{{ t('tenantCapacity.reset') }}</el-button>
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

    <el-card shadow="never" class="tenant-list-card">
      <template #header>
        <div class="list-heading">
          <strong>{{ t('tenantCapacity.total', { count: tenantPage?.total ?? 0 }) }}</strong>
          <span v-if="tenantPage?.items[0]?.usage">
            {{ t('tenantCapacity.calculatedAt') }}: {{ formatDate(tenantPage.items[0].usage.calculated_at) }}
          </span>
        </div>
      </template>

      <div class="tenant-table-wrap">
        <el-table v-loading="loading" :data="tenantPage?.items ?? []" border stripe class="tenant-table">
          <el-table-column :label="t('tenantCapacity.tenantName')" min-width="190" fixed="left">
            <template #default="{ row }">
              <button class="tenant-name-button" type="button" @click="showDetail(row.tenant_id)">
                <strong>{{ row.name }}</strong>
                <small>{{ row.tenant_id }}</small>
              </button>
            </template>
          </el-table-column>
          <el-table-column :label="t('tenantCapacity.status')" width="112" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'enabled' ? 'success' : 'danger'">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('tenantCapacity.expiration')" min-width="165">
            <template #default="{ row }">
              <div class="expiration-cell">
                <el-tag :type="expirationType(row.expiration_status)" effect="plain" size="small">
                  {{ expirationLabel(row.expiration_status) }}
                </el-tag>
                <span>{{ formatDate(row.expire_at) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="canViewUsage" :label="t('tenantCapacity.capacityStatus')" width="150" align="center">
            <template #default="{ row }">
              <el-tag :type="capacityType(row.capacity_status)" effect="plain">
                {{ capacityLabel(row.capacity_status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="canViewUsage" :label="t('tenantCapacity.users')" min-width="220">
            <template #default="{ row }">
              <TenantQuotaMeter v-if="row.usage" :label="t('tenantCapacity.users')" :quota="row.usage.users" />
              <span v-else>{{ t('tenantCapacity.notAvailable') }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="canViewUsage" :label="t('tenantCapacity.roles')" min-width="220">
            <template #default="{ row }">
              <TenantQuotaMeter v-if="row.usage" :label="t('tenantCapacity.roles')" :quota="row.usage.roles" />
              <span v-else>{{ t('tenantCapacity.notAvailable') }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="canViewUsage" :label="t('tenantCapacity.storage')" min-width="240">
            <template #default="{ row }">
              <TenantQuotaMeter v-if="row.usage" :label="t('tenantCapacity.storage')" :quota="row.usage.storage" unit="storage" />
              <span v-else>{{ t('tenantCapacity.notAvailable') }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('tenantCapacity.actions')" width="238" fixed="right" align="center">
            <template #default="{ row }">
              <el-button type="primary" link icon="View" @click="showDetail(row.tenant_id)">
                {{ t('tenantCapacity.details') }}
              </el-button>
              <el-button v-perm="'tenant:edit'" type="primary" link icon="Edit" :disabled="statusPending" @click="openEdit(row)">
                {{ t('tenantCapacity.edit') }}
              </el-button>
              <el-button
                v-perm="'tenant:status'"
                :type="row.status === 'enabled' ? 'warning' : 'success'"
                link
                :loading="togglingTenantId === row.tenant_id"
                :disabled="row.tenant_id === 'system' || statusPending"
                @click="handleToggle(row)"
              >
                {{ row.status === 'enabled' ? t('tenantCapacity.disable') : t('tenantCapacity.enable') }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="t('tenantCapacity.empty')" :image-size="72" />
          </template>
        </el-table>
      </div>

      <div v-loading="loading" class="tenant-card-list" aria-live="polite">
        <el-empty v-if="!loading && (tenantPage?.items.length ?? 0) === 0" :description="t('tenantCapacity.empty')" />
        <article v-for="tenant in tenantPage?.items ?? []" :key="tenant.tenant_id" class="tenant-mobile-card">
          <header>
            <button type="button" @click="showDetail(tenant.tenant_id)">
              <strong>{{ tenant.name }}</strong>
              <small>{{ tenant.tenant_id }}</small>
            </button>
            <el-tag :type="tenant.status === 'enabled' ? 'success' : 'danger'" size="small">
              {{ statusLabel(tenant.status) }}
            </el-tag>
          </header>
          <div class="mobile-tags">
            <el-tag :type="expirationType(tenant.expiration_status)" effect="plain" size="small">
              {{ expirationLabel(tenant.expiration_status) }}
            </el-tag>
            <el-tag v-if="tenant.capacity_status" :type="capacityType(tenant.capacity_status)" effect="plain" size="small">
              {{ capacityLabel(tenant.capacity_status) }}
            </el-tag>
          </div>
          <p class="mobile-expiry">{{ t('tenantCapacity.expireAt') }}: {{ formatDate(tenant.expire_at) }}</p>
          <div v-if="tenant.usage" class="mobile-quotas">
            <TenantQuotaMeter :label="t('tenantCapacity.users')" :quota="tenant.usage.users" />
            <TenantQuotaMeter :label="t('tenantCapacity.roles')" :quota="tenant.usage.roles" />
            <TenantQuotaMeter :label="t('tenantCapacity.storage')" :quota="tenant.usage.storage" unit="storage" />
          </div>
          <footer>
            <el-button type="primary" plain icon="View" @click="showDetail(tenant.tenant_id)">
              {{ t('tenantCapacity.details') }}
            </el-button>
            <el-button v-perm="'tenant:edit'" icon="Edit" :disabled="statusPending" @click="openEdit(tenant)">
              {{ t('tenantCapacity.edit') }}
            </el-button>
            <el-button
              v-perm="'tenant:status'"
              :type="tenant.status === 'enabled' ? 'warning' : 'success'"
              :loading="togglingTenantId === tenant.tenant_id"
              :disabled="tenant.tenant_id === 'system' || statusPending"
              @click="handleToggle(tenant)"
            >
              {{ tenant.status === 'enabled' ? t('tenantCapacity.disable') : t('tenantCapacity.enable') }}
            </el-button>
          </footer>
        </article>
      </div>

      <el-pagination
        v-if="(tenantPage?.total ?? 0) > 0"
        class="tenant-pagination tenant-pagination--desktop"
        :current-page="page"
        :page-size="pageSize"
        :total="tenantPage?.total ?? 0"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="changePage"
        @size-change="changePageSize"
      />
      <div v-if="(tenantPage?.total ?? 0) > 0" class="tenant-pagination-mobile">
        <el-select :model-value="pageSize" :aria-label="t('tenantCapacity.total', { count: tenantPage?.total ?? 0 })" @update:model-value="changePageSize">
          <el-option v-for="size in [10, 20, 50, 100]" :key="size" :label="String(size)" :value="size" />
        </el-select>
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :total="tenantPage?.total ?? 0"
          layout="prev, pager, next"
          small
          background
          @current-change="changePage"
        />
      </div>
    </el-card>

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
import type {
  CreateTenantPayload,
  TenantCapacity,
  UpdateTenantPayload,
} from '@/api/modules/tenant'
import { formatLocalizedDate } from '@/i18n'
import { installTenantCapacityMessages } from '@/i18n/catalog/tenant-capacity'
import { confirmAction } from '@/utils/confirmAction'
import TenantFormDialog from './components/TenantFormDialog.vue'
import TenantQuotaMeter from './components/TenantQuotaMeter.vue'
import TenantUsageDrawer from './components/TenantUsageDrawer.vue'
import { capacityStatusType } from './presentation'
import { useTenantCapacityManagement } from './useTenantCapacityManagement'

installTenantCapacityMessages()
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
  }
  catch (error) {
    showError(error)
  }
}

async function handleUpdate(tenantId: string, payload: UpdateTenantPayload): Promise<void> {
  try {
    await updateTenantRecord(tenantId, payload)
    formVisible.value = false
    ElMessage.success(t('tenantCapacity.tenantUpdated'))
  }
  catch (error) {
    showError(error)
  }
}

async function handleToggle(tenant: TenantCapacity): Promise<void> {
  if (statusPending.value) return
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
    await toggleTenantStatus(tenant.tenant_id, nextEnabled ? '1' : '0')
    ElMessage.success(t('tenantCapacity.tenantStatusUpdated'))
  }
  catch (error) {
    showError(error)
  }
}

async function handleSearch(): Promise<void> {
  try {
    await applyFilters()
  }
  catch (error) {
    showError(error)
  }
}

async function handleReset(): Promise<void> {
  try {
    await resetFilters()
  }
  catch (error) {
    showError(error)
  }
}

async function handleRefresh(): Promise<void> {
  try {
    await refresh()
  }
  catch (error) {
    showError(error)
  }
}

async function showDetail(tenantId: string): Promise<void> {
  detailVisible.value = true
  try {
    await openDetail(tenantId)
  }
  catch (error) {
    showError(error)
  }
}

async function handleRefreshDetail(): Promise<void> {
  try {
    await refreshDetail()
  }
  catch (error) {
    showError(error)
  }
}

function showError(error: unknown): void {
  ElMessage.error(error instanceof Error ? error.message : t('shell.http.requestFailed'))
}

function formatDate(value: string | null | undefined): string {
  return value ? formatLocalizedDate(value) : t('tenantCapacity.notAvailable')
}

function statusLabel(status: string): string {
  return status === 'enabled' ? t('tenantCapacity.statusEnabled') : t('tenantCapacity.statusDisabled')
}

function capacityType(status: string | null | undefined): TagProps['type'] {
  return capacityStatusType(status)
}

function capacityLabel(status: string | null | undefined): string {
  const suffixes: Record<string, string> = {
    normal: 'Normal', warning: 'Warning', critical: 'Critical', exceeded: 'Exceeded', unlimited: 'Unlimited', unknown: 'Unknown',
  }
  return t(`tenantCapacity.capacity${status ? suffixes[status] ?? 'Unknown' : 'Unknown'}`)
}

function expirationType(status: string): TagProps['type'] {
  if (status === 'expired') return 'danger'
  if (status === 'expiring') return 'warning'
  if (status === 'active') return 'success'
  return 'info'
}

function expirationLabel(status: string): string {
  const suffixes: Record<string, string> = {
    active: 'Active', expiring: 'Expiring', expired: 'Expired', never: 'Never',
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
.list-heading,
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

.list-heading span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.tenant-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.tenant-table {
  min-width: 1180px;
}

.tenant-name-button,
.tenant-mobile-card header button {
  display: block;
  min-width: 0;
  padding: 0;
  border: 0;
  color: var(--el-color-primary);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.tenant-name-button:hover strong,
.tenant-name-button:focus-visible strong,
.tenant-mobile-card header button:hover strong,
.tenant-mobile-card header button:focus-visible strong {
  text-decoration: underline;
}

.tenant-name-button:focus-visible,
.tenant-mobile-card header button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 3px;
  border-radius: 3px;
}

.tenant-name-button strong,
.tenant-name-button small,
.tenant-mobile-card header button strong,
.tenant-mobile-card header button small {
  display: block;
}

.tenant-name-button small,
.tenant-mobile-card header button small {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}

.expiration-cell {
  display: grid;
  justify-items: start;
  gap: 7px;
}

.expiration-cell span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.tenant-card-list,
.tenant-pagination-mobile {
  display: none;
}

.tenant-pagination {
  justify-content: flex-end;
  margin-top: 18px;
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

  .list-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .tenant-table-wrap,
  .tenant-pagination--desktop {
    display: none;
  }

  .tenant-card-list {
    display: grid;
    gap: 12px;
    min-height: 120px;
  }

  .tenant-mobile-card {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--el-border-color);
    border-radius: 10px;
    background: var(--el-fill-color-blank);
  }

  .tenant-mobile-card header,
  .mobile-tags,
  .tenant-mobile-card footer {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .tenant-mobile-card header button {
    flex: 1;
  }

  .mobile-tags {
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-top: 12px;
  }

  .mobile-expiry {
    margin: 10px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  .mobile-quotas {
    display: grid;
    gap: 16px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .tenant-mobile-card footer {
    align-items: stretch;
    margin-top: 16px;
  }

  .tenant-mobile-card footer :deep(.el-button) {
    flex: 1;
    min-width: 0;
    min-height: 42px;
    margin-left: 0;
    padding-inline: 8px;
  }

  .tenant-pagination-mobile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 18px;
  }

  .tenant-pagination-mobile > :deep(.el-select) {
    width: 76px;
    flex: none;
  }

  .tenant-pagination-mobile :deep(.el-pager li) {
    display: none;
  }

  .tenant-pagination-mobile :deep(.el-pager li.is-active) {
    display: flex;
  }
}

@media (width <= 480px) {
  .filter-form {
    grid-template-columns: minmax(0, 1fr);
  }

  .filter-actions {
    grid-column: auto;
  }

  .tenant-list-card :deep(.el-card__body),
  .filter-card :deep(.el-card__body) {
    padding: 12px;
  }

  .tenant-mobile-card footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tenant-mobile-card footer :deep(.el-button:first-child) {
    grid-column: 1 / -1;
  }
}
</style>
