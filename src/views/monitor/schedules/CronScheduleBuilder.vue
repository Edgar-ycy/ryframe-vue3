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
