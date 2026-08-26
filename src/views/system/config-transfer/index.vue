<template>
  <div class="page-container config-transfer-page">
    <header class="page-heading">
      <div>
        <h1>{{ t('tenantConfigTransfer.title') }}</h1>
        <p>{{ t('tenantConfigTransfer.subtitle') }}</p>
      </div>
      <el-button
        v-perm="'system:config-transfer:list'"
        icon="Clock"
        :aria-label="t('tenantConfigTransfer.viewHistory')"
        @click="historyVisible = true"
      >
        {{ t('tenantConfigTransfer.viewHistory') }}
      </el-button>
    </header>

    <el-steps :active="activeStep()" finish-status="success" simple class="transfer-steps">
      <el-step :title="t('tenantConfigTransfer.sourceStep')" />
      <el-step :title="t('tenantConfigTransfer.inspectStep')" />
      <el-step :title="t('tenantConfigTransfer.previewStep')" />
      <el-step :title="t('tenantConfigTransfer.applyStep')" />
    </el-steps>

    <el-alert
      v-if="packagesError?.message || transfersError?.message"
      :title="packagesError?.message || transfersError?.message || ''"
      type="error"
      show-icon
      :closable="false"
      class="page-alert"
    />

    <ConfigPackagePanel
      :packages="packages?.items ?? []"
      :can-list="canListPackages()"
      :loading="packagesLoading"
      :creating="createPackagePending"
      :creating-transfer="createTransferPending"
      :selected-package-id="selectedPackage?.id"
      :downloading-package-id="downloadingPackageId"
      @refresh="refreshPackages"
      @generate="handleGeneratePackage"
      @upload="uploadVisible = true"
      @select="handleSelectPackage"
      @use="handleCreateFromPackage"
      @download="handleDownloadPackage"
    />

    <el-pagination
      v-if="canListPackages() && (packages?.total ?? 0) > (packageQueryParams.page_size ?? 10)"
      v-model:current-page="packageQueryParams.page"
      v-model:page-size="packageQueryParams.page_size"
      :total="packages?.total ?? 0"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      background
      @change="fetchPackages"
    />

    <el-card v-if="selectedPackage" shadow="never" class="selected-package-card">
      <template #header
        ><strong>{{ t('tenantConfigTransfer.selectedPackage') }}</strong></template
      >
      <div class="package-summary">
        <div>
          <span>{{ t('tenantConfigTransfer.sourceTenant') }}</span
          ><strong>{{ selectedPackage.source_tenant_name }}</strong>
        </div>
        <div>
          <span>{{ t('tenantConfigTransfer.sourceKey') }}</span
          ><strong>{{ selectedPackage.source_tenant_key }}</strong>
        </div>
        <div>
          <span>{{ t('tenantConfigTransfer.schemaVersion') }}</span
          ><strong>{{ selectedPackage.package_schema_version }}</strong>
        </div>
        <div>
          <span>{{ t('tenantConfigTransfer.sourceVersion') }}</span
          ><strong>{{ selectedPackage.source_app_version }}</strong>
        </div>
        <div class="package-summary__wide">
          <span>{{ t('tenantConfigTransfer.sha256') }}</span
          ><code>{{ selectedPackage.sha256 || '—' }}</code>
        </div>
        <div>
          <span>{{ t('tenantConfigTransfer.expiresAt') }}</span
          ><strong>{{ formatOptionalLocalizedDate(selectedPackage.expires_at) }}</strong>
        </div>
      </div>
      <div
        v-if="resourceCounts(selectedPackage).length"
        class="resource-tags"
        :aria-label="t('tenantConfigTransfer.resources')"
      >
        <el-tag v-for="entry in resourceCounts(selectedPackage)" :key="entry[0]" type="info">
          {{ resourceLabel(entry[0]) }}: {{ entry[1] }}
        </el-tag>
      </div>
      <el-alert
        v-if="selectedPackage.status === 'pending' || selectedPackage.status === 'running'"
        :title="t('tenantConfigTransfer.generatedPendingHint')"
        type="info"
        show-icon
        :closable="false"
        class="summary-alert"
      />
      <div v-if="canUseSelectedPackage()" class="selected-package-actions">
        <el-button
          v-perm="'system:config-transfer:add'"
          type="primary"
          icon="Right"
          :loading="createTransferPending"
          :disabled="createTransferPending"
          @click="handleCreateFromPackage(selectedPackage)"
        >
          {{ t('tenantConfigTransfer.usePackage') }}
        </el-button>
      </div>
    </el-card>

    <ConfigTransferPlan
      :transfer="selectedTransfer"
      :items="items?.items ?? []"
      :items-loading="itemsLoading"
      :items-page="itemQueryParams.page ?? 1"
      :items-page-size="itemQueryParams.page_size ?? 20"
      :items-total="items?.total ?? 0"
      :previewing="operationIs('preview')"
      :applying="operationIs('apply')"
      :rolling-back="operationIs('rollback')"
      :operation-pending="applyPending"
      @preview="handlePreview"
      @apply="handleApply"
      @rollback="handleRollback"
      @items-page-change="handleItemsPageChange"
    />

    <el-alert
      v-if="itemsError?.message"
      :title="itemsError.message"
      type="error"
      show-icon
      :closable="false"
      class="page-alert"
    />

    <ConfigPackageUploadDialog
      v-model="uploadVisible"
      :loading="createTransferPending"
      @submit="handleUploadPackage"
    />

    <ConfigTransferHistoryDrawer
      v-model="historyVisible"
      :transfers="transfers?.items ?? []"
      :loading="transfersLoading"
      :selected-transfer-id="selectedTransfer?.id"
      :page="queryParams.page ?? 1"
      :page-size="queryParams.page_size ?? 10"
      :total="transfers?.total ?? 0"
      @open="refreshTransfers"
      @closed="handleHistoryClosed"
      @refresh="refreshTransfers"
      @select="handleSelectTransfer"
      @page-change="handleHistoryPageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TenantConfigBundle, TenantConfigTransfer } from '@/api/modules/tenantConfigTransfer'
