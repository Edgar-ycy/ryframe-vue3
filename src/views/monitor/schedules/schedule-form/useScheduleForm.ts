import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  nextTick,
  onBeforeUnmount,
  onDeactivated,
  reactive,
  ref,
  watch,
  useTemplateRef,
  type Ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import {
  type CreateScheduleBody,
  type JobScheduleRecord,
  type ScheduleTargetRecord,
  type UpdateScheduleBody,
} from '@/api/modules/monitor'
import { getApplicationLocale } from '@/i18n'
import { useServerStateScope } from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'
import type { BuilderState } from '../cron/model'
import {
  browserTimeZone,
  buildSchedulePayload,
  buildTimezoneOptions,
  createScheduleForm,
  createDefaultScheduleForm,
  isScheduleFormComplete,
  isValidScheduleName,
  type ScheduleFormModel,
} from './model'
import { useSchedulePreview } from './useSchedulePreview'

type BuilderInstance = {
  loadExpression: (expression: string) => BuilderState
}

export interface ScheduleFormProps {
  targets: readonly ScheduleTargetRecord[]
  targetName: (handlerKey: string) => string
  schedule?: JobScheduleRecord
  saving: boolean
}

export function useScheduleForm(
  props: Readonly<ScheduleFormProps>,
  visible: Ref<boolean>,
  save: (payload: CreateScheduleBody | UpdateScheduleBody, scope: ServerStateScope) => void,
) {
  const { t } = useI18n()
  const formRef = useTemplateRef<FormInstance>('formRef')
  const builderRef = useTemplateRef<BuilderInstance>('builderRef')
  const browserTimezone = browserTimeZone()
  const timezoneOptions = buildTimezoneOptions(browserTimezone)
  const form = reactive<ScheduleFormModel>(createDefaultScheduleForm(browserTimezone))
  const builderComplete = ref(true)
  const scheduleSummary = ref('')
  const pageGeneration = ref(0)
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
  }

  async function handleOpen(): Promise<void> {
    const generation = pageGeneration.value
    const operation = beginServerStatePageOperation()
    const ownsOperation = () => visible.value && pageGeneration.value === generation
    cancelPreview()
    resetForm(props.schedule)
    await nextTick()
    if (!operation.isCurrent(ownsOperation)) return
    formRef.value?.clearValidate()
    const state = builderRef.value?.loadExpression(form.cron_expression)
    builderComplete.value = state?.complete ?? Boolean(form.cron_expression.trim())
    scheduleSummary.value = state?.summary ?? ''
    schedulePreview()
  }

  function handleClosed(): void {
    pageGeneration.value += 1
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

  async function submit(): Promise<void> {
    if (props.saving || previewLoading.value) return
    const generation = pageGeneration.value
    const operation = beginServerStatePageOperation()
    const ownsOperation = () => visible.value && pageGeneration.value === generation
    const valid = (await formRef.value?.validate().catch(() => false)) ?? false
    if (!operation.isCurrent(ownsOperation) || !valid || !isFormComplete()) return
    if (!hasValidPreview()) {
      const succeeded = await runPreview(
        JSON.stringify({
          cron_expression: form.cron_expression.trim(),
          timezone: form.timezone.trim(),
        }),
      )
      if (!operation.isCurrent(ownsOperation)) return
      if (succeeded) {
        operation.apply(
          () => ElMessage.info(t('monitor.schedules.previewReviewBeforeSave')),
          ownsOperation,
        )
      }
      return
    }
    operation.assertCurrent(ownsOperation)
    save(buildSchedulePayload(form, props.schedule?.version), operation.scope)
  }

  function invalidateForm(): void {
    pageGeneration.value += 1
    visible.value = false
    cancelPreview()
  }

  watch(useServerStateScope(), invalidateForm, { flush: 'sync' })
  onDeactivated(invalidateForm)
  onBeforeUnmount(invalidateForm)

  function targetLabel(target: ScheduleTargetRecord): string {
    const targetName = props.targetName(target.handler_key)
    return target.available ? targetName : `${targetName} (${t('monitor.schedules.unavailable')})`
  }

  return {
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
  }
}
