import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCronBuilder } from '@/views/monitor/schedules/cron/useCronBuilder'

const ui = vi.hoisted(() => ({ confirm: vi.fn() }))

vi.mock('@/utils/confirmAction', () => ({ confirmAction: ui.confirm }))

const translate = (key: string, values?: Record<string, unknown>): string =>
  values ? `${key}:${JSON.stringify(values)}` : key

function createBuilder(expression = '0 0 0 * * * *') {
  const cronExpression = ref(expression)
  const emitChange = vi.fn()
  return {
    builder: useCronBuilder({ cronExpression, emitChange, translate }),
    cronExpression,
    emitChange,
  }
}

beforeEach(() => {
  ui.confirm.mockResolvedValue(true)
})

describe('Cron 构建器状态机', () => {
  it('初始化并跟随外部表达式更新可视化状态', () => {
    const { builder, cronExpression, emitChange } = createBuilder('0 15 8 * * MON,WED *')

    expect(builder.mode.value).toBe('weekly')
    expect(builder.weekdays.value).toEqual(['MON', 'WED'])
    expect(builder.summary.value).toContain('monitor.schedules.summaryWeekly')

    cronExpression.value = '0 30 6 1,15 * * *'
    expect(builder.mode.value).toBe('monthly')
    expect(builder.monthDays.value).toEqual([1, 15])
    expect(emitChange).toHaveBeenLastCalledWith({
      complete: true,
      summary: expect.stringContaining('monitor.schedules.summaryMonthly'),
    })

    cronExpression.value = 'outside-builder'
    expect(builder.mode.value).toBe('advanced')
    expect(builder.advancedOutsideBuilder.value).toBe(true)
    expect(emitChange).toHaveBeenLastCalledWith({
      complete: true,
      summary: 'monitor.schedules.summaryAdvanced',
    })
  })

  it('切换每种可视化模式时生成完整表达式，并忽略重复选择', async () => {
    const { builder, cronExpression, emitChange } = createBuilder()
    const cases = [
      ['interval_minutes', '0 */5 * * * * *'],
      ['interval_hours', '0 0 */1 * * * *'],
      ['daily', '0 0 0 * * * *'],
      ['weekly', '0 0 0 * * MON *'],
      ['monthly', '0 0 0 1 * * *'],
      ['yearly', '0 0 0 1 1 * *'],
    ] as const

    for (const [mode, expression] of cases) {
      await builder.handleModeChange(mode)
      expect(builder.mode.value).toBe(mode)
      expect(cronExpression.value).toBe(expression)
      expect(emitChange).toHaveBeenLastCalledWith({
        complete: true,
        summary: expect.stringContaining('monitor.schedules.summary'),
      })
    }

    const callCount = emitChange.mock.calls.length
    await builder.handleModeChange('yearly')
    expect(emitChange).toHaveBeenCalledTimes(callCount)
  })

  it('高级表达式可安全返回可视化模式，无损识别时不要求确认', async () => {
    const { builder, cronExpression, emitChange } = createBuilder()

    await builder.handleModeChange('advanced')
    expect(builder.mode.value).toBe('advanced')
    expect(emitChange).toHaveBeenLastCalledWith({
      complete: true,
      summary: 'monitor.schedules.summaryAdvanced',
    })

    builder.updateAdvancedExpression('0 15 8 * * MON,WED *')
    await builder.handleModeChange('monthly')

    expect(ui.confirm).not.toHaveBeenCalled()
    expect(builder.mode.value).toBe('weekly')
    expect(builder.weekdays.value).toEqual(['MON', 'WED'])
    expect(cronExpression.value).toBe('0 15 8 * * MON,WED *')
  })

  it('覆盖高级表达式覆盖的取消、确认和异常路径', async () => {
    const { builder, cronExpression } = createBuilder()
    builder.loadExpression('0 0 8 1 * MON *')
    expect(builder.mode.value).toBe('advanced')
    expect(builder.advancedOutsideBuilder.value).toBe(true)

    ui.confirm.mockResolvedValueOnce(false)
    await builder.handleModeChange('weekly')
    expect(builder.mode.value).toBe('advanced')
    expect(cronExpression.value).toBe('0 0 8 1 * MON *')

    ui.confirm.mockResolvedValueOnce(true)
    await builder.handleModeChange('weekly')
    expect(builder.mode.value).toBe('weekly')
    expect(cronExpression.value).toBe('0 0 0 * * MON *')

    builder.loadExpression('outside-builder')
    const failure = new Error('dialog unavailable')
    ui.confirm.mockRejectedValueOnce(failure)
    await expect(builder.handleModeChange('daily')).rejects.toBe(failure)
    expect(builder.mode.value).toBe('advanced')
  })

  it('字段更新实时规范化表达式，并将不完整状态上报给表单', async () => {
    const { builder, cronExpression, emitChange } = createBuilder()

    await builder.handleModeChange('interval_minutes')
    builder.updateIntervalMinutes(undefined)
    expect(cronExpression.value).toBe('')
    expect(emitChange).toHaveBeenLastCalledWith({
      complete: false,
      summary: 'monitor.schedules.summaryIncomplete',
    })
    builder.updateIntervalMinutes(12)
    expect(cronExpression.value).toBe('0 */12 * * * * *')

    await builder.handleModeChange('interval_hours')
    builder.updateIntervalHours(3)
    builder.updateMinute(45)
    expect(cronExpression.value).toBe('0 45 */3 * * * *')

    await builder.handleModeChange('daily')
    builder.updateHour(23)
    builder.updateMinute(59)
    expect(cronExpression.value).toBe('0 59 23 * * * *')

    await builder.handleModeChange('weekly')
    builder.updateWeekdays(['FRI', 'MON', 'MON', 'invalid'])
    expect(builder.weekdays.value).toEqual(['MON', 'FRI'])
    expect(cronExpression.value).toBe('0 0 0 * * MON,FRI *')
    builder.updateWeekdays([])
    expect(cronExpression.value).toBe('')

    await builder.handleModeChange('monthly')
    builder.updateMonthDays([31, 2, 2, 0])
    expect(builder.monthDays.value).toEqual([2, 31])
    expect(builder.hasLateMonthDay()).toBe(true)
    expect(cronExpression.value).toBe('0 0 0 2,31 * * *')
    builder.updateMonthDays([])
    expect(cronExpression.value).toBe('')
  })

  it('年度日期随月份收窄，并保留闰日边界', async () => {
    const { builder, cronExpression } = createBuilder()
    await builder.handleModeChange('yearly')

    builder.updateYearlyDay(31)
    builder.updateYearlyMonth(4)
    expect(builder.yearlyDayOptions.value).toHaveLength(30)
    expect(builder.yearlyDay.value).toBe(30)
    expect(cronExpression.value).toBe('0 0 0 30 4 * *')

    builder.updateYearlyMonth(2)
    expect(builder.yearlyDayOptions.value).toHaveLength(29)
    expect(builder.yearlyDay.value).toBe(29)
    expect(cronExpression.value).toBe('0 0 0 29 2 * *')

    builder.updateYearlyDay(28)
    expect(cronExpression.value).toBe('0 0 0 28 2 * *')
  })

  it('模板覆盖各预设，并产生对应的摘要和表达式', () => {
    const { builder, cronExpression, emitChange } = createBuilder()
    const cases = [
      ['every_five_minutes', 'interval_minutes', '0 */5 * * * * *'],
      ['hourly', 'interval_hours', '0 0 */1 * * * *'],
      ['daily_midnight', 'daily', '0 0 0 * * * *'],
      ['daily_two', 'daily', '0 0 2 * * * *'],
      ['weekdays', 'weekly', '0 0 9 * * MON,TUE,WED,THU,FRI *'],
      ['monday', 'weekly', '0 0 0 * * MON *'],
      ['monthly_first', 'monthly', '0 0 0 1 * * *'],
    ] as const

    for (const [template, mode, expression] of cases) {
      builder.applyTemplate(template)
      expect(builder.mode.value).toBe(mode)
      expect(cronExpression.value).toBe(expression)
      expect(emitChange).toHaveBeenLastCalledWith({
        complete: true,
        summary: expect.stringContaining('monitor.schedules.summary'),
      })
    }
  })

  it('加载全部受支持模式并保留无法识别的高级输入', () => {
    const { builder, cronExpression } = createBuilder()
    const cases = [
      ['0 */15 * * * * *', 'interval_minutes'],
      ['0 30 */2 * * * *', 'interval_hours'],
      ['0 5 6 * * * *', 'daily'],
      ['0 5 6 * * FRI,MON *', 'weekly'],
      ['0 5 6 31,1 * * *', 'monthly'],
      ['0 5 6 29 2 * *', 'yearly'],
    ] as const

    for (const [expression, mode] of cases) {
      expect(builder.loadExpression(expression)).toMatchObject({ complete: true })
      expect(builder.mode.value).toBe(mode)
      expect(cronExpression.value).toBe(expression)
    }
    expect(builder.yearlyDayOptions.value).toHaveLength(29)

    expect(builder.loadExpression('custom cron')).toEqual({
      complete: true,
      summary: 'monitor.schedules.summaryAdvanced',
    })
    expect(builder.advancedOutsideBuilder.value).toBe(true)
    expect(builder.loadExpression('   ')).toEqual({
      complete: false,
      summary: 'monitor.schedules.summaryIncomplete',
    })

    builder.updateAdvancedExpression('0 0 0 * * * *')
    expect(builder.advancedOutsideBuilder.value).toBe(false)
    builder.updateAdvancedExpression('invalid')
    expect(builder.advancedOutsideBuilder.value).toBe(true)
    builder.updateAdvancedExpression('   ')
    expect(builder.advancedOutsideBuilder.value).toBe(true)
  })

  it('展示周和月份选项的本地化标签', () => {
    const { builder } = createBuilder()

    expect(builder.weekdayOptions).toHaveLength(7)
    expect(builder.monthOptions).toHaveLength(12)
    expect(builder.allMonthDays).toHaveLength(31)
    expect(builder.weekdayLabel('MON')).toBe('monitor.schedules.weekdayMON')
    expect(builder.monthLabel(12)).toBe('monitor.schedules.monthValue:{"month":12}')
  })
})
