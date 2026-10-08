<template>
  <el-dialog
    v-model="visible"
    :title="schedule ? t('monitor.schedules.editTitle') : t('monitor.schedules.addTitle')"
    width="min(960px, calc(100vw - 24px))"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    destroy-on-close
    @open="handleOpen"
    @close="cancelPreview"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="132px" class="schedule-form">
      <el-form-item :label="t('monitor.schedules.name')" prop="name">
        <el-input
          v-model="form.name"
          :placeholder="t('monitor.schedules.namePlaceholder')"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item :label="t('monitor.schedules.target')" prop="handler_key">
        <el-select
          v-model="form.handler_key"
          :placeholder="t('monitor.schedules.targetPlaceholder')"
          filterable
          class="form-control-wide"
        >
          <el-option
            v-for="target in targets"
            :key="target.handler_key"
            :label="targetLabel(target)"
            :value="target.handler_key"
            :disabled="!target.available"
          />
        </el-select>
        <p
          v-if="selectedTarget() && !selectedTarget()?.available"
          class="form-hint form-hint--warning"
        >
          {{ t('monitor.schedules.unavailableTargetHint') }}
        </p>
      </el-form-item>

      <el-form-item prop="cron_expression" class="schedule-rule-item">
        <CronScheduleBuilder
          ref="builderRef"
          v-model="form.cron_expression"
          :disabled="saving"
          @change="handleBuilderChange"
        />
      </el-form-item>

      <el-form-item :label="t('monitor.schedules.timezone')" prop="timezone">
        <el-select
          :model-value="form.timezone"
          :placeholder="t('monitor.schedules.timezonePlaceholder')"
          filterable
          allow-create
          default-first-option
          class="form-control-wide"
          @update:model-value="updateTimezone"
        >
          <el-option
            v-for="timezone in timezoneOptions"
            :key="timezone"
            :label="timezone"
            :value="timezone"
          />
        </el-select>
        <p class="form-hint">{{ t('monitor.schedules.timezoneHint') }}</p>
      </el-form-item>

      <el-form-item :label="t('monitor.schedules.misfirePolicy')">
        <el-radio-group v-model="form.misfire_policy">
          <el-radio value="fire_once">{{ t('monitor.schedules.misfireFireOnce') }}</el-radio>
          <el-radio value="skip">{{ t('monitor.schedules.misfireSkip') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item :label="t('monitor.schedules.concurrencyPolicy')">
        <el-radio-group v-model="form.concurrency_policy">
          <el-radio value="forbid">{{ t('monitor.schedules.concurrencyForbid') }}</el-radio>
          <el-radio value="allow">{{ t('monitor.schedules.concurrencyAllow') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item :label="t('monitor.schedules.maxRuntime')" prop="max_runtime_seconds">
        <el-input-number v-model="form.max_runtime_seconds" :min="1" :max="86400" :precision="0" />
        <span class="runtime-unit">{{ t('monitor.schedules.maxRuntimeUnit') }}</span>
        <p class="form-hint">{{ t('monitor.schedules.maxRuntimeHint') }}</p>
      </el-form-item>

      <el-form-item :label="t('monitor.schedules.status')">
        <el-switch
          v-model="form.enabled"
          :active-text="t('monitor.schedules.enabled')"
          :inactive-text="t('monitor.schedules.disabled')"
        />
      </el-form-item>
    </el-form>

    <section class="schedule-preview" :aria-label="t('monitor.schedules.previewTitle')">
      <div class="schedule-preview__header">
        <div>
          <h3>{{ t('monitor.schedules.previewTitle') }}</h3>
          <p>{{ t('monitor.schedules.previewServerHint') }}</p>
        </div>
        <el-tag :type="previewStatusType()" effect="plain">{{ previewStatusText() }}</el-tag>
      </div>

      <dl class="schedule-preview__metadata">
        <div>
          <dt>{{ t('monitor.schedules.summary') }}</dt>
          <dd>{{ scheduleSummary || t('monitor.schedules.summaryIncomplete') }}</dd>
        </div>
        <div>
          <dt>{{ t('monitor.schedules.timezone') }}</dt>
          <dd>{{ form.timezone || '—' }}</dd>
        </div>
        <div>
          <dt>{{ t('monitor.schedules.browserTimezoneLabel') }}</dt>
          <dd>{{ browserTimezone }}</dd>
        </div>
        <div>
          <dt>{{ t('monitor.schedules.calculatedAt') }}</dt>
          <dd>{{ preview ? formatUtcTime(preview.calculated_at) : '—' }}</dd>
        </div>
      </dl>

      <div v-if="previewLoading" class="schedule-preview__state" v-loading="true">
        <span>{{ t('monitor.schedules.previewLoading') }}</span>
      </div>

      <el-alert
        v-else-if="previewError"
        :title="previewError"
        type="error"
        show-icon
        :closable="false"
      />

      <el-empty
        v-else-if="!canPreview()"
        :description="t('monitor.schedules.previewIncomplete')"
        :image-size="72"
      />

      <div v-else-if="preview" class="table-scroll">
        <el-table :data="preview.occurrences" border size="small" class="preview-table">
          <el-table-column type="index" :label="t('monitor.schedules.sequence')" width="72" />
          <el-table-column :label="t('monitor.schedules.scheduleTime')" min-width="190">
            <template #default="{ row }">{{
              formatScheduleTime(row.utc, preview.timezone)
            }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.schedules.browserTime')" min-width="190">
            <template #default="{ row }">{{ formatLocalizedDate(row.utc) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.schedules.utcTime')" min-width="190">
            <template #default="{ row }">{{ formatUtcTime(row.utc) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div v-else class="schedule-preview__state">
        <span>{{ t('monitor.schedules.previewWaiting') }}</span>
      </div>

      <div class="schedule-preview__actions">
        <el-button
          :loading="previewLoading"
          :disabled="saving || !canPreview()"
          @click="runPreviewNow"
        >
          {{ t('monitor.schedules.recalculatePreview') }}
        </el-button>
      </div>
    </section>

    <template #footer>
      <el-button :disabled="saving" @click="visible = false">{{
        t('monitor.schedules.cancel')
      }}</el-button>
      <el-button
        v-if="!hasValidPreview()"
        type="primary"
        :loading="previewLoading"
        :disabled="saving || !canPreview()"
        @click="submit"
      >
        {{ t('monitor.schedules.previewAndContinue') }}
      </el-button>
      <el-button v-else type="primary" :loading="saving" :disabled="!canSubmit()" @click="submit">
        {{ t('monitor.schedules.confirmSave') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { formatLocalizedDate } from '@/i18n'
import type { CreateScheduleBody, UpdateScheduleBody } from '@/api/modules/monitor'
import type { ServerStateScope } from '@/shared/query/scope'
import CronScheduleBuilder from './CronScheduleBuilder.vue'
import { useScheduleForm, type ScheduleFormProps } from './schedule-form/useScheduleForm'

const props = defineProps<ScheduleFormProps>()
const emit = defineEmits<{
  save: [payload: CreateScheduleBody | UpdateScheduleBody, scope: ServerStateScope]
}>()
const visible = defineModel<boolean>({ required: true })
const {
  t,
  browserTimezone,
  timezoneOptions,
  form,
  scheduleSummary,
  rules,
  cancelPreview,
  canPreview,
  formatScheduleTime,
  formatUtcTime,
  hasValidPreview,
  preview,
  previewError,
  previewLoading,
  previewStatusText,
  previewStatusType,
  runPreviewNow,
  handleOpen,
  handleClosed,
  handleBuilderChange,
  updateTimezone,
  selectedTarget,
  canSubmit,
  submit,
  targetLabel,
} = useScheduleForm(props, visible, (payload, scope) => emit('save', payload, scope))
</script>

<style scoped lang="scss">
.schedule-form {
  max-width: 100%;
}

.form-control-wide {
  width: 100%;
}

.form-hint {
  width: 100%;
  margin: 6px 0 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.form-hint--warning {
  color: var(--el-color-warning);
}

.schedule-rule-item :deep(.el-form-item__content) {
  display: block;
  margin-left: 0 !important;
}

.runtime-unit {
  margin-left: 8px;
  color: var(--color-text-secondary);
}

.schedule-preview {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  background: var(--color-bg-container);
}

.schedule-preview__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: var(--color-text-primary);
    font-size: 15px;
  }

  p {
    margin-top: 4px;
    color: var(--color-text-secondary);
    font-size: 12px;
  }
}

.schedule-preview__metadata {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  margin: 0;

  div {
    min-width: 0;
  }

  dt {
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  dd {
    margin: 3px 0 0;
    overflow-wrap: anywhere;
    color: var(--color-text-primary);
    font-size: 13px;
  }
}

.schedule-preview__state {
  display: grid;
  min-height: 96px;
  place-items: center;
  color: var(--color-text-secondary);
}

.schedule-preview__actions {
  display: flex;
  justify-content: flex-end;
}

.table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.preview-table {
  min-width: 650px;
}

@media (width <= 640px) {
  .schedule-form :deep(.el-form-item) {
    align-items: stretch;
    flex-direction: column;
  }

  .schedule-form :deep(.el-form-item__label) {
    width: 100% !important;
    justify-content: flex-start;
  }

  .schedule-form :deep(.el-form-item__content) {
    width: 100%;
    margin-left: 0 !important;
  }

  .schedule-preview__header {
    flex-direction: column;
  }

  .schedule-preview__metadata {
    grid-template-columns: 1fr;
  }
}
</style>
