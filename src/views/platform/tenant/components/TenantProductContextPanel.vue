<template>
  <div v-loading="loading" class="product-context-panel">
    <el-alert
      v-if="!canView"
      :title="t('productPlans.permissionDenied')"
      type="info"
      show-icon
      :closable="false"
    />
    <el-alert
      v-else-if="error"
      :title="t('productPlans.contextUnavailable')"
      type="warning"
      show-icon
      :closable="false"
    />
    <template v-else-if="context">
      <div class="panel-heading">
        <p>{{ t('productPlans.tenantContextHint') }}</p>
        <el-button v-if="canAssign" type="primary" @click="changeVisible = true">
          {{ t('productPlans.assignPlan') }}
        </el-button>
      </div>
      <el-descriptions :column="2" border>
        <el-descriptions-item :label="t('productPlans.currentPlanVersion')">
          {{ context.plan_name }} · v{{ context.plan_version }} ({{ context.plan_version_id }})
        </el-descriptions-item>
        <el-descriptions-item :label="t('productPlans.runtimeEpoch')">
          {{ context.runtime_epoch }}
        </el-descriptions-item>
      </el-descriptions>

      <section>
        <h3>{{ t('productPlans.effectiveCapabilities') }}</h3>
        <el-table :data="context.capabilities" row-key="capability_code">
          <el-table-column prop="capability_code" :label="t('productPlans.code')" min-width="180" />
          <el-table-column :label="t('productPlans.enabled')" width="90">
            <template #default="{ row }">{{
              row.enabled ? t('productPlans.yes') : t('productPlans.no')
            }}</template>
          </el-table-column>
          <el-table-column prop="variant_code" label="Variant" min-width="130" />
          <el-table-column prop="schema_version" label="Schema" width="100" />
          <el-table-column label="Config" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ JSON.stringify(row.config) }}</template>
          </el-table-column>
          <template #empty><el-empty :description="t('productPlans.noCapabilities')" /></template>
        </el-table>
      </section>

      <section>
        <h3>{{ t('productPlans.overrides') }}</h3>
        <el-table :data="context.overrides" row-key="capability_code">
          <el-table-column prop="capability_code" :label="t('productPlans.code')" min-width="180" />
          <el-table-column :label="t('productPlans.enabled')" width="90">
            <template #default="{ row }">{{
              row.enabled ? t('productPlans.yes') : t('productPlans.no')
            }}</template>
          </el-table-column>
          <el-table-column prop="variant_code" label="Variant" min-width="130" />
          <el-table-column prop="schema_version" label="Schema" width="100" />
          <el-table-column label="Config" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ JSON.stringify(row.config) }}</template>
          </el-table-column>
          <template #empty><el-empty :description="t('productPlans.noOverrides')" /></template>
        </el-table>
      </section>
    </template>

    <TenantProductChangeDialog
      v-if="context"
      v-model="changeVisible"
      :active="active"
      :can-override="canOverride"
      :context="context"
      :tenant-id="tenantId"
      @applied="handleApplied"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { PermissionCode } from '@/api/generated/permissions'
import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getTenantProductContext, type TenantProductContext } from '@/api/modules/productPlan'
import { TENANT_PRODUCT_PERMISSIONS } from '@/features/product-plans/permissions'
import { requireOperationData } from '@/shared/http/client'
import { isServerStateScopeCurrent, useServerStateScope } from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/permission'
import TenantProductChangeDialog from './TenantProductChangeDialog.vue'
import { invalidateTenantProductContext } from './tenantProductChangeCommands'

const props = defineProps<{ active: boolean; tenantId: string }>()
const { t } = useI18n()
const userStore = useUserStore()
const changeVisible = ref(false)
const pageGeneration = ref(0)
const can = (permission: PermissionCode) => hasPermission(userStore.permissions, permission)
const canView = computed(() => can(TENANT_PRODUCT_PERMISSIONS.view))
const canAssign = computed(() => can(TENANT_PRODUCT_PERMISSIONS.assign))
const canOverride = computed(() => can(TENANT_PRODUCT_PERMISSIONS.override))
const contextQuery = useServerStateQuery<TenantProductContext>(
  () => props.active && userStore.tenantId === 'system' && canView.value && Boolean(props.tenantId),
  'platform-tenant-product-context',
  () => ({ tenant_id: props.tenantId }),
  async (signal) => requireOperationData(await getTenantProductContext(props.tenantId, signal)),
  { staleTime: 0, meta: { errorMode: 'silent' } },
)
const context = contextQuery.data
const loading = contextQuery.isFetching
const error = contextQuery.error

watch(canAssign, (allowed) => {
  if (!allowed) changeVisible.value = false
})

function invalidatePage(): void {
  pageGeneration.value += 1
  changeVisible.value = false
}

watch(useServerStateScope(), invalidatePage, { flush: 'sync' })
watch(
  () => props.active,
  (active) => !active && invalidatePage(),
  { flush: 'sync' },
)
watch(() => props.tenantId, invalidatePage, { flush: 'sync' })
onDeactivated(invalidatePage)
onBeforeUnmount(invalidatePage)

async function handleApplied(
  updated: TenantProductContext,
  expectedScope: ServerStateScope,
): Promise<void> {
  if (updated.tenant_id !== props.tenantId) return
  if (!isServerStateScopeCurrent(expectedScope)) return
  const tenantId = props.tenantId
  const generation = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () =>
    props.active && pageGeneration.value === generation && props.tenantId === tenantId
  operation.assertCurrent(ownsOperation)
  await invalidateTenantProductContext(operation.scope)
  operation.assertCurrent(ownsOperation)
  await contextQuery.refetch({ throwOnError: true })
  if (!operation.isCurrent(ownsOperation)) return
  ElMessage.success(t('productPlans.changeApplied'))
}
</script>

<style scoped>
.product-context-panel,
section {
  display: grid;
  gap: 14px;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-heading p,
h3 {
  margin: 0;
}

.panel-heading p {
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

section {
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

@media (width <= 640px) {
  .panel-heading {
    flex-direction: column;
  }
}
</style>
