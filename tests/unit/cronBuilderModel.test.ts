import { describe, expect, it } from 'vitest'
import {
  ALL_MONTH_DAYS,
  MONTH_OPTIONS,
  WEEKDAY_OPTIONS,
  buildCronExpression,
  createDefaultCronBuilderValues,
  daysInMonth,
  formatCronSummary,
  hasLateMonthDay,
  isValidCronTime,
  normalizeMonthDays,
  normalizeWeekdays,
  padCronTime,
  range,
  recognizeCronExpression,
  type CronBuilderValues,
} from '@/views/monitor/schedules/cron/model'

const translate = (key: string, values?: Record<string, unknown>): string =>
  values ? `${key}:${JSON.stringify(values)}` : key

describe('Cron 构建器展示模型', () => {
  it('提供稳定的选项、默认值和日期边界', () => {
    expect(WEEKDAY_OPTIONS).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
    expect(ALL_MONTH_DAYS).toEqual(range(1, 31))
    expect(MONTH_OPTIONS).toEqual(range(1, 12))
    expect(createDefaultCronBuilderValues()).toMatchObject({
      intervalMinutes: 5,
      intervalHours: 1,
      hour: 0,
      minute: 0,
      yearlyMonth: 1,
      yearlyDay: 1,
    })
    expect(padCronTime(undefined)).toBe('00')
    expect(padCronTime(9)).toBe('09')
    expect(daysInMonth(2)).toBe(29)
    expect(daysInMonth(4)).toBe(30)
    expect(daysInMonth(1)).toBe(31)
  })

  it('生成常用模式的摘要参数', () => {
    const values = createDefaultCronBuilderValues()

    expect(formatCronSummary('interval_minutes', values, '', translate)).toBe(
      'monitor.schedules.summaryIntervalMinutes:{"minutes":5}',
    )
    expect(formatCronSummary('daily', values, '', translate)).toBe(
      'monitor.schedules.summaryDaily:{"time":"00:00"}',
    )
    expect(formatCronSummary('weekly', values, '', translate)).toContain(
      'monitor.schedules.weekdayMON',
    )
    expect(formatCronSummary('interval_hours', values, '', translate)).toContain('"hours":1')
    expect(formatCronSummary('monthly', values, '', translate)).toContain('"days":"1"')
    expect(formatCronSummary('yearly', values, '', translate)).toContain('"month":1')
  })

  it('对不完整模式和高级表达式使用稳定摘要', () => {
    const incomplete: CronBuilderValues = {
      ...createDefaultCronBuilderValues(),
      hour: undefined,
    }

    expect(formatCronSummary('daily', incomplete, '', translate)).toBe(
      'monitor.schedules.summaryIncomplete',
    )
    expect(formatCronSummary('advanced', incomplete, '0 0 * * * * *', translate)).toBe(
      'monitor.schedules.summaryAdvanced',
    )
    expect(formatCronSummary('advanced', incomplete, '   ', translate)).toBe(
      'monitor.schedules.summaryIncomplete',
    )
    expect(
      formatCronSummary('interval_minutes', { ...incomplete, intervalMinutes: 0 }, '', translate),
    ).toBe('monitor.schedules.summaryIncomplete')
    expect(
      formatCronSummary(
        'interval_hours',
        { ...incomplete, intervalHours: undefined },
        '',
        translate,
      ),
    ).toBe('monitor.schedules.summaryIncomplete')
    expect(
      formatCronSummary('weekly', { ...incomplete, hour: 0, weekdays: [] }, '', translate),
    ).toBe('monitor.schedules.summaryIncomplete')
    expect(
      formatCronSummary('monthly', { ...incomplete, hour: 0, monthDays: [] }, '', translate),
    ).toBe('monitor.schedules.summaryIncomplete')
    expect(
      formatCronSummary(
        'yearly',
        { ...incomplete, hour: 0, yearlyMonth: 2, yearlyDay: 30 },
        '',
        translate,
      ),
    ).toBe('monitor.schedules.summaryIncomplete')
  })

  it('校验时间并规范化多选值', () => {
    expect(isValidCronTime({ hour: 23, minute: 59 })).toBe(true)
    expect(isValidCronTime({ hour: undefined, minute: 0 })).toBe(false)
    expect(isValidCronTime({ hour: -1, minute: 0 })).toBe(false)
    expect(isValidCronTime({ hour: 24, minute: 0 })).toBe(false)
    expect(isValidCronTime({ hour: 0, minute: undefined })).toBe(false)
    expect(isValidCronTime({ hour: 0, minute: -1 })).toBe(false)
    expect(isValidCronTime({ hour: 0, minute: 60 })).toBe(false)
    expect(normalizeWeekdays(['FRI', 'MON', 'FRI', 'invalid'])).toEqual(['MON', 'FRI'])
    expect(normalizeMonthDays([31, 2, 2, 0, 32, 1.5])).toEqual([2, 31])
    expect(hasLateMonthDay([1, 28])).toBe(false)
    expect(hasLateMonthDay([29])).toBe(true)
  })
})

