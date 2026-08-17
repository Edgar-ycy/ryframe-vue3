<template>
  <div class="page-container product-plans-page">
    <header class="page-heading">
      <div>
        <h1>{{ t('productPlans.title') }}</h1>
        <p>{{ t('productPlans.subtitle') }}</p>
      </div>
      <div class="heading-actions">
        <el-button icon="Refresh" :loading="refreshing" @click="handleRefresh">
          {{ t('productPlans.refresh') }}
        </el-button>
        <el-button v-if="canAdd" type="primary" icon="Plus" @click="openPlanDialog()">
          {{ t('productPlans.createPlan') }}
        </el-button>
      </div>
    </header>

    <el-alert
      v-if="!canList"
      :title="t('productPlans.permissionDenied')"
      type="warning"
      show-icon
      :closable="false"
    />

    <div v-else class="management-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-heading">
            <strong>{{ t('productPlans.plans') }}</strong>
            <span>{{ plans?.total ?? 0 }}</span>
          </div>
        </template>
        <el-table
          v-loading="loading"
          :data="plans?.items ?? []"
          row-key="id"
          highlight-current-row
          @current-change="selectPlan"
        >
          <el-table-column prop="key" :label="t('productPlans.code')" min-width="130" />
          <el-table-column prop="name" :label="t('productPlans.name')" min-width="150" show-overflow-tooltip />
          <el-table-column :label="t('productPlans.planStatus')" min-width="110">
            <template #default="{ row }">{{ row.status === '1' ? t('productPlans.planEnabled') : t('productPlans.planDisabled') }}</template>
          </el-table-column>
          <el-table-column v-if="canEdit" width="88" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openPlanDialog(row)">
                {{ t('productPlans.editPlan') }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty><el-empty :description="t('productPlans.emptyPlans')" /></template>
        </el-table>
        <el-pagination
          v-if="(plans?.total ?? 0) > 0"
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="plans?.total ?? 0"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          class="pagination"
        />
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-heading">
            <div>
              <strong>{{ t('productPlans.versions') }}</strong>
              <span v-if="selectedPlan">{{ selectedPlan.name }}</span>
            </div>
            <el-button
              v-if="selectedPlan && canEdit"
              type="primary"
              plain
              icon="Plus"
              @click="openVersionDialog()"
            >
              {{ t('productPlans.createVersion') }}
            </el-button>
          </div>
        </template>

        <el-empty v-if="!selectedPlan" :description="t('productPlans.selectPlan')" />
        <el-table v-else v-loading="versionsLoading" :data="versions ?? []" row-key="id">
          <el-table-column prop="version" :label="t('productPlans.version')" width="92" />
          <el-table-column :label="t('productPlans.versionStatus')" width="120">
            <template #default="{ row }">
              <el-tag :type="versionTag(row.status)">{{ t(`productPlans.${row.status}`) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('productPlans.capabilityCount')" width="110">
            <template #default="{ row }">{{ row.capabilities.length }}</template>
          </el-table-column>
          <el-table-column prop="created_by" :label="t('productPlans.createdBy')" min-width="130" />
          <el-table-column :label="t('productPlans.publishedAt')" min-width="160">
            <template #default="{ row }">{{ formatDate(row.published_at) }}</template>
          </el-table-column>
          <el-table-column v-if="canEdit || canPublish" :label="t('productPlans.actions')" width="190" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="canEdit && row.status === 'draft'"
                link
                type="primary"
                @click="openVersionDialog(row)"
              >
                {{ t('productPlans.editVersion') }}
              </el-button>
              <el-button
                v-if="canPublish && row.status === 'draft'"
                link
                type="primary"
                :loading="publishPending"
                @click="handlePublish(row)"
              >
                {{ t('productPlans.publish') }}
              </el-button>
              <el-button
                v-if="canPublish && row.status === 'published'"
                link
                type="danger"
                :loading="retirePending"
                @click="handleRetire(row)"
              >
                {{ t('productPlans.retire') }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty><el-empty :description="t('productPlans.emptyVersions')" /></template>
        </el-table>
      </el-card>
    </div>

    <ProductPlanFormDialog
      v-model="planDialogVisible"
      :plan="editingPlan"
      :submitting="savePending"
      @save="handleSavePlan"
    />
    <ProductPlanVersionDialog
      v-model="versionDialogVisible"
      :version="editingVersion"
      :submitting="savePending"
      @save="handleSaveVersion"
    />
  </div>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type {
  ProductPlan,
  ProductPlanFormInput,
  ProductPlanVersion,
  ProductPlanVersionInput,
  ProductPlanVersionStatus,
} from '@/api/modules/productPlan'
import { formatOptionalLocalizedDate } from '@/i18n'
import { installProductPlanMessages } from '@/i18n/catalog/product-plans'
import { confirmAction } from '@/utils/confirmAction'
import ProductPlanFormDialog from './components/ProductPlanFormDialog.vue'
import ProductPlanVersionDialog from './components/ProductPlanVersionDialog.vue'
import { useProductPlanManagement } from './useProductPlanManagement'

installProductPlanMessages()
const { t } = useI18n()
const planDialogVisible = ref(false)
const versionDialogVisible = ref(false)
const editingPlan = ref<ProductPlan>()
const editingVersion = ref<ProductPlanVersion>()
const {
  canAdd,
  canEdit,
  canList,
  canPublish,
  loading,
  page,
  pageSize,
  plans,
  publishPending,
  publishVersion,
  retirePending,
  retireVersion,
  refresh,
  refreshing,
  savePending,
  savePlan,
  saveVersion,
  selectedPlan,
  versions,
  versionsLoading,
} = useProductPlanManagement()

watch([canAdd, canEdit], () => {
  if (planDialogVisible.value) {
    const stillAllowed = editingPlan.value ? canEdit.value : canAdd.value
    if (!stillAllowed) planDialogVisible.value = false
  }
  if (versionDialogVisible.value && !canEdit.value) versionDialogVisible.value = false
})

function selectPlan(plan?: ProductPlan): void {
  selectedPlan.value = plan
}

function openPlanDialog(plan?: ProductPlan): void {
  editingPlan.value = plan
  planDialogVisible.value = true
}

async function handleSavePlan(data: ProductPlanFormInput): Promise<void> {
  await savePlan(data, editingPlan.value)
  planDialogVisible.value = false
  ElMessage.success(t('productPlans.saved'))
}

function openVersionDialog(version?: ProductPlanVersion): void {
  editingVersion.value = version
  versionDialogVisible.value = true
}

async function handleSaveVersion(data: ProductPlanVersionInput): Promise<void> {
  const editing = editingVersion.value
  await saveVersion(data, editing)
  versionDialogVisible.value = false
  ElMessage.success(t(editing ? 'productPlans.versionUpdated' : 'productPlans.versionCreated'))
}

async function handlePublish(version: ProductPlanVersion): Promise<void> {
  if (!selectedPlan.value || publishPending.value) return
  const confirmed = await confirmAction(
    t('productPlans.publishConfirm', {
      name: selectedPlan.value.name,
      version: version.version,
    }),
    t('productPlans.publishTitle'),
    { type: 'warning' },
  )
  if (!confirmed) return
  await publishVersion(version)
  ElMessage.success(t('productPlans.publishedSuccess'))
}

async function handleRetire(version: ProductPlanVersion): Promise<void> {
  if (!selectedPlan.value || retirePending.value) return
  const confirmed = await confirmAction(
    t('productPlans.retireConfirm', {
      name: selectedPlan.value.name,
      version: version.version,
    }),
    t('productPlans.retireTitle'),
    { type: 'warning' },
  )
  if (!confirmed || retirePending.value) return
  await retireVersion(version)
  ElMessage.success(t('productPlans.retiredSuccess'))
}

async function handleRefresh(): Promise<void> {
  await refresh()
}

function versionTag(status: ProductPlanVersionStatus): TagProps['type'] {
  if (status === 'published') return 'success'
  if (status === 'retired') return 'info'
  return 'warning'
}

function formatDate(value: string | null | undefined): string {
  return formatOptionalLocalizedDate(value)
}
</script>

<style scoped>
.product-plans-page,
.panel-card {
  min-width: 0;
}

.page-heading,
.heading-actions,
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-heading {
  align-items: flex-start;
  margin-bottom: 16px;
}

.page-heading h1,
.page-heading p {
  margin: 0;
}

.page-heading p {
  margin-top: 7px;
  color: var(--el-text-color-secondary);
}

.management-grid {
  display: grid;
  grid-template-columns: minmax(420px, 0.9fr) minmax(520px, 1.1fr);
  gap: 16px;
}

.panel-heading > div {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.panel-heading span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.pagination {
  justify-content: flex-end;
  margin-top: 16px;
}

@media (width <= 1100px) {
  .management-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 640px) {
  .page-heading,
  .heading-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .heading-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>
