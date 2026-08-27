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

    <div
      v-else-if="mode === 'interval_hours'"
      class="cron-builder__fields cron-builder__fields--two"
    >
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
          @update:model-value="handleWeekdaysChange"
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
            <el-option
              v-for="item in monthOptions"
              :key="item"
              :value="item"
              :label="monthLabel(item)"
            />
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
            <el-option
              v-for="item in yearlyDayOptions"
              :key="item"
              :value="item"
              :label="String(item)"
            />
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
import { useCronBuilder } from './cron/useCronBuilder'
import type { BuilderState } from './cron/model'

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
const {
  advancedOutsideBuilder,
  allMonthDays,
  applyTemplate,
  handleModeChange,
  hasLateMonthDay,
  hour,
  intervalHours,
  intervalMinutes,
  loadExpression,
  mode,
  monthDays,
  monthLabel,
  monthOptions,
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
  weekdayOptions,
  weekdays,
  yearlyDay,
  yearlyDayOptions,
  yearlyMonth,
} = useCronBuilder({
  cronExpression,
  translate: t,
  emitChange: (state) => emit('change', state),
})

function handleWeekdaysChange(values: Array<string | number>): void {
  updateWeekdays(values.map(String))
}

defineExpose({ loadExpression, applyTemplate })
</script>

<style scoped lang="scss" src="./CronScheduleBuilder.scss"></style>
