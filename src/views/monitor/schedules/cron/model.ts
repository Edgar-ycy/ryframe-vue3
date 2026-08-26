export type CronBuilderMode =
  'interval_minutes' | 'interval_hours' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'advanced'

export type CronTemplate =
  | 'every_five_minutes'
  | 'hourly'
  | 'daily_midnight'
  | 'daily_two'
  | 'weekdays'
  | 'monday'
  | 'monthly_first'

export type BuilderState = {
  complete: boolean
  summary: string
}

export type RecognizedCronExpression = {
  mode: Exclude<CronBuilderMode, 'advanced'>
  intervalMinutes?: number
  intervalHours?: number
  hour?: number
  minute?: number
  weekdays?: string[]
  monthDays?: number[]
  yearlyMonth?: number
  yearlyDay?: number
}

export type CronBuilderValues = {
  intervalMinutes?: number
  intervalHours?: number
  hour?: number
  minute?: number
  weekdays: string[]
  monthDays: number[]
  yearlyMonth: number
  yearlyDay: number
}

export const WEEKDAY_OPTIONS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
export const ALL_MONTH_DAYS = range(1, 31)
export const MONTH_OPTIONS = range(1, 12)

export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export function createDefaultCronBuilderValues(): CronBuilderValues {
  return {
    intervalMinutes: 5,
    intervalHours: 1,
    hour: 0,
    minute: 0,
    weekdays: ['MON'],
    monthDays: [1],
    yearlyMonth: 1,
    yearlyDay: 1,
  }
}

export function padCronTime(value: number | undefined): string {
  return String(value ?? 0).padStart(2, '0')
}

export function daysInMonth(month: number): number {
  if (month === 2) return 29
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function isValidCronTime(values: Pick<CronBuilderValues, 'hour' | 'minute'>): boolean {
  return (
    values.hour !== undefined &&
    values.minute !== undefined &&
    values.hour >= 0 &&
    values.hour <= 23 &&
    values.minute >= 0 &&
    values.minute <= 59
  )
}

export function hasLateMonthDay(monthDays: readonly number[]): boolean {
  return monthDays.some((day) => day >= 29)
}

export function normalizeWeekdays(values: readonly string[]): string[] {
  const unique = new Set(
    values.filter((value) => WEEKDAY_OPTIONS.includes(value as (typeof WEEKDAY_OPTIONS)[number])),
  )
  return WEEKDAY_OPTIONS.filter((value) => unique.has(value))
}

export function normalizeMonthDays(values: readonly number[]): number[] {
  return [
    ...new Set(values.filter((value) => Number.isInteger(value) && value >= 1 && value <= 31)),
  ].sort((left, right) => left - right)
}

export function buildCronExpression(
  mode: CronBuilderMode,
  values: CronBuilderValues,
  advancedExpression: string,
): string | undefined {
  if (mode === 'interval_minutes') {
    if (!values.intervalMinutes || values.intervalMinutes < 1 || values.intervalMinutes > 59)
      return undefined
    return `0 */${values.intervalMinutes} * * * * *`
  }
  if (mode === 'interval_hours') {
    if (!values.intervalHours || values.intervalHours < 1 || values.intervalHours > 23)
      return undefined
    if (values.minute === undefined || values.minute < 0 || values.minute > 59) return undefined
    return `0 ${values.minute} */${values.intervalHours} * * * *`
  }
  if (mode === 'daily') {
    if (!isValidCronTime(values)) return undefined
    return `0 ${values.minute} ${values.hour} * * * *`
  }
  if (mode === 'weekly') {
    if (!isValidCronTime(values) || values.weekdays.length === 0) return undefined
    return `0 ${values.minute} ${values.hour} * * ${values.weekdays.join(',')} *`
  }
  if (mode === 'monthly') {
    if (!isValidCronTime(values) || values.monthDays.length === 0) return undefined
    return `0 ${values.minute} ${values.hour} ${values.monthDays.join(',')} * * *`
  }
  if (mode === 'yearly') {
    if (!isValidCronTime(values) || values.yearlyDay > daysInMonth(values.yearlyMonth))
      return undefined
    return `0 ${values.minute} ${values.hour} ${values.yearlyDay} ${values.yearlyMonth} * *`
  }
  return advancedExpression.trim() || undefined
}

export function recognizeCronExpression(expression: string): RecognizedCronExpression | undefined {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 7 || fields[0] !== '0' || fields[6] !== '*') return undefined
  const minuteInterval = parseStep(fields[1], 1, 59)
  if (minuteInterval !== undefined && fields.slice(2, 6).every((field) => field === '*')) {
    return { mode: 'interval_minutes', intervalMinutes: minuteInterval }
  }
  const parsedMinute = parseInteger(fields[1], 0, 59)
  const hourInterval = parseStep(fields[2], 1, 23)
  if (
    parsedMinute !== undefined &&
    hourInterval !== undefined &&
    fields.slice(3, 6).every((field) => field === '*')
  ) {
    return { mode: 'interval_hours', intervalHours: hourInterval, minute: parsedMinute }
  }
  const parsedHour = parseInteger(fields[2], 0, 23)
  if (parsedMinute === undefined || parsedHour === undefined) return undefined
  if (fields[3] === '*' && fields[4] === '*' && fields[5] === '*') {
    return { mode: 'daily', hour: parsedHour, minute: parsedMinute }
  }
  if (fields[3] === '*' && fields[4] === '*' && fields[5] !== '*') {
    const parsedWeekdays = parseWeekdays(fields[5])
    if (!parsedWeekdays) return undefined
    return { mode: 'weekly', hour: parsedHour, minute: parsedMinute, weekdays: parsedWeekdays }
  }
  if (fields[4] === '*' && fields[5] === '*') {
    const parsedDays = parseNumberList(fields[3], 1, 31)
    if (!parsedDays) return undefined
    return { mode: 'monthly', hour: parsedHour, minute: parsedMinute, monthDays: parsedDays }
  }
  if (fields[5] === '*') {
    const parsedDay = parseInteger(fields[3], 1, 31)
    const parsedMonth = parseInteger(fields[4], 1, 12)
    if (
      parsedDay === undefined ||
      parsedMonth === undefined ||
      parsedDay > daysInMonth(parsedMonth)
    )
      return undefined
    return {
      mode: 'yearly',
      hour: parsedHour,
      minute: parsedMinute,
      yearlyMonth: parsedMonth,
      yearlyDay: parsedDay,
    }
  }
  return undefined
}

function parseInteger(value: string, minimum: number, maximum: number): number | undefined {
  if (!/^\d+$/.test(value)) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined
}

function parseStep(value: string, minimum: number, maximum: number): number | undefined {
  const match = /^\*\/(\d+)$/.exec(value)
  return match ? parseInteger(match[1], minimum, maximum) : undefined
}

function parseNumberList(value: string, minimum: number, maximum: number): number[] | undefined {
  const parsed = value.split(',').map((item) => parseInteger(item, minimum, maximum))
  if (parsed.some((item) => item === undefined)) return undefined
  return normalizeMonthDays(parsed as number[])
}

function parseWeekdays(value: string): string[] | undefined {
  const parsed = normalizeWeekdays(value.toUpperCase().split(','))
  return parsed.length > 0 && parsed.length === new Set(value.split(',')).size ? parsed : undefined
}
