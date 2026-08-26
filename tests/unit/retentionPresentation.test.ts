import { describe, expect, it } from 'vitest'
import {
  countEntries,
  countSummary,
  retentionResourceKey,
  retentionStatusKey,
  retentionStatusTag,
  retentionTriggerKey,
  totalCount,
} from '@/views/monitor/retention/presentation'

describe('数据保留展示模型', () => {
  it('仅保留有限数字并汇总正数资源', () => {
    const counts = { background_jobs: 12, operation_logs: 0, invalid: '1', broken: Infinity }

    expect(countEntries(counts)).toEqual([
      ['background_jobs', 12],
      ['operation_logs', 0],
    ])
    expect(totalCount(counts)).toBe(12)
    expect(countSummary(counts, (key) => `资源:${key}`, String)).toBe('资源:background_jobs 12')
    expect(countSummary(undefined, String, String)).toBe('—')
  })

  it('稳定映射资源、触发方式和状态展示', () => {
    expect(retentionResourceKey('background_jobs')).toBe('monitor.retention.resourceBackgroundJobs')
    expect(retentionResourceKey('unknown')).toBeUndefined()
    expect(retentionTriggerKey('scheduled')).toBe('monitor.retention.triggerScheduled')
    expect(retentionTriggerKey('manual')).toBe('monitor.retention.triggerManual')
    expect(retentionStatusKey('succeeded')).toBe('monitor.retention.statusSucceeded')
    expect(retentionStatusKey('unknown')).toBe('monitor.retention.statusFailed')
    expect(retentionStatusTag('running')).toBe('primary')
    expect(retentionStatusTag('failed')).toBe('danger')
    expect(retentionStatusTag('unknown')).toBe('info')
  })
})