import { formatOptionalLocalizedDate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import ConfigPackagePanel from './components/ConfigPackagePanel.vue'
import ConfigPackageUploadDialog from './components/ConfigPackageUploadDialog.vue'
import ConfigTransferHistoryDrawer from './components/ConfigTransferHistoryDrawer.vue'
import ConfigTransferPlan from './components/ConfigTransferPlan.vue'
import { useTenantConfigTransferManagement } from './composables/useTenantConfigTransferManagement'
import { canDownloadTenantConfigPackage } from './presentation'

const { t } = useI18n()
const historyVisible = ref(false)
const uploadVisible = ref(false)

const {
  applyPending,
  applyTransfer,
  canListPackages,
  createFromPackage,
  createPackage,
  createPackagePending,
  createTransferPending,
  downloadPackage,
  downloadingPackageId,
  fetchData,
  fetchItems,
  fetchPackages,
  itemQueryParams,
  items,
  itemsError,
  itemsLoading,
  operationKind,
  packageQueryParams,
  packages,
  packagesError,
  packagesLoading,
  previewTransfer,
  queryParams,
  rollbackTransfer,
  selectPackage,
  selectedPackage,
  selectedTransfer,
  selectTransfer,
  transfers,
  transfersError,
  transfersLoading,
  uploadPackage,
} = useTenantConfigTransferManagement()

function activeStep(): number {
  if (!selectedPackage.value && !selectedTransfer.value) return 0
  const status = selectedTransfer.value?.status
  if (!status || status === 'preview_ready') return 1
  if (status.startsWith('preview') || status === 'failed') return status === 'previewed' ? 3 : 2
  return 4
}

function operationIs(kind: 'preview' | 'apply' | 'rollback'): boolean {
  return applyPending.value && operationKind.value?.kind === kind
}

function showError(error: unknown): void {
  if (error instanceof HttpError && error.kind === 'cancelled') return
  const message = error instanceof Error ? error.message : t('shell.http.requestFailed')
  ElMessage.error(message)
}

async function refreshPackages(): Promise<void> {
  try {
    await fetchPackages()
  } catch (error) {
    showError(error)
  }
}

async function refreshTransfers(): Promise<void> {
  try {
    await fetchData()
  } catch (error) {
    showError(error)
  }
}

async function handleGeneratePackage(): Promise<void> {
  try {
    const bundle = await createPackage()
    await selectPackage(bundle)
    ElMessage.success(t('tenantConfigTransfer.createPackageSuccess'))
  } catch (error) {
    showError(error)
  }
}

function handleSelectPackage(bundle: TenantConfigBundle): void {
  void selectPackage(bundle).catch(showError)
}

async function handleCreateFromPackage(bundle: TenantConfigBundle): Promise<void> {
  try {
    await selectPackage(bundle)
    await createFromPackage(bundle)
    ElMessage.success(t('tenantConfigTransfer.createTransferSuccess'))
  } catch (error) {
    showError(error)
  }
}

async function handleUploadPackage(file: File): Promise<void> {
  try {
    await uploadPackage(file)
    uploadVisible.value = false
    ElMessage.success(t('tenantConfigTransfer.uploadSuccess'))
  } catch (error) {
    showError(error)
  }
}

async function handleDownloadPackage(bundle: TenantConfigBundle): Promise<void> {
  try {
    await downloadPackage(bundle)
    ElMessage.success(t('tenantConfigTransfer.downloadSuccess'))
  } catch (error) {
    showError(error)
  }
}

async function handlePreview(transfer: TenantConfigTransfer): Promise<void> {
  try {
    await previewTransfer(transfer)
    ElMessage.success(t('tenantConfigTransfer.previewSubmitted'))
  } catch (error) {
    showError(error)
  }
}

async function handleApply(transfer: TenantConfigTransfer): Promise<void> {
  try {
    await ElMessageBox.confirm(
      t('tenantConfigTransfer.applyConfirm'),
      t('tenantConfigTransfer.applyConfirmTitle'),
      {
        type: 'warning',
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
      },
    )
    await applyTransfer(transfer)
    ElMessage.success(t('tenantConfigTransfer.applySubmitted'))
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    showError(error)
  }
}

async function handleRollback(transfer: TenantConfigTransfer): Promise<void> {
  try {
    await ElMessageBox.confirm(
      t('tenantConfigTransfer.rollbackConfirm'),
      t('tenantConfigTransfer.rollbackConfirmTitle'),
      {
        type: 'warning',
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
      },
    )
    await rollbackTransfer(transfer)
    ElMessage.success(t('tenantConfigTransfer.rollbackSubmitted'))
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    showError(error)
  }
}

function handleItemsPageChange(page: number, pageSize: number): void {
  itemQueryParams.value.page = page
  itemQueryParams.value.page_size = pageSize
  void fetchItems().catch(showError)
}

function handleHistoryPageChange(page: number, pageSize: number): void {
  queryParams.value.page = page
  queryParams.value.page_size = pageSize
  void fetchData().catch(showError)
}

async function handleSelectTransfer(transfer: TenantConfigTransfer): Promise<void> {
  try {
    await selectTransfer(transfer)
    historyVisible.value = false
  } catch (error) {
    showError(error)
  }
}

function handleHistoryClosed(): void {
  return
}

function resourceCounts(bundle: TenantConfigBundle): [string, number][] {
  return Object.entries(bundle.resource_counts).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  )
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
    role_departments: 'resourceRoleDepartments',
    role_dept: 'resourceRoleDepartments',
    role_depts: 'resourceRoleDepartments',
  }[resource]
  return suffix ? t(`tenantConfigTransfer.${suffix}`) : resource
}

