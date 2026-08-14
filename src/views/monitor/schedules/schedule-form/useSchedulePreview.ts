import { onScopeDispose, ref } from 'vue'
import {
  previewSchedule,
  type JobSchedulePreview,
} from '@/api/modules/monitor'
import { HttpError, requireOperationData } from '@/shared/http/client'
import { formatScheduleTime as formatScheduleTimeValue, formatUtcTime as formatUtcTimeValue } from './model'

type Translate = (key: string, values?: Record<string, unknown>) => string

type SchedulePreviewOptions = {
  cronExpression: () => string
  timezone: () => string
  builderComplete: () => boolean
  locale: () => string
  translate: Translate
}

export function useSchedulePreview(options: SchedulePreviewOptions) {
  const { cronExpression, timezone, builderComplete, locale, translate: t } = options
  const previewTimer = ref<ReturnType<typeof setTimeout>>()
  const previewController = ref<AbortController>()
  const previewRequestSequence = ref(0)
  const previewSignature = ref('')
  const previewLoading = ref(false)
  const previewError = ref('')
  const preview = ref<JobSchedulePreview>()

  function currentPreviewSignature(): string {
    return JSON.stringify({
      cron_expression: cronExpression().trim(),
      timezone: timezone().trim(),
    })
  }

  function canPreview(): boolean {
    return builderComplete()
      && Boolean(cronExpression().trim())
      && Boolean(timezone().trim())
  }

  function hasValidPreview(): boolean {
    return Boolean(preview.value)
      && previewSignature.value === currentPreviewSignature()
      && !previewLoading.value
  }

  function schedulePreview(): void {
    clearPreviewTimer()
    previewController.value?.abort()
    previewController.value = undefined
    previewRequestSequence.value += 1
    preview.value = undefined
    previewSignature.value = ''
    previewError.value = ''
    if (!canPreview()) {
      previewLoading.value = false
      return
    }
    previewLoading.value = true
    const signature = currentPreviewSignature()
    previewTimer.value = setTimeout(() => {
      previewTimer.value = undefined
      void runPreview(signature)
    }, 500)
  }

  function runPreviewNow(): void {
    clearPreviewTimer()
    if (!canPreview()) return
    void runPreview(currentPreviewSignature())
  }

  async function runPreview(signature: string): Promise<boolean> {
    clearPreviewTimer()
    const validationError = previewInputError()
    if (validationError) {
      preview.value = undefined
      previewSignature.value = ''
      previewError.value = validationError
      previewLoading.value = false
      return false
    }
    previewController.value?.abort()
    const controller = new AbortController()
    previewController.value = controller
    const sequence = previewRequestSequence.value + 1
    previewRequestSequence.value = sequence
    preview.value = undefined
    previewSignature.value = ''
    previewError.value = ''
    previewLoading.value = true
    try {
      const result = requireOperationData(await previewSchedule({
        cron_expression: cronExpression().trim(),
        timezone: timezone().trim(),
      }, controller.signal))
      if (sequence !== previewRequestSequence.value || signature !== currentPreviewSignature()) return false
      preview.value = result
      previewSignature.value = signature
      return true
    }
    catch (error) {
      if (isCancelledRequest(error, controller.signal) || sequence !== previewRequestSequence.value) return false
      previewError.value = error instanceof HttpError && error.errorKey === 'validation'
        ? t('monitor.schedules.previewValidationFailed')
        : error instanceof Error && error.message
        ? error.message
        : t('monitor.schedules.previewRequestFailed')
      return false
    }
    finally {
      if (sequence === previewRequestSequence.value) {
        previewLoading.value = false
        previewController.value = undefined
      }
    }
  }

  function previewInputError(): string {
    const fields = cronExpression().trim().split(/\s+/)
    if (fields.length !== 7) return t('monitor.schedules.cronSevenFieldsError')
    if (fields[0] !== '0') return t('monitor.schedules.cronSecondError')
    if (fields[6] !== '*') return t('monitor.schedules.cronYearError')
    if (fields[3] !== '*' && fields[5] !== '*') return t('monitor.schedules.cronDayWeekError')
    return ''
  }

  function isCancelledRequest(error: unknown, signal: AbortSignal): boolean {
    if (signal.aborted) return true
    if (error instanceof DOMException && error.name === 'AbortError') return true
    return typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === 'ERR_CANCELED'
  }

  function clearPreviewTimer(): void {
    if (previewTimer.value === undefined) return
    clearTimeout(previewTimer.value)
    previewTimer.value = undefined
  }

  function cancelPreview(): void {
    clearPreviewTimer()
    previewController.value?.abort()
    previewController.value = undefined
    previewRequestSequence.value += 1
    previewLoading.value = false
  }

  function previewStatusType(): 'success' | 'warning' | 'info' | 'danger' {
    if (previewError.value) return 'danger'
    if (hasValidPreview()) return 'success'
    if (previewLoading.value) return 'warning'
    return 'info'
  }

  function previewStatusText(): string {
    if (previewError.value) return t('monitor.schedules.previewStatusFailed')
    if (hasValidPreview()) return t('monitor.schedules.previewStatusValid')
    if (previewLoading.value) return t('monitor.schedules.previewStatusCalculating')
    return t('monitor.schedules.previewStatusPending')
  }

  function formatScheduleTime(value: string, targetTimezone: string): string {
    return formatScheduleTimeValue(value, targetTimezone, locale())
  }

  function formatUtcTime(value: string): string {
    return formatUtcTimeValue(value, locale())
  }

  onScopeDispose(cancelPreview)

  return {
    cancelPreview,
    canPreview,
    hasValidPreview,
    formatScheduleTime,
    formatUtcTime,
    preview,
    previewError,
    previewLoading,
    previewStatusText,
    previewStatusType,
    runPreview,
    runPreviewNow,
    schedulePreview,
  }
}
