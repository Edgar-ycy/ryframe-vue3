import { renderToString } from 'vue/server-renderer'
import { createSSRApp, defineComponent, h, type Component } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CronScheduleBuilder from '@/views/monitor/schedules/CronScheduleBuilder.vue'
import type { CronBuilderMode } from '@/views/monitor/schedules/cron/model'

type EventAttributes = Record<string, unknown>

type BuilderDoubles = {
  applyTemplate: ReturnType<typeof vi.fn>
  handleModeChange: ReturnType<typeof vi.fn>
  loadExpression: ReturnType<typeof vi.fn>
  updateAdvancedExpression: ReturnType<typeof vi.fn>
  updateHour: ReturnType<typeof vi.fn>
  updateIntervalHours: ReturnType<typeof vi.fn>
  updateIntervalMinutes: ReturnType<typeof vi.fn>
  updateMinute: ReturnType<typeof vi.fn>
  updateMonthDays: ReturnType<typeof vi.fn>
  updateWeekdays: ReturnType<typeof vi.fn>
  updateYearlyDay: ReturnType<typeof vi.fn>
  updateYearlyMonth: ReturnType<typeof vi.fn>
}

const scenario = vi.hoisted(() => ({
  advancedOutsideBuilder: false,
  current: undefined as BuilderDoubles | undefined,
  inputNumbers: [] as EventAttributes[],
  mode: 'daily' as CronBuilderMode,
  monthDays: [1] as number[],
  yearlyDay: 1,
  yearlyMonth: 1,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('element-plus', async () => {
  const { defineComponent, h } = await vi.importActual<typeof import('vue')>('vue')
  return {
    ElInputNumber: defineComponent({
      inheritAttrs: false,
      setup(_props, { attrs }) {
        scenario.inputNumbers.push({ ...attrs })
        return () => h('span', { class: 'input-number-stub' })
      },
    }),
  }
})

vi.mock('@/views/monitor/schedules/cron/useCronBuilder', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  return {
    useCronBuilder: () => {
      const current: BuilderDoubles = {
        applyTemplate: vi.fn(),
        handleModeChange: vi.fn(),
        loadExpression: vi.fn(),
        updateAdvancedExpression: vi.fn(),
        updateHour: vi.fn(),
        updateIntervalHours: vi.fn(),
        updateIntervalMinutes: vi.fn(),
        updateMinute: vi.fn(),
        updateMonthDays: vi.fn(),
        updateWeekdays: vi.fn(),
        updateYearlyDay: vi.fn(),
        updateYearlyMonth: vi.fn(),
      }
      scenario.current = current
      return {
        ...current,
        advancedOutsideBuilder: ref(scenario.advancedOutsideBuilder),
        allMonthDays: [1, 2, 29, 31],
        hasLateMonthDay: () => scenario.monthDays.some((day) => day >= 29),
        hour: ref(8),
        intervalHours: ref(2),
        intervalMinutes: ref(5),
        mode: ref(scenario.mode),
        monthDays: ref(scenario.monthDays),
        monthLabel: (month: number) => `month-${month}`,
        monthOptions: [1, 2, 12],
        minute: ref(15),
        summary: ref(`summary-${scenario.mode}`),
        weekdayLabel: (weekday: string) => `weekday-${weekday}`,
        weekdayOptions: ['MON', 'TUE'],
        weekdays: ref(['MON']),
        yearlyDay: ref(scenario.yearlyDay),
        yearlyDayOptions: ref([1, 28, 29]),
        yearlyMonth: ref(scenario.yearlyMonth),
      }
    },
  }
})

const captured = {
  buttons: [] as EventAttributes[],
  checkboxGroups: [] as EventAttributes[],
  inputs: [] as EventAttributes[],
  selects: [] as EventAttributes[],
}

function captureStub(bucket: EventAttributes[], tag = 'span'): Component {
  return defineComponent({
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      bucket.push({ ...attrs })
      return () => h(tag, attrs, slots.default?.())
    },
  })
}

const passThrough = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('span', attrs, slots.default?.())
  },
})

function resetCaptures(): void {
  captured.buttons.length = 0
  captured.checkboxGroups.length = 0
  captured.inputs.length = 0
  captured.selects.length = 0
  scenario.inputNumbers.length = 0
}

