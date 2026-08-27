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
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  type CreateScheduleBody,
  type JobScheduleRecord,
  type ScheduleTargetRecord,
  type UpdateScheduleBody,
} from '@/api/modules/monitor'
import { formatLocalizedDate, getApplicationLocale } from '@/i18n'
import CronScheduleBuilder from './CronScheduleBuilder.vue'
import type { BuilderState } from './cron/model'
import {
  browserTimeZone,
  buildSchedulePayload,
  buildTimezoneOptions,
  createScheduleForm,
  createDefaultScheduleForm,
  isScheduleFormComplete,
  isValidScheduleName,
  type ScheduleFormModel,
} from './schedule-form/model'
import { useSchedulePreview } from './schedule-form/useSchedulePreview'

type BuilderInstance = {
  loadExpression: (expression: string) => BuilderState
}

const props = defineProps<{
  targets: readonly ScheduleTargetRecord[]
  targetName: (handlerKey: string) => string
  schedule?: JobScheduleRecord
  saving: boolean
}>()

const emit = defineEmits<{
  save: [payload: CreateScheduleBody | UpdateScheduleBody]
}>()

const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()
const formRef = ref<FormInstance>()
const builderRef = ref<BuilderInstance>()
const browserTimezone = browserTimeZone()
const timezoneOptions = buildTimezoneOptions(browserTimezone)
const form = reactive<ScheduleFormModel>(createDefaultScheduleForm(browserTimezone))
const builderComplete = ref(true)
const scheduleSummary = ref('')
const {
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
  runPreview,
  runPreviewNow,
  schedulePreview,
} = useSchedulePreview({
  cronExpression: () => form.cron_expression,
  timezone: () => form.timezone,
  builderComplete: () => builderComplete.value,
  locale: getApplicationLocale,
  translate: t,
})

const rules: FormRules<ScheduleFormModel> = {
  name: [
    { required: true, message: t('monitor.schedules.nameRequired'), trigger: 'blur' },
    { validator: validateName, trigger: 'blur' },
  ],
  handler_key: [
    { required: true, message: t('monitor.schedules.targetRequired'), trigger: 'change' },
  ],
  cron_expression: [
    { required: true, message: t('monitor.schedules.cronRequired'), trigger: 'blur' },
  ],
  timezone: [
    { required: true, message: t('monitor.schedules.timezoneRequired'), trigger: 'change' },
  ],
  max_runtime_seconds: [
    { required: true, message: t('monitor.schedules.runtimeRequired'), trigger: 'change' },
  ],
}

function resetForm(schedule: JobScheduleRecord | undefined): void {
  Object.assign(form, createScheduleForm(schedule, browserTimezone))
  void nextTick(() => formRef.value?.clearValidate())
}

async function handleOpen(): Promise<void> {
  cancelPreview()
  resetForm(props.schedule)
  await nextTick()
  const state = builderRef.value?.loadExpression(form.cron_expression)
  builderComplete.value = state?.complete ?? Boolean(form.cron_expression.trim())
  scheduleSummary.value = state?.summary ?? ''
  schedulePreview()
}

function handleClosed(): void {
  cancelPreview()
  preview.value = undefined
  previewError.value = ''
}

function handleBuilderChange(state: BuilderState): void {
  builderComplete.value = state.complete
  scheduleSummary.value = state.summary
  schedulePreview()
}

function updateTimezone(value: string): void {
  form.timezone = value
  schedulePreview()
}

function validateName(_rule: unknown, value: unknown, callback: (error?: Error) => void): void {
  if (typeof value === 'string' && isValidScheduleName(value)) {
    callback()
    return
  }
  callback(new Error(t('monitor.schedules.nameTooLong')))
}

function selectedTarget(): ScheduleTargetRecord | undefined {
  return props.targets.find((target) => target.handler_key === form.handler_key)
}

function isFormComplete(): boolean {
  return isScheduleFormComplete(form, Boolean(selectedTarget()?.available), canPreview())
}

function canSubmit(): boolean {
  return isFormComplete() && hasValidPreview() && !props.saving
}

async function validateForm(): Promise<boolean> {
  try {
    return (await formRef.value?.validate()) ?? false
  } catch {
    return false
  }
}

async function submit(): Promise<void> {
  if (props.saving || previewLoading.value) return
  if (!(await validateForm()) || !isFormComplete()) return
  if (!hasValidPreview()) {
    const succeeded = await runPreview(
      JSON.stringify({
        cron_expression: form.cron_expression.trim(),
        timezone: form.timezone.trim(),
      }),
    )
    if (succeeded) ElMessage.info(t('monitor.schedules.previewReviewBeforeSave'))
    return
  }
  emit('save', buildSchedulePayload(form, props.schedule?.version))
}

function targetLabel(target: ScheduleTargetRecord): string {
  const targetName = props.targetName(target.handler_key)
  return target.available ? targetName : `${targetName} (${t('monitor.schedules.unavailable')})`
}
</script>

<style scoped lang="scss" src="./ScheduleFormDialog.scss"></style>