describe('Cron 表达式生成与识别', () => {
  const defaults = createDefaultCronBuilderValues()

  it('生成所有可视化模式和高级模式', () => {
    expect(buildCronExpression('interval_minutes', defaults, '')).toBe('0 */5 * * * * *')
    expect(buildCronExpression('interval_hours', defaults, '')).toBe('0 0 */1 * * * *')
    expect(buildCronExpression('daily', defaults, '')).toBe('0 0 0 * * * *')
    expect(buildCronExpression('weekly', defaults, '')).toBe('0 0 0 * * MON *')
    expect(buildCronExpression('monthly', defaults, '')).toBe('0 0 0 1 * * *')
    expect(buildCronExpression('yearly', defaults, '')).toBe('0 0 0 1 1 * *')
    expect(buildCronExpression('advanced', defaults, '  0 1 * * * * *  ')).toBe('0 1 * * * * *')
  })

  it('拒绝各模式越界或缺失字段', () => {
    expect(
      buildCronExpression('interval_minutes', { ...defaults, intervalMinutes: 0 }, ''),
    ).toBeUndefined()
    expect(
      buildCronExpression('interval_minutes', { ...defaults, intervalMinutes: 60 }, ''),
    ).toBeUndefined()
    expect(
      buildCronExpression('interval_hours', { ...defaults, intervalHours: 0 }, ''),
    ).toBeUndefined()
    expect(
      buildCronExpression('interval_hours', { ...defaults, intervalHours: 24 }, ''),
    ).toBeUndefined()
    expect(
      buildCronExpression('interval_hours', { ...defaults, minute: undefined }, ''),
    ).toBeUndefined()
    expect(buildCronExpression('interval_hours', { ...defaults, minute: 60 }, '')).toBeUndefined()
    expect(buildCronExpression('daily', { ...defaults, hour: 24 }, '')).toBeUndefined()
    expect(buildCronExpression('weekly', { ...defaults, weekdays: [] }, '')).toBeUndefined()
    expect(buildCronExpression('monthly', { ...defaults, monthDays: [] }, '')).toBeUndefined()
    expect(
      buildCronExpression('yearly', { ...defaults, yearlyMonth: 2, yearlyDay: 30 }, ''),
    ).toBeUndefined()
    expect(buildCronExpression('advanced', defaults, '   ')).toBeUndefined()
  })

  it('识别所有受支持模式', () => {
    expect(recognizeCronExpression('0 */15 * * * * *')).toEqual({
      mode: 'interval_minutes',
      intervalMinutes: 15,
    })
    expect(recognizeCronExpression('0 30 */2 * * * *')).toEqual({
      mode: 'interval_hours',
      intervalHours: 2,
      minute: 30,
    })
    expect(recognizeCronExpression('0 5 6 * * * *')).toEqual({
      mode: 'daily',
      hour: 6,
      minute: 5,
    })
    expect(recognizeCronExpression('0 5 6 * * fri,mon *')).toMatchObject({
      mode: 'weekly',
      weekdays: ['MON', 'FRI'],
    })
    expect(recognizeCronExpression('0 5 6 31,1 * * *')).toMatchObject({
      mode: 'monthly',
      monthDays: [1, 31],
    })
    expect(recognizeCronExpression('0 5 6 29 2 * *')).toEqual({
      mode: 'yearly',
      hour: 6,
      minute: 5,
      yearlyMonth: 2,
      yearlyDay: 29,
    })
  })

  it.each([
    '',
    '0 0 0 * * *',
    '1 0 0 * * * *',
    '0 */0 * * * * *',
    '0 60 */2 * * * *',
    '0 0 24 * * * *',
    '0 0 0 * * FOO *',
    '0 0 0 1,bad * * *',
    '0 0 0 30 2 * *',
    '0 0 0 1 1 MON *',
  ])('拒绝无法安全映射到构建器的表达式：%s', (expression) => {
    expect(recognizeCronExpression(expression)).toBeUndefined()
  })
})
