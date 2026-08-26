import type {
  CreateScheduleBody,
  JobScheduleRecord,
  UpdateScheduleBody,
} from '@/api/modules/monitor'

export type ScheduleFormModel = {
  name: string
  handler_key: string
  cron_expression: string
  timezone: string
  enabled: boolean
  misfire_policy: NonNullable<CreateScheduleBody['misfire_policy']>
  concurrency_policy: NonNullable<CreateScheduleBody['concurrency_policy']>
  max_runtime_seconds: number
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function buildTimezoneOptions(browserTimezone: string): string[] {
  const values = new Set<string>(['UTC', 'Asia/Shanghai', browserTimezone])
  try {
    for (const timezone of Intl.supportedValuesOf('timeZone')) values.add(timezone)
  } catch {
    // 旧浏览器不支持时保留最小 IANA 时区集合。
  }
  return [...values].filter(Boolean).sort((left, right) => {
    if (left === 'UTC') return -1
    if (right === 'UTC') return 1
    return left.localeCompare(right)
  })
}

export function createDefaultScheduleForm(browserTimezone: string): ScheduleFormModel {
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

export function createScheduleForm(
  schedule: JobScheduleRecord | undefined,
  browserTimezone: string,
): ScheduleFormModel {
  if (!schedule) return createDefaultScheduleForm(browserTimezone)
  return {
    name: schedule.name,
    handler_key: schedule.handler_key,
    cron_expression: schedule.cron_expression,
    timezone: schedule.timezone,
    enabled: schedule.enabled,
    misfire_policy: schedule.misfire_policy as ScheduleFormModel['misfire_policy'],
    concurrency_policy: schedule.concurrency_policy as ScheduleFormModel['concurrency_policy'],
    max_runtime_seconds: schedule.max_runtime_seconds,
  }
}

export function isScheduleFormComplete(
  form: ScheduleFormModel,
  targetAvailable: boolean,
  previewAvailable: boolean,
): boolean {
  return (
    isValidScheduleName(form.name) &&
    targetAvailable &&
    previewAvailable &&
    Number.isInteger(form.max_runtime_seconds) &&
    form.max_runtime_seconds >= 1 &&
    form.max_runtime_seconds <= 86400
  )
}

export function buildSchedulePayload(
  form: ScheduleFormModel,
  version?: number,
): CreateScheduleBody | UpdateScheduleBody {
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
  return version === undefined ? payload : { ...payload, version }
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

export function isValidScheduleName(value: string): boolean {
  return Boolean(value.trim()) && byteLength(value.trim()) <= 100
}

export function formatScheduleTime(value: string, timezone: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatUtcTime(value: string, locale: string): string {
  try {
    const formatted = new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(value))
    return `${formatted} UTC`
  } catch {
    return `${value} UTC`
  }
}
