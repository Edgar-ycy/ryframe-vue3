<template>
  <section class="cron-builder">
    <div class="cron-builder__header">
      <div>
        <h3>{{ t('monitor.schedules.builderTitle') }}</h3>
        <p>{{ t('monitor.schedules.builderDescription') }}</p>
      </div>
      <el-select
        :model-value="mode"
        :disabled="disabled"
        :aria-label="t('monitor.schedules.builderMode')"
        class="cron-builder__mode"
        @change="handleModeChange"
      >
        <el-option value="interval_minutes" :label="t('monitor.schedules.modeIntervalMinutes')" />
        <el-option value="interval_hours" :label="t('monitor.schedules.modeIntervalHours')" />
        <el-option value="daily" :label="t('monitor.schedules.modeDaily')" />
        <el-option value="weekly" :label="t('monitor.schedules.modeWeekly')" />
        <el-option value="monthly" :label="t('monitor.schedules.modeMonthly')" />
        <el-option value="yearly" :label="t('monitor.schedules.modeYearly')" />
        <el-option value="advanced" :label="t('monitor.schedules.modeAdvanced')" />
      </el-select>
    </div>

    <div class="cron-builder__templates" :aria-label="t('monitor.schedules.presets')">
      <span>{{ t('monitor.schedules.presets') }}</span>
      <el-button :disabled="disabled" size="small" @click="applyTemplate('every_five_minutes')">
        {{ t('monitor.schedules.presetEveryFiveMinutes') }}
      </el-button>
      <el-button :disabled="disabled" size="small" @click="applyTemplate('hourly')">
        {{ t('monitor.schedules.presetHourly') }}
      </el-button>
      <el-button :disabled="disabled" size="small" @click="applyTemplate('daily_midnight')">
        {{ t('monitor.schedules.presetDaily') }}
      </el-button>
      <el-button :disabled="disabled" size="small" @click="applyTemplate('daily_two')">
        {{ t('monitor.schedules.presetDailyTwo') }}
      </el-button>
      <el-button :disabled="disabled" size="small" @click="applyTemplate('weekdays')">
        {{ t('monitor.schedules.presetWeekdays') }}
      </el-button>
      <el-button :disabled="disabled" size="small" @click="applyTemplate('monday')">
        {{ t('monitor.schedules.presetWeekly') }}
      </el-button>
      <el-button :disabled="disabled" size="small" @click="applyTemplate('monthly_first')">
        {{ t('monitor.schedules.presetMonthly') }}
      </el-button>
    </div>

    <div v-if="mode === 'interval_minutes'" class="cron-builder__fields">
      <label>{{ t('monitor.schedules.intervalMinutes') }}</label>
      <el-input-number
        :model-value="intervalMinutes"
        :disabled="disabled"
        :min="1"
        :max="59"
        :precision="0"
        :aria-label="t('monitor.schedules.intervalMinutes')"
        @update:model-value="updateIntervalMinutes"
      />
    </div>

    <div v-else-if="mode === 'interval_hours'" class="cron-builder__fields cron-builder__fields--two">
      <div>
        <label>{{ t('monitor.schedules.intervalHours') }}</label>
        <el-input-number
          :model-value="intervalHours"
          :disabled="disabled"
          :min="1"
          :max="23"
          :precision="0"
          :aria-label="t('monitor.schedules.intervalHours')"
          @update:model-value="updateIntervalHours"
        />
      </div>
      <div>
        <label>{{ t('monitor.schedules.executeMinute') }}</label>
        <el-input-number
          :model-value="minute"
          :disabled="disabled"
          :min="0"
          :max="59"
          :precision="0"
          :aria-label="t('monitor.schedules.executeMinute')"
          @update:model-value="updateMinute"
        />
      </div>
    </div>

    <div v-else-if="mode === 'daily'" class="cron-builder__fields cron-builder__fields--two">
      <time-fields
        :hour="hour"
        :minute="minute"
        :disabled="disabled"
        @update:hour="updateHour"
        @update:minute="updateMinute"
      />
    </div>

    <div v-else-if="mode === 'weekly'" class="cron-builder__stack">
      <div class="cron-builder__field">
        <label>{{ t('monitor.schedules.weekdays') }}</label>
        <el-checkbox-group
          :model-value="weekdays"
          :disabled="disabled"
          class="cron-builder__checks"
          @update:model-value="updateWeekdays"
        >
          <el-checkbox v-for="day in weekdayOptions" :key="day" :value="day">
            {{ weekdayLabel(day) }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <div class="cron-builder__fields cron-builder__fields--two">
        <time-fields
          :hour="hour"
          :minute="minute"
          :disabled="disabled"
          @update:hour="updateHour"
          @update:minute="updateMinute"
        />
      </div>
    </div>

    <div v-else-if="mode === 'monthly'" class="cron-builder__stack">
      <div class="cron-builder__field">
        <label>{{ t('monitor.schedules.monthDays') }}</label>
        <el-select
          :model-value="monthDays"
          :disabled="disabled"
          multiple
          collapse-tags
          collapse-tags-tooltip
          :aria-label="t('monitor.schedules.monthDays')"
          class="cron-builder__wide-control"
          @update:model-value="updateMonthDays"
        >
          <el-option v-for="day in allMonthDays" :key="day" :value="day" :label="String(day)" />
        </el-select>
        <p v-if="hasLateMonthDay()" class="cron-builder__warning">
          {{ t('monitor.schedules.monthEndSkipHint') }}
        </p>
      </div>
      <div class="cron-builder__fields cron-builder__fields--two">
        <time-fields
          :hour="hour"
          :minute="minute"
          :disabled="disabled"
          @update:hour="updateHour"
          @update:minute="updateMinute"
        />
      </div>
    </div>

    <div v-else-if="mode === 'yearly'" class="cron-builder__stack">
      <div class="cron-builder__fields cron-builder__fields--two">
        <div>
          <label>{{ t('monitor.schedules.month') }}</label>
          <el-select
            :model-value="yearlyMonth"
            :disabled="disabled"
            :aria-label="t('monitor.schedules.month')"
            @update:model-value="updateYearlyMonth"
          >
            <el-option v-for="item in monthOptions" :key="item" :value="item" :label="monthLabel(item)" />
          </el-select>
        </div>
        <div>
          <label>{{ t('monitor.schedules.day') }}</label>
          <el-select
            :model-value="yearlyDay"
            :disabled="disabled"
            :aria-label="t('monitor.schedules.day')"
            @update:model-value="updateYearlyDay"
          >
            <el-option v-for="item in yearlyDayOptions" :key="item" :value="item" :label="String(item)" />
          </el-select>
        </div>
      </div>
      <div class="cron-builder__fields cron-builder__fields--two">
        <time-fields
          :hour="hour"
          :minute="minute"
          :disabled="disabled"
          @update:hour="updateHour"
          @update:minute="updateMinute"
        />
      </div>
      <p v-if="yearlyMonth === 2 && yearlyDay === 29" class="cron-builder__warning">
        {{ t('monitor.schedules.leapYearHint') }}
      </p>
    </div>

    <div v-else class="cron-builder__advanced">
      <el-alert
        v-if="advancedOutsideBuilder"
        :title="t('monitor.schedules.advancedOutsideBuilder')"
        type="info"
        show-icon
        :closable="false"
      />
      <label>{{ t('monitor.schedules.cron') }}</label>
      <el-input
        :model-value="cronExpression"
        :disabled="disabled"
        :placeholder="t('monitor.schedules.cronPlaceholder')"
        @update:model-value="updateAdvancedExpression"
      />
      <p>{{ t('monitor.schedules.advancedCronHint') }}</p>
      <p>{{ t('monitor.schedules.dayWeekExclusiveHint') }}</p>
    </div>

    <div class="cron-builder__summary">
      <strong>{{ t('monitor.schedules.summary') }}</strong>
      <span>{{ summary }}</span>
      <code>{{ cronExpression || '—' }}</code>
    </div>
  </section>
</template>

<script setup lang="ts">
import { defineComponent, h } from 'vue'
import { ElInputNumber } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { confirmAction } from '@/utils/confirmAction'

type CronBuilderMode =
  | 'interval_minutes'
  | 'interval_hours'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'advanced'

type CronTemplate =
  | 'every_five_minutes'
  | 'hourly'
  | 'daily_midnight'
  | 'daily_two'
  | 'weekdays'
  | 'monday'
  | 'monthly_first'

type BuilderState = {
  complete: boolean
  summary: string
}

type RecognizedExpression = {
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

defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  change: [state: BuilderState]
}>()

const cronExpression = defineModel<string>({ required: true })
const { t } = useI18n()
const TimeFields = defineComponent({
  name: 'TimeFields',
  props: {
    hour: { type: Number, default: undefined },
    minute: { type: Number, default: undefined },
    disabled: Boolean,
  },
  emits: ['update:hour', 'update:minute'],
  setup(timeProps, { emit: emitTime }) {
    return () => [
      h('div', [
        h('label', t('monitor.schedules.hour')),
        h(ElInputNumber, {
          modelValue: timeProps.hour,
          disabled: timeProps.disabled,
          min: 0,
          max: 23,
          precision: 0,
          'aria-label': t('monitor.schedules.hour'),
          'onUpdate:modelValue': (value: number | undefined) => emitTime('update:hour', value),
        }),
      ]),
      h('div', [
        h('label', t('monitor.schedules.minute')),
        h(ElInputNumber, {
          modelValue: timeProps.minute,
          disabled: timeProps.disabled,
          min: 0,
          max: 59,
          precision: 0,
          'aria-label': t('monitor.schedules.minute'),
          'onUpdate:modelValue': (value: number | undefined) => emitTime('update:minute', value),
        }),
      ]),
    ]
  },
})
const mode = ref<CronBuilderMode>('daily')
const intervalMinutes = ref<number | undefined>(5)
const intervalHours = ref<number | undefined>(1)
const hour = ref<number | undefined>(0)
const minute = ref<number | undefined>(0)
const weekdays = ref<string[]>(['MON'])
const monthDays = ref<number[]>([1])
const yearlyMonth = ref(1)
const yearlyDay = ref(1)
const yearlyDayOptions = ref<number[]>(range(1, 31))
const summary = ref('')
const advancedOutsideBuilder = ref(false)
const weekdayOptions = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
const allMonthDays = range(1, 31)
const monthOptions = range(1, 12)

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function pad(value: number | undefined): string {
  return String(value ?? 0).padStart(2, '0')
}

function weekdayLabel(value: string): string {
  return t(`monitor.schedules.weekday${value}`)
}

function monthLabel(value: number): string {
  return t('monitor.schedules.monthValue', { month: value })
}

function daysInMonth(month: number): number {
  if (month === 2) return 29
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function hasLateMonthDay(): boolean {
  return monthDays.value.some(day => day >= 29)
}

function normalizeWeekdays(values: string[]): string[] {
  const unique = new Set(values.filter(value => weekdayOptions.includes(value as typeof weekdayOptions[number])))
  return weekdayOptions.filter(value => unique.has(value))
}

function normalizeMonthDays(values: number[]): number[] {
  return [...new Set(values.filter(value => Number.isInteger(value) && value >= 1 && value <= 31))]
    .sort((left, right) => left - right)
}

function buildExpression(): string | undefined {
  if (mode.value === 'interval_minutes') {
    if (!intervalMinutes.value || intervalMinutes.value < 1 || intervalMinutes.value > 59) return undefined
    return `0 */${intervalMinutes.value} * * * * *`
  }
  if (mode.value === 'interval_hours') {
    if (!intervalHours.value || intervalHours.value < 1 || intervalHours.value > 23) return undefined
    if (minute.value === undefined || minute.value < 0 || minute.value > 59) return undefined
    return `0 ${minute.value} */${intervalHours.value} * * * *`
  }
  if (mode.value === 'daily') {
    if (!validTime()) return undefined
    return `0 ${minute.value} ${hour.value} * * * *`
  }
  if (mode.value === 'weekly') {
    if (!validTime() || weekdays.value.length === 0) return undefined
    return `0 ${minute.value} ${hour.value} * * ${weekdays.value.join(',')} *`
  }
  if (mode.value === 'monthly') {
    if (!validTime() || monthDays.value.length === 0) return undefined
    return `0 ${minute.value} ${hour.value} ${monthDays.value.join(',')} * * *`
  }
  if (mode.value === 'yearly') {
    if (!validTime() || yearlyDay.value > daysInMonth(yearlyMonth.value)) return undefined
    return `0 ${minute.value} ${hour.value} ${yearlyDay.value} ${yearlyMonth.value} * *`
  }
  return cronExpression.value.trim() || undefined
}

function validTime(): boolean {
  return hour.value !== undefined
    && minute.value !== undefined
    && hour.value >= 0
    && hour.value <= 23
    && minute.value >= 0
    && minute.value <= 59
}

function updateSummary(): void {
  if (mode.value === 'interval_minutes') {
    summary.value = intervalMinutes.value
      ? t('monitor.schedules.summaryIntervalMinutes', { minutes: intervalMinutes.value })
      : t('monitor.schedules.summaryIncomplete')
    return
  }
  if (mode.value === 'interval_hours') {
    summary.value = intervalHours.value !== undefined && minute.value !== undefined
      ? t('monitor.schedules.summaryIntervalHours', { hours: intervalHours.value, minute: minute.value })
      : t('monitor.schedules.summaryIncomplete')
    return
  }
  if (mode.value === 'daily') {
    summary.value = validTime()
      ? t('monitor.schedules.summaryDaily', { time: `${pad(hour.value)}:${pad(minute.value)}` })
      : t('monitor.schedules.summaryIncomplete')
    return
  }
  if (mode.value === 'weekly') {
    summary.value = validTime() && weekdays.value.length
      ? t('monitor.schedules.summaryWeekly', {
          weekdays: weekdays.value.map(weekdayLabel).join(t('monitor.schedules.listSeparator')),
          time: `${pad(hour.value)}:${pad(minute.value)}`,
        })
      : t('monitor.schedules.summaryIncomplete')
    return
  }
  if (mode.value === 'monthly') {
    summary.value = validTime() && monthDays.value.length
      ? t('monitor.schedules.summaryMonthly', {
          days: monthDays.value.join(t('monitor.schedules.listSeparator')),
          time: `${pad(hour.value)}:${pad(minute.value)}`,
        })
      : t('monitor.schedules.summaryIncomplete')
    return
  }
  if (mode.value === 'yearly') {
    summary.value = validTime() && yearlyDay.value <= daysInMonth(yearlyMonth.value)
      ? t('monitor.schedules.summaryYearly', {
          month: yearlyMonth.value,
          day: yearlyDay.value,
          time: `${pad(hour.value)}:${pad(minute.value)}`,
        })
      : t('monitor.schedules.summaryIncomplete')
    return
  }
  summary.value = cronExpression.value.trim()
    ? t('monitor.schedules.summaryAdvanced')
    : t('monitor.schedules.summaryIncomplete')
}

function syncCronExpression(): void {
  const expression = buildExpression()
  cronExpression.value = expression ?? ''
  advancedOutsideBuilder.value = false
  updateSummary()
  emit('change', { complete: Boolean(expression), summary: summary.value })
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
    emit('change', { complete: Boolean(cronExpression.value.trim()), summary: summary.value })
    return
  }
  if (mode.value === 'advanced') {
    const recognized = recognizeExpression(cronExpression.value)
    if (recognized) {
      applyRecognizedExpression(recognized)
      emit('change', { complete: true, summary: summary.value })
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
  advancedOutsideBuilder.value = !recognizeExpression(value)
  updateSummary()
  emit('change', { complete: Boolean(value.trim()), summary: summary.value })
}

function applyTemplate(template: CronTemplate): void {
  if (template === 'every_five_minutes') {
    mode.value = 'interval_minutes'
    intervalMinutes.value = 5
  }
  else if (template === 'hourly') {
    mode.value = 'interval_hours'
    intervalHours.value = 1
    minute.value = 0
  }
  else if (template === 'daily_midnight' || template === 'daily_two') {
    mode.value = 'daily'
    hour.value = template === 'daily_two' ? 2 : 0
    minute.value = 0
  }
  else if (template === 'weekdays' || template === 'monday') {
    mode.value = 'weekly'
    weekdays.value = template === 'weekdays'
      ? ['MON', 'TUE', 'WED', 'THU', 'FRI']
      : ['MON']
    hour.value = template === 'weekdays' ? 9 : 0
    minute.value = 0
  }
  else {
    mode.value = 'monthly'
    monthDays.value = [1]
    hour.value = 0
    minute.value = 0
  }
  syncCronExpression()
}

function loadExpression(expression: string): BuilderState {
  cronExpression.value = expression
  const recognized = recognizeExpression(expression)
  if (recognized) {
    applyRecognizedExpression(recognized)
    return { complete: true, summary: summary.value }
  }
  mode.value = 'advanced'
  advancedOutsideBuilder.value = Boolean(expression.trim())
  updateSummary()
  return { complete: Boolean(expression.trim()), summary: summary.value }
}

function applyRecognizedExpression(recognized: RecognizedExpression): void {
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

function recognizeExpression(expression: string): RecognizedExpression | undefined {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 7 || fields[0] !== '0' || fields[6] !== '*') return undefined
  const minuteInterval = parseStep(fields[1], 1, 59)
  if (minuteInterval !== undefined && fields.slice(2, 6).every(field => field === '*')) {
    return { mode: 'interval_minutes', intervalMinutes: minuteInterval }
  }
  const parsedMinute = parseInteger(fields[1], 0, 59)
  const hourInterval = parseStep(fields[2], 1, 23)
  if (parsedMinute !== undefined && hourInterval !== undefined && fields.slice(3, 6).every(field => field === '*')) {
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
    if (parsedDay === undefined || parsedMonth === undefined || parsedDay > daysInMonth(parsedMonth)) return undefined
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
  const parsed = value.split(',').map(item => parseInteger(item, minimum, maximum))
  if (parsed.some(item => item === undefined)) return undefined
  return normalizeMonthDays(parsed as number[])
}

function parseWeekdays(value: string): string[] | undefined {
  const parsed = normalizeWeekdays(value.toUpperCase().split(','))
  return parsed.length > 0 && parsed.length === new Set(value.split(',')).size ? parsed : undefined
}

defineExpose({ loadExpression, applyTemplate })
</script>

<style scoped lang="scss">
.cron-builder {
  display: grid;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  background: var(--color-bg-container);
}

.cron-builder__header {
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

.cron-builder__mode {
  width: 210px;
  flex: 0 0 auto;
}

.cron-builder__templates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;

  > span {
    color: var(--color-text-secondary);
    font-size: 13px;
  }

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.cron-builder__fields {
  display: grid;
  gap: 12px;

  label {
    display: block;
    margin-bottom: 6px;
    color: var(--color-text-regular);
    font-size: 13px;
  }
}

.cron-builder__fields--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cron-builder__stack {
  display: grid;
  gap: 14px;
}

.cron-builder__field > label,
.cron-builder__advanced > label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-regular);
  font-size: 13px;
}

.cron-builder__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
}

.cron-builder__wide-control {
  width: 100%;
}

.cron-builder__warning,
.cron-builder__advanced p {
  margin: 6px 0 0;
  color: var(--el-color-warning);
  font-size: 12px;
  line-height: 1.5;
}

.cron-builder__advanced {
  display: grid;
  gap: 8px;

  p {
    margin: 0;
    color: var(--color-text-secondary);
  }
}

.cron-builder__summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px 12px;
  padding: 12px;
  border-radius: var(--border-radius-small);
  background: var(--border-color-light);
  color: var(--color-text-regular);
  font-size: 13px;

  code {
    grid-column: 1 / -1;
    overflow-wrap: anywhere;
    color: var(--color-text-primary);
  }
}

@media (width <= 640px) {
  .cron-builder__header {
    flex-direction: column;
  }

  .cron-builder__mode {
    width: 100%;
  }

  .cron-builder__fields--two {
    grid-template-columns: 1fr;
  }
}
</style>
