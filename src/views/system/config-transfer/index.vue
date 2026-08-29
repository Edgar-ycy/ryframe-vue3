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
      @change="refreshPackages"
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
      ref="uploadDialogRef"
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
import type { TenantConfigBundle } from '@/api/modules/tenantConfigTransfer'
import { formatOptionalLocalizedDate } from '@/i18n'
import ConfigPackagePanel from './components/ConfigPackagePanel.vue'
import ConfigPackageUploadDialog from './components/ConfigPackageUploadDialog.vue'
import ConfigTransferHistoryDrawer from './components/ConfigTransferHistoryDrawer.vue'
import ConfigTransferPlan from './components/ConfigTransferPlan.vue'
import { useTenantConfigTransferManagement } from './composables/useTenantConfigTransferManagement'
import { createConfigTransferPageActions } from './configTransferPageActions'
import {
  resetConfigTransferOverlays,
  type ConfigPackageUploadDialogController,
} from './configTransferOverlayState'
import {
  canDownloadTenantConfigPackage,
  tenantConfigResourceCounts,
  tenantConfigResourceLabel,
} from './presentation'
import { useServerStateScope } from '@/shared/query/client'

const { t } = useI18n()
const historyVisible = ref(false)
const uploadVisible = ref(false)
const uploadDialogRef = ref<ConfigPackageUploadDialogController>()

function resetOverlays(): void {
  resetConfigTransferOverlays({ historyVisible, uploadDialog: uploadDialogRef, uploadVisible })
}

const stopScopeWatch = watch(useServerStateScope(), resetOverlays, { flush: 'sync' })
onDeactivated(resetOverlays)
onBeforeUnmount(() => {
  resetOverlays()
  stopScopeWatch()
})

const configTransferManagement = useTenantConfigTransferManagement()
const {
  applyPending,
  canListPackages,
  createPackagePending,
  createTransferPending,
  downloadingPackageId,
  itemQueryParams,
  items,
  itemsError,
  itemsLoading,
  operationKind,
  packageQueryParams,
  packages,
  packagesError,
  packagesLoading,
  queryParams,
  selectedPackage,
  selectedTransfer,
  transfers,
  transfersError,
  transfersLoading,
} = configTransferManagement

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

const {
  handleApply,
  handleCreateFromPackage,
  handleDownloadPackage,
  handleGeneratePackage,
  handleHistoryPageChange,
  handleItemsPageChange,
  handlePreview,
  handleRollback,
  handleSelectPackage,
  handleSelectTransfer,
  handleUploadPackage,
  refreshPackages,
  refreshTransfers,
} = createConfigTransferPageActions({
  historyVisible,
  management: configTransferManagement,
  t,
  uploadVisible,
})

function handleHistoryClosed(): void {
  return
}

function resourceCounts(bundle: TenantConfigBundle): [string, number][] {
  return tenantConfigResourceCounts(bundle)
}

function resourceLabel(resource: string): string {
  return tenantConfigResourceLabel(resource, t)
}

function canUseSelectedPackage(): boolean {
  return (
    selectedPackage.value !== undefined && canDownloadTenantConfigPackage(selectedPackage.value)
  )
}
</script>

<style scoped lang="scss" src="./configTransferPage.scss"></style>
