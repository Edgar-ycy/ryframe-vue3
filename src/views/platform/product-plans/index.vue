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
          @current-change="selectPlanById"
        >
          <el-table-column prop="key" :label="t('productPlans.code')" min-width="130" />
          <el-table-column
            prop="name"
            :label="t('productPlans.name')"
            min-width="150"
            show-overflow-tooltip
          />
          <el-table-column :label="t('productPlans.planStatus')" min-width="110">
            <template #default="{ row }">{{
              row.status === '1' ? t('productPlans.planEnabled') : t('productPlans.planDisabled')
            }}</template>
          </el-table-column>
          <el-table-column v-if="canEdit" width="88" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openPlanDialogById(row.id)">
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
          <el-table-column
            v-if="canEdit || canPublish"
            :label="t('productPlans.actions')"
            width="190"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                v-if="canEdit && row.status === 'draft'"
                link
                type="primary"
                @click="openVersionDialogById(row.id)"
              >
                {{ t('productPlans.editVersion') }}
              </el-button>
              <el-button
                v-if="canPublish && row.status === 'draft'"
                link
                type="primary"
                :loading="publishPending"
                @click="publishVersionById(row.id)"
              >
                {{ t('productPlans.publish') }}
              </el-button>
              <el-button
                v-if="canPublish && row.status === 'published'"
                link
                type="danger"
                :loading="retirePending"
                @click="retireVersionById(row.id)"
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
import { ElMessage } from 'element-plus'
import type { TagProps } from 'element-plus'
import { onActivated, onBeforeUnmount, onDeactivated, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  ProductPlan,
  ProductPlanFormInput,
  ProductPlanVersion,
  ProductPlanVersionInput,
  ProductPlanVersionStatus,
} from '@/api/modules/productPlan'
import { formatOptionalLocalizedDate } from '@/i18n'
import { useServerStateScope } from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import type { ServerStateScope } from '@/shared/query/scope'
import { confirmAction } from '@/utils/confirmAction'
import ProductPlanFormDialog from './components/ProductPlanFormDialog.vue'
import ProductPlanVersionDialog from './components/ProductPlanVersionDialog.vue'
import { useProductPlanManagement } from './useProductPlanManagement'

const { t } = useI18n()
const planDialogVisible = ref(false)
const versionDialogVisible = ref(false)
const editingPlan = ref<ProductPlan>()
const editingVersion = ref<ProductPlanVersion>()
const pageActive = ref(true)
const pageGeneration = ref(0)
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
watch(
  planDialogVisible,
  (visible, previous) => !visible && previous && (pageGeneration.value += 1),
  {
    flush: 'sync',
  },
)
watch(
  versionDialogVisible,
  (visible, previous) => !visible && previous && (pageGeneration.value += 1),
  { flush: 'sync' },
)

function invalidatePageProjection(): void {
  pageGeneration.value += 1
  planDialogVisible.value = false
  versionDialogVisible.value = false
  editingPlan.value = undefined
  editingVersion.value = undefined
  selectedPlan.value = undefined
}

watch(useServerStateScope(), invalidatePageProjection, { flush: 'sync' })
onActivated(() => (pageActive.value = true))
onDeactivated(() => {
  pageActive.value = false
  invalidatePageProjection()
})
onBeforeUnmount(invalidatePageProjection)

function findPlan(id: string): ProductPlan | undefined {
  return plans.value?.items.find((plan) => plan.id === id)
}

function findVersion(id: string): ProductPlanVersion | undefined {
  return versions.value?.find((version) => version.id === id)
}

function selectPlanById(row: { id?: unknown } | null): void {
  selectedPlan.value = typeof row?.id === 'string' ? findPlan(row.id) : undefined
}

function openPlanDialogById(id: string): void {
  const plan = findPlan(id)
  if (plan) openPlanDialog(plan)
}

function openPlanDialog(plan?: ProductPlan): void {
  pageGeneration.value += 1
  editingPlan.value = plan
  planDialogVisible.value = true
}

async function handleSavePlan(data: ProductPlanFormInput, scope: ServerStateScope): Promise<void> {
  const generation = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () =>
    pageActive.value && planDialogVisible.value && pageGeneration.value === generation
  operation.assertCurrent(ownsOperation)
  await savePlan(data, scope, editingPlan.value, () => operation.assertCurrent(ownsOperation))
  operation.apply(() => {
    planDialogVisible.value = false
    ElMessage.success(t('productPlans.saved'))
  }, ownsOperation)
}

function openVersionDialog(version?: ProductPlanVersion): void {
  pageGeneration.value += 1
  editingVersion.value = version
  versionDialogVisible.value = true
}

function openVersionDialogById(id: string): void {
  const version = findVersion(id)
  if (version) openVersionDialog(version)
}

async function handleSaveVersion(
  data: ProductPlanVersionInput,
  scope: ServerStateScope,
): Promise<void> {
  const planId = selectedPlan.value?.id
  if (!planId) return
  const generation = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () =>
    pageActive.value &&
    versionDialogVisible.value &&
    pageGeneration.value === generation &&
    selectedPlan.value?.id === planId
  operation.assertCurrent(ownsOperation)
  const editing = editingVersion.value
  await saveVersion(data, scope, editing, () => operation.assertCurrent(ownsOperation))
  operation.apply(() => {
    versionDialogVisible.value = false
    ElMessage.success(t(editing ? 'productPlans.versionUpdated' : 'productPlans.versionCreated'))
  }, ownsOperation)
}

async function handlePublish(version: ProductPlanVersion): Promise<void> {
  if (!selectedPlan.value || publishPending.value) return
  const plan = selectedPlan.value
  const generation = pageGeneration.value
  const ownsOperation = () =>
    pageActive.value && pageGeneration.value === generation && selectedPlan.value?.id === plan.id
  const operation = await confirmServerStatePageOperation(
    () =>
      confirmAction(
        t('productPlans.publishConfirm', { name: plan.name, version: version.version }),
        t('productPlans.publishTitle'),
        { type: 'warning' },
      ),
    ownsOperation,
  )
  if (!operation || publishPending.value) return
  operation.assertCurrent(ownsOperation)
  await publishVersion(plan.id, version, operation.scope, () =>
    operation.assertCurrent(ownsOperation),
  )
  operation.apply(() => ElMessage.success(t('productPlans.publishedSuccess')), ownsOperation)
}

async function publishVersionById(id: string): Promise<void> {
  const version = findVersion(id)
  if (version) await handlePublish(version)
}

async function handleRetire(version: ProductPlanVersion): Promise<void> {
  if (!selectedPlan.value || retirePending.value) return
  const plan = selectedPlan.value
  const generation = pageGeneration.value
  const ownsOperation = () =>
    pageActive.value && pageGeneration.value === generation && selectedPlan.value?.id === plan.id
  const operation = await confirmServerStatePageOperation(
    () =>
      confirmAction(
        t('productPlans.retireConfirm', { name: plan.name, version: version.version }),
        t('productPlans.retireTitle'),
        { type: 'warning' },
      ),
    ownsOperation,
  )
  if (!operation || retirePending.value) return
  operation.assertCurrent(ownsOperation)
  await retireVersion(plan.id, version, operation.scope, () =>
    operation.assertCurrent(ownsOperation),
  )
  operation.apply(() => ElMessage.success(t('productPlans.retiredSuccess')), ownsOperation)
}

async function retireVersionById(id: string): Promise<void> {
  const version = findVersion(id)
  if (version) await handleRetire(version)
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

<style scoped src="./productPlansPage.scss"></style>
