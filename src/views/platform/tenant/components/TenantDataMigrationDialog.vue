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

    <el-form label-position="top" @submit.prevent="handlePrimaryAction">
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
          :title="previewAllowed ? t('tenantData.previewEligible') : t('tenantData.previewIneligible')"
          :type="previewAllowed ? 'success' : 'error'"
          show-icon
          :closable="false"
        />
        <el-descriptions :column="2" border>
          <el-descriptions-item :label="t('tenantData.sourceTarget')">{{ preview.source_target_key }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.targetTarget')">{{ preview.target_target_key }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.sourceGeneration')">{{ preview.expected_placement_generation }}</el-descriptions-item>
          <el-descriptions-item :label="t('tenantData.targetGeneration')">{{ preview.target_generation }}</el-descriptions-item>
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
        <el-alert v-if="preview.blockers.length" :title="t('tenantData.blockers')" type="error" :closable="false">
          <ul><li v-for="blocker in preview.blockers" :key="blocker">{{ blocker }}</li></ul>
        </el-alert>
        <el-alert v-if="preview.warnings.length" :title="t('tenantData.warnings')" type="warning" :closable="false">
          <ul><li v-for="warning in preview.warnings" :key="warning">{{ warning }}</li></ul>
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
      <el-button :disabled="submitting" @click="visible = false">{{ t('tenantCapacity.cancel') }}</el-button>
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
import { useI18n } from 'vue-i18n'
import { listAllDataTargetOptions, type DataTargetSummary } from '@/api/modules/dataTarget'
import {
  createTenantDataMigration,
  previewTenantDataMigration,
  type TenantDataMigration,
  type TenantDataMigrationPreview,
  type TenantDataPlacement,
} from '@/api/modules/tenantData'
import { requireOperationData } from '@/shared/http/client'
import { createIdempotencyKey, shouldReuseIdempotencyKey } from '@/shared/http/idempotency'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  active: boolean
  tenantId: string
  placement: TenantDataPlacement
}>()
const emit = defineEmits<{ created: [migration: TenantDataMigration] }>()
const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const userStore = useUserStore()
const selectedTargetKey = ref('')
const preview = ref<TenantDataMigrationPreview>()
const confirmation = ref('')
const targetError = ref('')
const confirmationError = ref('')
let pendingIdempotencyKey: string | undefined

const targetsQuery = useTenantQuery<DataTargetSummary[]>(
  () => userStore.tenantId,
  () => props.active && visible.value && userStore.tenantId === 'system',
  'platform-tenant-migration-targets',
  () => ({ tenant_id: props.tenantId }),
  async signal => listAllDataTargetOptions({
    eligible_for: 'migration',
    tenant_id: props.tenantId,
  }, signal),
  { staleTime: 0, refetchInterval: false, meta: { errorMode: 'silent' } },
)
const eligibleTargets = computed(() => (targetsQuery.data.value ?? []).filter(target => (
  target.eligible && target.key !== props.placement.current_target_key
)))
const previewAllowed = computed(() => Boolean(
  preview.value?.eligible && preview.value.blockers.length === 0,
))

const previewMutation = useTenantMutation(
  () => userStore.tenantId,
  'platform-tenant-data-migration-preview',
  {
    meta: { errorMode: 'silent' },
    mutationFn: async () => requireOperationData(await previewTenantDataMigration(
      props.tenantId,
      {
        target_key: selectedTargetKey.value,
        expected_placement_generation: props.placement.placement_generation,
      },
    )),
  },
)
const createMutation = useTenantMutation(
  () => userStore.tenantId,
  'platform-tenant-data-migrations',
  {
    meta: { errorMode: 'silent' },
    mutationFn: async (input: { preview: TenantDataMigrationPreview, idempotencyKey: string }) => (
      requireOperationData(await createTenantDataMigration(
        props.tenantId,
        {
          target_key: input.preview.target_target_key,
          plan_hash: input.preview.plan_hash,
          expected_placement_generation: input.preview.expected_placement_generation,
        },
        input.idempotencyKey,
      ))
    ),
  },
)
const submitting = computed(() => previewMutation.pending.value || createMutation.pending.value)
const operationError = computed(() => previewMutation.error.value ?? createMutation.error.value)

watch(() => props.placement.placement_generation, (generation) => {
  if (preview.value && preview.value.expected_placement_generation !== generation) clearPreview()
})

function reset(): void {
  selectedTargetKey.value = ''
  clearPreview()
  void targetsQuery.refetch()
}

function clearPreview(): void {
  preview.value = undefined
  confirmation.value = ''
  targetError.value = ''
  confirmationError.value = ''
  pendingIdempotencyKey = undefined
  previewMutation.reset()
  createMutation.reset()
}

function targetLabel(target: DataTargetSummary): string {
  return [target.key, target.mode, target.kind, target.region].filter(Boolean).join(' · ')
}

function handlePrimaryAction(): void {
  if (previewAllowed.value) void handleCreate()
  else void handlePreview()
}

async function handlePreview(): Promise<void> {
  if (!selectedTargetKey.value || submitting.value) {
    targetError.value = t('tenantData.targetRequired')
    return
  }
  targetError.value = ''
  confirmation.value = ''
  pendingIdempotencyKey = undefined
  preview.value = await previewMutation.mutateAsync(undefined)
}

async function handleCreate(): Promise<void> {
  if (!preview.value || !previewAllowed.value || submitting.value) return
  if (confirmation.value !== props.tenantId) {
    confirmationError.value = t('tenantData.confirmTenantIdMismatch')
    return
  }
  const key = pendingIdempotencyKey ?? createIdempotencyKey('tenant-data-migration')
  try {
    const migration = await createMutation.mutateAsync({
      preview: preview.value,
      idempotencyKey: key,
    })
    pendingIdempotencyKey = undefined
    emit('created', migration)
    visible.value = false
  }
  catch (error) {
    pendingIdempotencyKey = shouldReuseIdempotencyKey(error) ? key : undefined
  }
}
</script>

<style scoped>
.migration-steps {
  margin-bottom: 20px;
}

.full-width {
  width: 100%;
}

.preview-panel {
  display: grid;
  gap: 14px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.preview-panel h3 {
  margin: 0;
}

.preview-panel ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.confirmation-field {
  margin-bottom: 0;
}

.operation-error {
  margin-top: 14px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (width <= 640px) {
  .migration-steps {
    display: none;
  }

  :deep(.el-descriptions__body .el-descriptions__table) {
    table-layout: fixed;
  }
}
</style>
