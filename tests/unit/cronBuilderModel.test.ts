import { describe, expect, it } from 'vitest'
import {
  createDefaultCronBuilderValues,
  formatCronSummary,
  type CronBuilderValues,
} from '@/views/monitor/schedules/cron/model'

const translate = (key: string, values?: Record<string, unknown>): string =>
  values ? `${key}:${JSON.stringify(values)}` : key

describe('Cron 构建器展示模型', () => {
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
  })
})