function canUseSelectedPackage(): boolean {
  return (
    selectedPackage.value !== undefined && canDownloadTenantConfigPackage(selectedPackage.value)
  )
}
</script>

<style scoped lang="scss">
.config-transfer-page {
  min-width: 0;
  max-width: 100%;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h1 {
    margin: 0 0 6px;
    color: var(--color-text-primary);
    font-size: 22px;
  }

  p {
    margin: 0;
    color: var(--color-text-secondary);
    line-height: 1.6;
  }
}

.transfer-steps {
  margin-bottom: 16px;
}

.page-alert {
  margin: 12px 0;
}

.selected-package-card {
  margin-top: 12px;
}

.package-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.package-summary > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;

  > span {
    color: var(--color-text-secondary);
  }

  > strong,
  > code {
    overflow-wrap: anywhere;
  }
}

.package-summary__wide {
  grid-column: span 2;
}

.resource-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.summary-alert {
  margin-top: 16px;
}

.selected-package-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (width <= 767px) {
  .page-heading {
    flex-direction: column;

    :deep(.el-button) {
      width: 100%;
      min-height: 40px;
    }
  }

  .transfer-steps {
    overflow-x: auto;

    :deep(.el-steps) {
      min-width: 620px;
    }
  }

  .package-summary {
    grid-template-columns: 1fr;
  }

  .package-summary__wide {
    grid-column: auto;
  }

  .selected-package-actions :deep(.el-button) {
    width: 100%;
    min-height: 40px;
  }
}
</style>
