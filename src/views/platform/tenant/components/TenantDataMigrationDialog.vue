<template>
  <el-dialog
    v-model="visible"
    :title="t('tenantData.migrationWizardTitle')"
    width="min(720px, calc(100vw - 24px))"
    destroy-on-close
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    @open="reset"
  >
    <el-steps :active="preview ? 2 : selectedTargetKey ? 1 : 0" simple class="migration-steps">
      <el-step :title="t('tenantData.selectTarget')" />
      <el-step :title="t('tenantData.previewTitle')" />
      <el-step :title="t('tenantData.confirmTenantId')" />
    </el-steps>

    <el-form
      label-position="top"
      @submit.prevent="previewAllowed ? handleCreate() : handlePreview()"
    >
      <el-form-item :label="t('tenantData.selectTarget')" :error="targetError">
        <el-select
          v-model="selectedTargetKey"
          filterable
          class="full-width"
          :loading="targetsQuery.isFetching.value"
          :disabled="submitting"
          :placeholder="t('tenantData.targetRequired')"
          @change="clearPreview"
        >
          <el-option
            v-for="target in eligibleTargets"
            :key="target.key"
            :value="target.key"
            :label="targetLabel(target)"
          />
        </el-select>
      </el-form-item>

      <el-alert
        v-if="targetsQuery.error.value"
        :title="t('tenantData.eligibleTargetsUnavailable')"
        type="warning"
        show-icon
        :closable="false"
      />
      <el-empty
        v-else-if="!targetsQuery.isFetching.value && eligibleTargets.length === 0"
        :description="t('tenantData.noEligibleTargets')"
        :image-size="64"
      />

      <section v-if="preview" class="preview-panel" aria-live="polite">
        <h3>{{ t('tenantData.previewTitle') }}</h3>
        <el-alert
          :title="
            previewAllowed ? t('tenantData.previewEligible') : t('tenantData.previewIneligible')
          "
          :type="previewAllowed ? 'success' : 'error'"
          show-icon
          :closable="false"
        />
        <el-descriptions :column="2" border>
          <el-descriptions-item :label="t('tenantData.sourceTarget')">{{
            preview.source_target_key
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.targetTarget')">{{
            preview.target_target_key
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.sourceGeneration')">{{
            preview.expected_placement_generation
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.targetGeneration')">{{
            preview.target_generation
          }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.writeMaintenanceRequired')">
            {{ preview.impact.stop_write ? t('tenantData.yes') : t('tenantData.no') }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.catalogTables')">
            {{ preview.impact.catalog_table_count }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.retentionHours')">
            {{ preview.impact.retention_hours }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.rollbackBoundary')">
            {{ preview.impact.rollback_boundary }}
          </el-descriptions-item>
        </el-descriptions>
        <el-alert
          v-if="preview.blockers.length"
          :title="t('tenantData.blockers')"
          type="error"
          :closable="false"
        >
          <ul>
            <li v-for="blocker in preview.blockers" :key="blocker">{{ blocker }}</li>
          </ul>
        </el-alert>
        <el-alert
          v-if="preview.warnings.length"
          :title="t('tenantData.warnings')"
          type="warning"
          :closable="false"
        >
          <ul>
            <li v-for="warning in preview.warnings" :key="warning">{{ warning }}</li>
          </ul>
        </el-alert>
        <el-form-item
          v-if="previewAllowed"
          :label="t('tenantData.confirmTenantId')"
          :error="confirmationError"
          class="confirmation-field"
        >
          <el-input
            v-model="confirmation"
            autocomplete="off"
            spellcheck="false"
            maxlength="64"
            :placeholder="t('tenantData.confirmTenantIdHint', { tenantId })"
            @input="confirmationError = ''"
          />
        </el-form-item>
      </section>

      <el-alert
        v-if="operationError"
        :title="t('tenantData.migrationOperationFailed')"
        type="error"
        show-icon
        :closable="false"
        class="operation-error"
      />

      <button type="submit" class="visually-hidden" tabindex="-1" aria-hidden="true" />
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">{{
        t('tenantCapacity.cancel')
      }}</el-button>
      <el-button
        :loading="previewMutation.pending.value"
        :disabled="!selectedTargetKey || submitting || eligibleTargets.length === 0"
        @click="handlePreview"
      >
        {{ t('tenantData.generatePreview') }}
      </el-button>
      <el-button
        type="primary"
        :loading="createMutation.pending.value"
        :disabled="!previewAllowed || submitting"
        @click="handleCreate"
      >
        {{ t('tenantData.submitMigration') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { listAllDataTargetOptions, type DataTargetSummary } from '@/api/modules/dataTarget'
import {
  type TenantDataMigration,
  type TenantDataMigrationPreview,
  type TenantDataPlacement,
} from '@/api/modules/tenantData'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { isServerStateScopeCurrent, useServerStateScope } from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import {
  invalidateTenantMigrationResources,
  tenantMigrationRetryOwner,
  useTenantDataMigrationCommands,
} from './tenantDataMigrationCommand'

const props = defineProps<{
  active: boolean
  tenantId: string
  placement: TenantDataPlacement
}>()
const emit = defineEmits<{
  created: [migration: TenantDataMigration, scope: ServerStateScope]
}>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const userStore = useUserStore()
const selectedTargetKey = ref('')
const preview = ref<TenantDataMigrationPreview>()
const confirmation = ref('')
const targetError = ref('')
const confirmationError = ref('')
const pageGeneration = ref(0)
const pendingIdempotencyKeys = new Map<string, string>()

const targetsQuery = useServerStateQuery<DataTargetSummary[]>(
  () => props.active && visible.value && userStore.tenantId === 'system',
  'platform-tenant-migration-targets',
  () => ({ tenant_id: props.tenantId }),
  async (signal) =>
    listAllDataTargetOptions(
      {
        eligible_for: 'migration',
        tenant_id: props.tenantId,
      },
      signal,
    ),
  { staleTime: 0, refetchInterval: false, meta: { errorMode: 'silent' } },
)
const eligibleTargets = computed(() =>
  (targetsQuery.data.value ?? []).filter(
    (target) => target.eligible && target.key !== props.placement.current_target_key,
  ),
)
const previewAllowed = computed(() => preview.value?.eligible && !preview.value.blockers.length)
const { createMutation, previewMutation } = useTenantDataMigrationCommands()
const submitting = computed(() => previewMutation.pending.value || createMutation.pending.value)
const operationError = computed(() => previewMutation.error.value ?? createMutation.error.value)

function reset(): void {
  pageGeneration.value += 1
  selectedTargetKey.value = ''
  resetPreviewProjection()
  void targetsQuery.refetch()
}

function clearPreview(): void {
  pageGeneration.value += 1
  resetPreviewProjection()
}

function resetPreviewProjection(): void {
  preview.value = undefined
  confirmation.value = ''
  targetError.value = ''
  confirmationError.value = ''
  previewMutation.reset()
  createMutation.reset()
}

function invalidatePage(clearRetry: boolean): void {
  pageGeneration.value += 1
  selectedTargetKey.value = ''
  resetPreviewProjection()
  if (clearRetry) pendingIdempotencyKeys.clear()
  visible.value = false
}

watch(useServerStateScope(), () => invalidatePage(true), { flush: 'sync' })
watch(
  () => props.active,
  (active) => !active && invalidatePage(false),
  { flush: 'sync' },
)
watch(
  () => props.tenantId,
  () => invalidatePage(true),
  { flush: 'sync' },
)
watch(
  () => props.placement.placement_generation,
  () => invalidatePage(false),
  { flush: 'sync' },
)
watch(visible, (current, previous) => !current && previous && invalidatePage(false), {
  flush: 'sync',
})
onDeactivated(() => invalidatePage(false))
onBeforeUnmount(() => invalidatePage(true))

function targetLabel(target: DataTargetSummary): string {
  return [target.key, target.mode, target.kind, target.region].filter(Boolean).join(' · ')
}

async function handlePreview(): Promise<void> {
  const targetKey = selectedTargetKey.value
  if (!targetKey || submitting.value) {
    targetError.value = t('tenantData.targetRequired')
    return
  }
  targetError.value = ''
  confirmation.value = ''
  preview.value = undefined
  const tenantId = props.tenantId
  const expectedPlacementGeneration = props.placement.placement_generation
  const generation = ++pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () =>
    props.active &&
    visible.value &&
    pageGeneration.value === generation &&
    props.tenantId === tenantId &&
    props.placement.placement_generation === expectedPlacementGeneration &&
    selectedTargetKey.value === targetKey
  operation.assertCurrent(ownsOperation)
  try {
    const result = await previewMutation.mutateAsync({
      expectedPlacementGeneration,
      scope: operation.scope,
      targetKey,
      tenantId,
    })
    if (!operation.isCurrent(ownsOperation)) return
    preview.value = result
  } catch {
    // 错误由对话框内联状态展示；会话或页面失效时不产生额外副作用。
  }
}

async function handleCreate(): Promise<void> {
  if (!preview.value || !previewAllowed.value || submitting.value) return
  if (confirmation.value !== props.tenantId) {
    confirmationError.value = t('tenantData.confirmTenantIdMismatch')
    return
  }
  const snapshot = structuredClone(preview.value)
  const tenantId = props.tenantId
  const generation = pageGeneration.value
  const operation = beginServerStatePageOperation()
  const ownsOperation = () =>
    props.active &&
    visible.value &&
    pageGeneration.value === generation &&
    props.tenantId === tenantId &&
    preview.value?.plan_hash === snapshot.plan_hash
  const owner = tenantMigrationRetryOwner(operation.scope, tenantId, snapshot)
  const key = pendingIdempotencyKeys.get(owner) ?? createIdempotencyKey('tenant-data-migration')
  let migration: TenantDataMigration
  try {
    operation.assertCurrent(ownsOperation)
    migration = await createMutation.mutateAsync({
      idempotencyKey: key,
      preview: snapshot,
      scope: operation.scope,
      tenantId,
    })
    pendingIdempotencyKeys.delete(owner)
  } catch (error) {
    if (isServerStateScopeCurrent(operation.scope)) {
      if (shouldReuseIdempotencyKey(error)) pendingIdempotencyKeys.set(owner, key)
      else pendingIdempotencyKeys.delete(owner)
    }
    return
  }
  operation.assertCurrent(ownsOperation)
  await invalidateTenantMigrationResources(operation.scope)
  operation.apply(() => {
    emit('created', migration, operation.scope)
    visible.value = false
  }, ownsOperation)
}
</script>

<style scoped src="./TenantDataMigrationDialog.scss"></style>
