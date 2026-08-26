import { ref, type Ref } from 'vue'
import { confirmAction } from '@/utils/confirmAction'
import {
  ALL_MONTH_DAYS,
  MONTH_OPTIONS,
  WEEKDAY_OPTIONS,
  buildCronExpression,
  createDefaultCronBuilderValues,
  daysInMonth,
  hasLateMonthDay,
  isValidCronTime,
  normalizeMonthDays,
  normalizeWeekdays,
  padCronTime,
  range,
  recognizeCronExpression,
  type BuilderState,
  type CronBuilderMode,
  type CronBuilderValues,
  type CronTemplate,
  type RecognizedCronExpression,
} from './model'

type Translate = (key: string, values?: Record<string, unknown>) => string

type CronBuilderOptions = {
  cronExpression: Ref<string>
  translate: Translate
  emitChange: (state: BuilderState) => void
}

export function useCronBuilder(options: CronBuilderOptions) {
  const { cronExpression, translate: t, emitChange } = options
  const defaults = createDefaultCronBuilderValues()
  const mode = ref<CronBuilderMode>('daily')
  const intervalMinutes = ref<number | undefined>(defaults.intervalMinutes)
  const intervalHours = ref<number | undefined>(defaults.intervalHours)
  const hour = ref<number | undefined>(defaults.hour)
  const minute = ref<number | undefined>(defaults.minute)
  const weekdays = ref<string[]>(defaults.weekdays)
  const monthDays = ref<number[]>(defaults.monthDays)
  const yearlyMonth = ref(defaults.yearlyMonth)
  const yearlyDay = ref(defaults.yearlyDay)
  const yearlyDayOptions = ref<number[]>(range(1, 31))
  const summary = ref('')
  const advancedOutsideBuilder = ref(false)

  function values(): CronBuilderValues {
    return {
      intervalMinutes: intervalMinutes.value,
      intervalHours: intervalHours.value,
      hour: hour.value,
      minute: minute.value,
      weekdays: weekdays.value,
      monthDays: monthDays.value,
      yearlyMonth: yearlyMonth.value,
      yearlyDay: yearlyDay.value,
    }
  }

  function weekdayLabel(value: string): string {
    return t(`monitor.schedules.weekday${value}`)
  }

  function monthLabel(value: number): string {
    return t('monitor.schedules.monthValue', { month: value })
  }

  function updateSummary(): void {
    const current = values()
    if (mode.value === 'interval_minutes') {
      summary.value = current.intervalMinutes
        ? t('monitor.schedules.summaryIntervalMinutes', { minutes: current.intervalMinutes })
        : t('monitor.schedules.summaryIncomplete')
      return
    }
    if (mode.value === 'interval_hours') {
      summary.value =
        current.intervalHours !== undefined && current.minute !== undefined
          ? t('monitor.schedules.summaryIntervalHours', {
              hours: current.intervalHours,
              minute: current.minute,
            })
          : t('monitor.schedules.summaryIncomplete')
      return
    }
    if (mode.value === 'daily') {
      summary.value = isValidCronTime(current)
        ? t('monitor.schedules.summaryDaily', {
            time: `${padCronTime(current.hour)}:${padCronTime(current.minute)}`,
          })
        : t('monitor.schedules.summaryIncomplete')
      return
    }
    if (mode.value === 'weekly') {
      summary.value =
        isValidCronTime(current) && current.weekdays.length
          ? t('monitor.schedules.summaryWeekly', {
              weekdays: current.weekdays
                .map(weekdayLabel)
                .join(t('monitor.schedules.listSeparator')),
              time: `${padCronTime(current.hour)}:${padCronTime(current.minute)}`,
            })
          : t('monitor.schedules.summaryIncomplete')
      return
    }
    if (mode.value === 'monthly') {
      summary.value =
        isValidCronTime(current) && current.monthDays.length
          ? t('monitor.schedules.summaryMonthly', {
              days: current.monthDays.join(t('monitor.schedules.listSeparator')),
              time: `${padCronTime(current.hour)}:${padCronTime(current.minute)}`,
            })
          : t('monitor.schedules.summaryIncomplete')
      return
    }
    if (mode.value === 'yearly') {
      summary.value =
        isValidCronTime(current) && current.yearlyDay <= daysInMonth(current.yearlyMonth)
          ? t('monitor.schedules.summaryYearly', {
              month: current.yearlyMonth,
              day: current.yearlyDay,
              time: `${padCronTime(current.hour)}:${padCronTime(current.minute)}`,
            })
          : t('monitor.schedules.summaryIncomplete')
      return
    }
    summary.value = cronExpression.value.trim()
      ? t('monitor.schedules.summaryAdvanced')
      : t('monitor.schedules.summaryIncomplete')
  }

  function syncCronExpression(): void {
    const expression = buildCronExpression(mode.value, values(), cronExpression.value)
    cronExpression.value = expression ?? ''
    advancedOutsideBuilder.value = false
    updateSummary()
    emitChange({ complete: Boolean(expression), summary: summary.value })
  }

  function initializeMode(value: Exclude<CronBuilderMode, 'advanced'>): void {
    mode.value = value
    if (value === 'interval_minutes') intervalMinutes.value = 5
    if (value === 'interval_hours') {
      intervalHours.value = 1
      minute.value = 0
    }
    if (value === 'daily') {
      hour.value = 0
      minute.value = 0
    }
    if (value === 'weekly') {
      weekdays.value = ['MON']
      hour.value = 0
      minute.value = 0
    }
    if (value === 'monthly') {
      monthDays.value = [1]
      hour.value = 0
      minute.value = 0
    }
    if (value === 'yearly') {
      yearlyMonth.value = 1
      yearlyDay.value = 1
      yearlyDayOptions.value = range(1, 31)
      hour.value = 0
      minute.value = 0
    }
    syncCronExpression()
  }

  async function handleModeChange(value: CronBuilderMode): Promise<void> {
    if (value === mode.value) return
    if (value === 'advanced') {
      mode.value = 'advanced'
      advancedOutsideBuilder.value = false
      updateSummary()
      emitChange({ complete: Boolean(cronExpression.value.trim()), summary: summary.value })
      return
    }
    if (mode.value === 'advanced') {
      const recognized = recognizeCronExpression(cronExpression.value)
      if (recognized) {
        applyRecognizedExpression(recognized)
        emitChange({ complete: true, summary: summary.value })
        return
      }
      const confirmed = await confirmAction(
        t('monitor.schedules.advancedOverwriteConfirm'),
        t('monitor.schedules.advancedOverwriteTitle'),
        { type: 'warning' },
      )
      if (!confirmed) return
    }
    initializeMode(value)
  }

  function updateIntervalMinutes(value: number | undefined): void {
    intervalMinutes.value = value
    syncCronExpression()
  }

  function updateIntervalHours(value: number | undefined): void {
    intervalHours.value = value
    syncCronExpression()
  }

  function updateHour(value: number | undefined): void {
    hour.value = value
    syncCronExpression()
  }

  function updateMinute(value: number | undefined): void {
    minute.value = value
    syncCronExpression()
  }

  function updateWeekdays(values: string[]): void {
    weekdays.value = normalizeWeekdays(values)
    syncCronExpression()
  }

  function updateMonthDays(values: number[]): void {
    monthDays.value = normalizeMonthDays(values)
    syncCronExpression()
  }

  function updateYearlyMonth(value: number): void {
    yearlyMonth.value = value
    yearlyDayOptions.value = range(1, daysInMonth(value))
    if (yearlyDay.value > yearlyDayOptions.value.length) {
      yearlyDay.value = yearlyDayOptions.value.length
    }
    syncCronExpression()
  }

  function updateYearlyDay(value: number): void {
    yearlyDay.value = value
    syncCronExpression()
  }

  function updateAdvancedExpression(value: string): void {
    cronExpression.value = value
    advancedOutsideBuilder.value = !recognizeCronExpression(value)
    updateSummary()
    emitChange({ complete: Boolean(value.trim()), summary: summary.value })
  }

  function applyTemplate(template: CronTemplate): void {
    if (template === 'every_five_minutes') {
      mode.value = 'interval_minutes'
      intervalMinutes.value = 5
    } else if (template === 'hourly') {
      mode.value = 'interval_hours'
      intervalHours.value = 1
      minute.value = 0
    } else if (template === 'daily_midnight' || template === 'daily_two') {
      mode.value = 'daily'
      hour.value = template === 'daily_two' ? 2 : 0
      minute.value = 0
    } else if (template === 'weekdays' || template === 'monday') {
      mode.value = 'weekly'
      weekdays.value = template === 'weekdays' ? ['MON', 'TUE', 'WED', 'THU', 'FRI'] : ['MON']
      hour.value = template === 'weekdays' ? 9 : 0
      minute.value = 0
    } else {
      mode.value = 'monthly'
      monthDays.value = [1]
      hour.value = 0
      minute.value = 0
    }
    syncCronExpression()
  }

  function loadExpression(expression: string): BuilderState {
    cronExpression.value = expression
    const recognized = recognizeCronExpression(expression)
    if (recognized) {
      applyRecognizedExpression(recognized)
      return { complete: true, summary: summary.value }
    }
    mode.value = 'advanced'
    advancedOutsideBuilder.value = Boolean(expression.trim())
    updateSummary()
    return { complete: Boolean(expression.trim()), summary: summary.value }
  }

  function applyRecognizedExpression(recognized: RecognizedCronExpression): void {
    mode.value = recognized.mode
    if (recognized.intervalMinutes !== undefined) intervalMinutes.value = recognized.intervalMinutes
    if (recognized.intervalHours !== undefined) intervalHours.value = recognized.intervalHours
    if (recognized.hour !== undefined) hour.value = recognized.hour
    if (recognized.minute !== undefined) minute.value = recognized.minute
    if (recognized.weekdays) weekdays.value = recognized.weekdays
    if (recognized.monthDays) monthDays.value = recognized.monthDays
    if (recognized.yearlyMonth !== undefined) {
      yearlyMonth.value = recognized.yearlyMonth
      yearlyDayOptions.value = range(1, daysInMonth(recognized.yearlyMonth))
    }
    if (recognized.yearlyDay !== undefined) yearlyDay.value = recognized.yearlyDay
    advancedOutsideBuilder.value = false
    updateSummary()
  }

  return {
    advancedOutsideBuilder,
    allMonthDays: ALL_MONTH_DAYS,
    applyTemplate,
    handleModeChange,
    hasLateMonthDay: () => hasLateMonthDay(monthDays.value),
    hour,
    intervalHours,
    intervalMinutes,
    loadExpression,
    mode,
    monthDays,
    monthLabel,
    monthOptions: MONTH_OPTIONS,
    minute,
    summary,
    updateAdvancedExpression,
    updateHour,
    updateIntervalHours,
    updateIntervalMinutes,
    updateMinute,
    updateMonthDays,
    updateWeekdays,
    updateYearlyDay,
    updateYearlyMonth,
    weekdayLabel,
    weekdayOptions: WEEKDAY_OPTIONS,
    weekdays,
    yearlyDay,
    yearlyDayOptions,
    yearlyMonth,
  }
}
