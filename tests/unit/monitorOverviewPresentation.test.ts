import { describe, expect, it } from 'vitest'
import type { MonitorOverview, MonitorOverviewTrendBucket } from '@/api/modules/monitor'
import {
  dependencyStatusTranslationKey,
  dependencyTag,
  formatOverviewMemory,
  formatOverviewPercent,
  hasOverviewAccessData,
  hasOverviewScheduleData,
  hasOverviewTrendData,
  overviewAccessSummary,
  overviewJobsSummary,
} from '@/views/monitor/overview/overviewPresentation'

function trendBucket(
  overrides: Partial<MonitorOverviewTrendBucket> = {},
): MonitorOverviewTrendBucket {
  return {
    background_jobs_created: 0,
    login_failure: 0,
    login_success: 0,
    operation_failure: 0,
    operation_success: 0,
    schedule_enqueued: 0,
    schedule_invalid_configuration: 0,
    schedule_skipped_concurrency: 0,
    schedule_skipped_misfire: 0,
    schedule_target_unavailable: 0,
    started_at: '2026-08-26T00:00:00.000Z',
    ...overrides,
  }
}

describe('监控总览展示模型', () => {
  it('归一化依赖状态、百分比和内存展示', () => {
    expect(dependencyStatusTranslationKey('up')).toBe('statusHealthy')
    expect(dependencyStatusTranslationKey('other')).toBe('statusUnknown')
    expect(dependencyTag('degraded')).toBe('warning')
    expect(dependencyTag('down')).toBe('danger')
    expect(formatOverviewPercent(12.5, 'en-US')).toBe('12.5%')
    expect(
      formatOverviewMemory({
        system: { used_memory_gb: 1.25, total_memory_gb: 4 },
      } as MonitorOverview),
    ).toBe('1.25 / 4.00 GiB')
  })

  it('分别识别趋势、调度和访问数据', () => {
    expect(hasOverviewTrendData([trendBucket()])).toBe(false)
    expect(hasOverviewTrendData([trendBucket({ background_jobs_created: 1 })])).toBe(true)
    expect(hasOverviewScheduleData([trendBucket({ schedule_enqueued: 1 })])).toBe(true)
    expect(hasOverviewAccessData([trendBucket({ login_failure: 1 })])).toBe(true)
  })

  it('摘要保持既有标签顺序和聚合值', () => {
    const translate = (key: string) => key.split('.').at(-1) ?? key
    const snapshot = {
      jobs: { pending: 1, running: 2, succeeded: 3, dead: 4 },
    } as MonitorOverview
    expect(overviewJobsSummary(snapshot, translate)).toBe(
      'pending 1；running 2；succeeded 3；dead 4',
    )
    expect(
      overviewAccessSummary(
        [trendBucket({ login_success: 2, login_failure: 1, operation_success: 4 })],
        translate,
      ),
    ).toBe('loginSuccess 2；loginFailure 1；operationSuccess 4；operationFailure 0')
  })
})
