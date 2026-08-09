<template>
  <el-dialog
    v-model="visible"
    :title="schedule ? t('monitor.schedules.editTitle') : t('monitor.schedules.addTitle')"
    width="min(680px, calc(100vw - 32px))"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    @closed="resetPreview"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="116px" class="schedule-form">
      <el-form-item :label="t('monitor.schedules.name')" prop="name">
        <el-input v-model="form.name" :placeholder="t('monitor.schedules.namePlaceholder')" maxlength="100" show-word-limit />
      </el-form-item>
      <el-form-item :label="t('monitor.schedules.target')" prop="handler_key">
        <el-select v-model="form.handler_key" :placeholder="t('monitor.schedules.targetPlaceholder')" filterable class="form-control-wide">
          <el-option
            v-for="target in targets"
            :key="target.handler_key"
            :label="targetLabel(target)"
            :value="target.handler_key"
            :disabled="!target.available"
          />
        </el-select>
        <p v-if="selectedTarget && !selectedTarget.available" class="form-hint form-hint--warning">{{ t('monitor.schedules.unavailableTargetHint') }}</p>
      </el-form-item>
      <el-form-item :label="t('monitor.schedules.presets')">
        <div class="cron-presets">
          <el-button v-for="preset in cronPresets" :key="preset.value" size="small" @click="applyPreset(preset.value)">{{ preset.label }}</el-button>
        </div>
      </el-form-item>
      <el-form-item :label="t('monitor.schedules.cron')" prop="cron_expression">
        <el-input v-model="form.cron_expression" :placeholder="t('monitor.schedules.cronPlaceholder')" class="form-control-wide" />
        <p class="form-hint">{{ t('monitor.schedules.advancedCronHint') }}</p>
      </el-form-item>
      <el-form-item :label="t('monitor.schedules.timezone')" prop="timezone">
        <el-input v-model="form.timezone" :placeholder="t('monitor.schedules.timezonePlaceholder')" class="form-control-wide" />
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
        <el-switch v-model="form.enabled" :active-text="t('monitor.schedules.enabled')" :inactive-text="t('monitor.schedules.disabled')" />
      </el-form-item>
    </el-form>

    <section v-if="preview" class="schedule-preview" :aria-label="t('monitor.schedules.previewTitle')">
      <h3>{{ t('monitor.schedules.previewTitle') }}</h3>
      <p>{{ t('monitor.schedules.previewHint') }}</p>
      <p>{{ t('monitor.schedules.browserTimezone', { timezone: browserTimezone }) }}</p>
      <div class="table-scroll">
        <el-table :data="preview.occurrences" border size="small" class="preview-table">
          <el-table-column :label="t('monitor.schedules.scheduleTime')" min-width="180">
            <template #default="{ row }">{{ formatScheduleTime(row.utc, preview.timezone) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.schedules.utcTime')" min-width="180">
            <template #default="{ row }">{{ formatUtcTime(row.utc) }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.schedules.browserTime')" min-width="180">
            <template #default="{ row }">{{ formatLocalizedDate(row.utc) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <template #footer>
      <el-button :disabled="saving || previewPending" @click="visible = false">{{ t('monitor.schedules.cancel') }}</el-button>
      <el-button :loading="previewPending" :disabled="saving" @click="handlePreview">{{ t('monitor.schedules.preview') }}</el-button>
      <el-button type="primary" :loading="saving" :disabled="previewPending" @click="submit">
        {{ preview ? t('monitor.schedules.confirmSave') : t('monitor.schedules.previewAndContinue') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { useMutation } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import {
  previewSchedule,
  type CreateScheduleBody,
  type JobSchedulePreview,
  type JobScheduleRecord,
  type ScheduleTargetRecord,
  type UpdateScheduleBody,
} from '@/api/modules/monitor'
import { formatLocalizedDate, getApplicationLocale } from '@/i18n'
import { requireOperationData } from '@/shared/http/client'

type ScheduleFormModel = {
  name: string
  handler_key: string
  cron_expression: string
  timezone: string
  enabled: boolean
  misfire_policy: NonNullable<CreateScheduleBody['misfire_policy']>
  concurrency_policy: NonNullable<CreateScheduleBody['concurrency_policy']>
  max_runtime_seconds: number
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
const preview = ref<JobSchedulePreview>()
const previewSignature = ref('')
const browserTimezone = browserTimeZone()
const form = reactive<ScheduleFormModel>(createDefaultForm())

const rules: FormRules<ScheduleFormModel> = {
  name: [
    { required: true, message: t('monitor.schedules.nameRequired'), trigger: 'blur' },
    { validator: validateName, trigger: 'blur' },
  ],
  handler_key: [{ required: true, message: t('monitor.schedules.targetRequired'), trigger: 'change' }],
  cron_expression: [{ required: true, message: t('monitor.schedules.cronRequired'), trigger: 'blur' }],
  timezone: [{ required: true, message: t('monitor.schedules.timezoneRequired'), trigger: 'blur' }],
  max_runtime_seconds: [{ required: true, message: t('monitor.schedules.runtimeRequired'), trigger: 'change' }],
}

const selectedTarget = computed(() => (
  props.targets.find(target => target.handler_key === form.handler_key)
))
const cronPresets = computed(() => [
  { label: t('monitor.schedules.presetHourly'), value: '0 0 * * * * *' },
  { label: t('monitor.schedules.presetDaily'), value: '0 0 0 * * * *' },
  { label: t('monitor.schedules.presetWeekly'), value: '0 0 0 * * MON *' },
  { label: t('monitor.schedules.presetMonthly'), value: '0 0 0 1 * * *' },
])
const previewMutation = useMutation({
  mutationFn: async () => {
    const response = await previewSchedule({
      cron_expression: form.cron_expression.trim(),
      timezone: form.timezone.trim(),
    })
    return requireOperationData(response)
  },
})
const previewPending = computed(() => previewMutation.isPending.value)

watch(() => props.schedule, schedule => {
  if (visible.value) resetForm(schedule)
})
watch(visible, isVisible => {
  if (isVisible) resetForm(props.schedule)
})
watch(
  () => [form.cron_expression, form.timezone],
  () => resetPreview(),
)

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  }
  catch {
    return 'UTC'
  }
}

function createDefaultForm(): ScheduleFormModel {
  return {
    name: '',
    handler_key: '',
    cron_expression: '0 0 0 * * * *',
    timezone: browserTimezone,
    enabled: true,
    misfire_policy: 'fire_once',
    concurrency_policy: 'forbid',
    max_runtime_seconds: 900,
  }
}

function resetForm(schedule: JobScheduleRecord | undefined): void {
  const next = schedule
    ? {
      name: schedule.name,
      handler_key: schedule.handler_key,
      cron_expression: schedule.cron_expression,
      timezone: schedule.timezone,
      enabled: schedule.enabled,
      misfire_policy: schedule.misfire_policy as ScheduleFormModel['misfire_policy'],
      concurrency_policy: schedule.concurrency_policy as ScheduleFormModel['concurrency_policy'],
      max_runtime_seconds: schedule.max_runtime_seconds,
    }
    : createDefaultForm()
  Object.assign(form, next)
  resetPreview()
  void nextTick(() => formRef.value?.clearValidate())
}

function resetPreview(): void {
  preview.value = undefined
  previewSignature.value = ''
}

function currentPreviewSignature(): string {
  return JSON.stringify({
    cron_expression: form.cron_expression.trim(),
    timezone: form.timezone.trim(),
  })
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

function validateName(_rule: unknown, value: unknown, callback: (error?: Error) => void): void {
  if (typeof value === 'string' && value.trim() && byteLength(value.trim()) <= 100) {
    callback()
    return
  }
  callback(new Error(t('monitor.schedules.nameTooLong')))
}

function applyPreset(value: string): void {
  form.cron_expression = value
}

async function validateForm(): Promise<boolean> {
  try {
    return await formRef.value?.validate() ?? false
  }
  catch {
    return false
  }
}

async function handlePreview(): Promise<boolean> {
  if (!await validateForm()) return false
  const result = await previewMutation.mutateAsync()
  preview.value = result
  previewSignature.value = currentPreviewSignature()
  return true
}

async function submit(): Promise<void> {
  if (!await validateForm()) return
  if (previewSignature.value !== currentPreviewSignature()) {
    await handlePreview()
    return
  }
  const payload: CreateScheduleBody = {
    name: form.name.trim(),
    handler_key: form.handler_key,
    cron_expression: form.cron_expression.trim(),
    timezone: form.timezone.trim(),
    enabled: form.enabled,
    misfire_policy: form.misfire_policy,
    concurrency_policy: form.concurrency_policy,
    max_runtime_seconds: form.max_runtime_seconds,
  }
  if (props.schedule) {
    emit('save', { ...payload, version: props.schedule.version })
    return
  }
  emit('save', payload)
}

function formatScheduleTime(value: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(getApplicationLocale(), {
      timeZone: timezone,
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(value))
  }
  catch {
    return value
  }
}

function formatUtcTime(value: string): string {
  return new Intl.DateTimeFormat(getApplicationLocale(), {
    timeZone: 'UTC',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function targetLabel(target: ScheduleTargetRecord): string {
  const targetName = props.targetName(target.handler_key)
  return target.available
    ? targetName
    : `${targetName} (${t('monitor.schedules.unavailable')})`
}
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

.cron-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.runtime-unit {
  margin-left: 8px;
  color: var(--color-text-secondary);
}

.schedule-preview {
  padding: 16px;
  border: 1px solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  background: var(--border-color-light);

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: var(--color-text-primary);
    font-size: 15px;
  }

  p {
    margin-top: 6px;
    color: var(--color-text-secondary);
    font-size: 13px;
    line-height: 1.5;
  }
}

.table-scroll {
  max-width: 100%;
  margin-top: 12px;
  overflow-x: auto;
}

.preview-table {
  min-width: 560px;
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
}
</style>
