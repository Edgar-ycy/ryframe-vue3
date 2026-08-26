<template>
  <el-dialog
    v-model="visible"
    :title="t('productPlans.assignPlan')"
    width="min(860px, calc(100vw - 24px))"
    destroy-on-close
    :close-on-click-modal="!submitting"
    @open="reset"
  >
    <el-form label-width="138px">
      <el-form-item :label="t('productPlans.plans')">
        <el-select v-model="selectedPlanId" filterable @change="handlePlanChange">
          <el-option
            v-for="plan in plans?.items ?? []"
            :key="plan.id"
            :label="`${plan.name} (${plan.key})`"
            :value="plan.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('productPlans.targetPlanVersion')">
        <el-select
          v-model="planVersionId"
          :placeholder="t('productPlans.selectTargetVersion')"
          :loading="versionsLoading"
          @change="clearPreview"
        >
          <el-option
            v-for="version in publishedVersions"
            :key="version.id"
            :label="`${t('productPlans.version')} ${version.version}`"
            :value="version.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="canOverride" :label="t('productPlans.overrides')" :error="overrideError">
        <TenantCapabilityOverrideEditor
          ref="overrideEditorRef"
          v-model="overrides"
          :effective-capabilities="context.capabilities"
          @update:model-value="clearPreview"
        />
      </el-form-item>
    </el-form>

    <section v-if="preview" class="preview-panel">
      <h3>{{ t('productPlans.previewTitle') }}</h3>
      <div class="diff-grid">
        <DiffSummary :title="t('productPlans.capabilityDiff')" :diff="capabilityDiff" />
        <DiffSummary :title="t('productPlans.menuDiff')" :diff="menuDiff" />
        <DiffSummary :title="t('productPlans.permissionDiff')" :diff="permissionDiff" />
      </div>
      <el-alert
        v-if="preview.warnings.length"
        :title="t('productPlans.warnings')"
        type="warning"
        show-icon
        :closable="false"
      >
        <ul>
          <li v-for="warning in preview.warnings" :key="warning">{{ warning }}</li>
        </ul>
      </el-alert>
    </section>

    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">{{
        t('productPlans.cancel')
      }}</el-button>
      <el-button
        :loading="previewPending"
        :disabled="!planVersionId || submitting"
        @click="handlePreview"
      >
        {{ t('productPlans.preview') }}
      </el-button>
      <el-button
        type="primary"
        :loading="applyPending"
        :disabled="!preview || submitting"
        @click="handleApply"
      >
        {{ t('productPlans.apply') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  applyTenantProductChange,
  getProductPlan,
  listProductPlans,
  previewTenantProductChange,
  type ProductChangePreview,
  type CapabilityOverrideInput,
  type TenantCapabilityOverride,
  type TenantProductContext,
} from '@/api/modules/productPlan'
import { requireOperationData } from '@/shared/http/client'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import DiffSummary from './TenantProductDiffSummary.vue'
import TenantCapabilityOverrideEditor from './TenantCapabilityOverrideEditor.vue'

const props = defineProps<{
  canOverride: boolean
  context: TenantProductContext
  tenantId: string
}>()
const emit = defineEmits<{ applied: [context: TenantProductContext] }>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const userStore = useUserStore()
const selectedPlanId = ref('')
const planVersionId = ref('')
const overrides = ref<CapabilityOverrideInput[]>([])
const overrideEditorRef = ref<{ validate: () => boolean }>()
const overrideError = ref('')
const preview = ref<ProductChangePreview>()
const enabled = computed(() => visible.value && userStore.tenantId === 'system')

const plansQuery = useTenantQuery(
  () => userStore.tenantId,
  enabled,
  'platform-product-plan-options',
  () => ({ page: 1, page_size: 100 }),
  async (signal) =>
    requireOperationData(await listProductPlans({ page: 1, page_size: 100 }, signal)),
)
const versionsQuery = useTenantQuery(
  () => userStore.tenantId,
  () => enabled.value && Boolean(selectedPlanId.value),
  'platform-product-plan-version-options',
  () => ({ plan_id: selectedPlanId.value }),
  async (signal) =>
    requireOperationData(await getProductPlan(selectedPlanId.value, signal)).versions,
)

const previewMutation = useTenantMutation(
  () => userStore.tenantId,
  'platform-tenant-product-change-preview',
  {
    mutationFn: async (input: { planVersionId: string; overrides: CapabilityOverrideInput[] }) =>
      requireOperationData(
        await previewTenantProductChange(props.tenantId, {
          plan_version_id: input.planVersionId,
          overrides: input.overrides,
        }),
      ),
  },
)
const applyMutation = useTenantMutation(
  () => userStore.tenantId,
  'platform-tenant-product-context',
  {
    mutationFn: async (input: {
      preview: ProductChangePreview
      overrides: CapabilityOverrideInput[]
    }) =>
      requireOperationData(
        await applyTenantProductChange(props.tenantId, {
          plan_version_id: planVersionId.value,
          overrides: input.overrides,
          plan_hash: input.preview.plan_hash,
          preview_runtime_epoch: input.preview.runtime_epoch,
        }),
      ),
  },
)

const plans = plansQuery.data
const versionsLoading = versionsQuery.isFetching
const publishedVersions = computed(() =>
  (versionsQuery.data.value ?? []).filter((version) => version.status === 'published'),
)
const previewPending = previewMutation.pending
const applyPending = applyMutation.pending
const submitting = computed(() => previewPending.value || applyPending.value)
const capabilityDiff = computed(() => ({
  added: preview.value?.capability_additions ?? [],
  removed: preview.value?.capability_removals ?? [],
  changed: preview.value?.capability_changes.map((change) => change.capability_code) ?? [],
}))
const menuDiff = computed(() => ({
  added: preview.value?.menu_additions ?? [],
  removed: preview.value?.menu_removals ?? [],
  changed: [],
}))
const permissionDiff = computed(() => ({
  added: preview.value?.permission_additions ?? [],
  removed: preview.value?.permission_removals ?? [],
  changed: [],
}))

function reset(): void {
  selectedPlanId.value = ''
  planVersionId.value = ''
  overrides.value = props.context.overrides.map(toOverrideInput)
  overrideError.value = ''
  preview.value = undefined
}

function handlePlanChange(): void {
  planVersionId.value = ''
  clearPreview()
}

function clearPreview(): void {
  preview.value = undefined
  overrideError.value = ''
}

function parseOverrides(): CapabilityOverrideInput[] | undefined {
  if (!props.canOverride) return props.context.overrides.map(toOverrideInput)
  if (!overrideEditorRef.value?.validate()) return undefined
  return overrides.value.map((item) => ({ ...item, config: { ...item.config } }))
}

watch(
  () => props.canOverride,
  () => {
    overrides.value = props.context.overrides.map(toOverrideInput)
    clearPreview()
  },
)

function toOverrideInput(value: TenantCapabilityOverride): CapabilityOverrideInput {
  return {
    capability_code: value.capability_code,
    enabled: value.enabled,
    variant_code: value.variant_code,
    schema_version: value.schema_version,
    config: value.config,
  }
}

async function handlePreview(): Promise<void> {
  if (!planVersionId.value || submitting.value) return
  const overrides = parseOverrides()
  if (!overrides) {
    overrideError.value = t('productPlans.overrideInvalid')
    return
  }
  preview.value = await previewMutation.mutateAsync({
    planVersionId: planVersionId.value,
    overrides,
  })
}

async function handleApply(): Promise<void> {
  if (!preview.value || submitting.value) return
  const overrides = parseOverrides()
  if (!overrides) {
    overrideError.value = t('productPlans.overrideInvalid')
    return
  }
  const context = await applyMutation.mutateAsync({ preview: preview.value, overrides })
  emit('applied', context)
  visible.value = false
}
</script>

<style scoped>
.preview-panel {
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.preview-panel h3 {
  margin: 0 0 12px;
}

.diff-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

@media (width <= 700px) {
  .diff-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