async function renderBuilder(mode: CronBuilderMode, disabled = false): Promise<string> {
  resetCaptures()
  scenario.mode = mode
  scenario.advancedOutsideBuilder = mode === 'advanced'
  scenario.monthDays = mode === 'monthly' ? [1, 29] : [1]
  scenario.yearlyMonth = mode === 'yearly' ? 2 : 1
  scenario.yearlyDay = mode === 'yearly' ? 29 : 1
  const app = createSSRApp({
    render: () =>
      h(CronScheduleBuilder, {
        disabled,
        modelValue: '0 15 8 * * * *',
        'onUpdate:modelValue': vi.fn(),
      }),
  })
  app.component('ElAlert', passThrough)
  app.component('ElButton', captureStub(captured.buttons, 'button'))
  app.component('ElCheckbox', passThrough)
  app.component('ElCheckboxGroup', captureStub(captured.checkboxGroups))
  app.component('ElInput', captureStub(captured.inputs))
  app.component('ElOption', passThrough)
  app.component('ElSelect', captureStub(captured.selects))
  return renderToString(app)
}

function invoke(attributes: EventAttributes, name: string, value?: unknown): void {
  const handler = attributes[name]
  expect(handler).toBeTypeOf('function')
  ;(handler as (event?: unknown) => void)(value)
}

function byLabel(items: EventAttributes[], label: string): EventAttributes {
  const item = items.find((attributes) => attributes['aria-label'] === label)
  expect(item, `找不到控件 ${label}`).toBeDefined()
  return item!
}

beforeEach(() => {
  resetCaptures()
  scenario.current = undefined
})

describe('Cron 构建器组件', () => {
  it('渲染全部模式及其边界提示', async () => {
    const modes: CronBuilderMode[] = [
      'interval_minutes',
      'interval_hours',
      'daily',
      'weekly',
      'monthly',
      'yearly',
      'advanced',
    ]

    for (const mode of modes) {
      const html = await renderBuilder(mode, mode === 'interval_minutes')
      expect(html).toContain(`summary-${mode}`)
      expect(html).toContain('0 15 8 * * * *')
      if (mode === 'monthly') expect(html).toContain('monitor.schedules.monthEndSkipHint')
      if (mode === 'yearly') expect(html).toContain('monitor.schedules.leapYearHint')
      if (mode === 'advanced') expect(html).toContain('monitor.schedules.advancedOutsideBuilder')
    }
  })

  it('把模板、模式、星期和时间交互转发给状态机', async () => {
    await renderBuilder('daily')
    const current = scenario.current!

    invoke(captured.buttons[0]!, 'onClick')
    expect(current.applyTemplate).toHaveBeenCalledWith('every_five_minutes')
    invoke(byLabel(captured.selects, 'monitor.schedules.builderMode'), 'onChange', 'weekly')
    expect(current.handleModeChange).toHaveBeenCalledWith('weekly')
    invoke(byLabel(scenario.inputNumbers, 'monitor.schedules.hour'), 'onUpdate:modelValue', 21)
    invoke(byLabel(scenario.inputNumbers, 'monitor.schedules.minute'), 'onUpdate:modelValue', 45)
    expect(current.updateHour).toHaveBeenCalledWith(21)
    expect(current.updateMinute).toHaveBeenCalledWith(45)

    await renderBuilder('weekly')
    invoke(captured.checkboxGroups[0]!, 'onUpdate:modelValue', ['MON', 2])
    expect(scenario.current!.updateWeekdays).toHaveBeenCalledWith(['MON', '2'])
  })

  it('把间隔、月度、年度和高级输入转发给对应更新函数', async () => {
    await renderBuilder('interval_minutes')
    invoke(
      byLabel(scenario.inputNumbers, 'monitor.schedules.intervalMinutes'),
      'onUpdate:modelValue',
      10,
    )
    expect(scenario.current!.updateIntervalMinutes).toHaveBeenCalledWith(10)

    await renderBuilder('interval_hours')
    invoke(
      byLabel(scenario.inputNumbers, 'monitor.schedules.intervalHours'),
      'onUpdate:modelValue',
      4,
    )
    expect(scenario.current!.updateIntervalHours).toHaveBeenCalledWith(4)

    await renderBuilder('monthly')
    invoke(byLabel(captured.selects, 'monitor.schedules.monthDays'), 'onUpdate:modelValue', [1, 15])
    expect(scenario.current!.updateMonthDays).toHaveBeenCalledWith([1, 15])

    await renderBuilder('yearly')
    invoke(byLabel(captured.selects, 'monitor.schedules.month'), 'onUpdate:modelValue', 12)
    invoke(byLabel(captured.selects, 'monitor.schedules.day'), 'onUpdate:modelValue', 31)
    expect(scenario.current!.updateYearlyMonth).toHaveBeenCalledWith(12)
    expect(scenario.current!.updateYearlyDay).toHaveBeenCalledWith(31)

    await renderBuilder('advanced')
    invoke(captured.inputs[0]!, 'onUpdate:modelValue', '0 0 12 * * * *')
    expect(scenario.current!.updateAdvancedExpression).toHaveBeenCalledWith('0 0 12 * * * *')
  })
})
