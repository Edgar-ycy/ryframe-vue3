import { describe, expect, it } from 'vitest'
import type { ExportJob } from '@/api/modules/exportJob'
import {
  areAllExportJobsSelected,
  areSomeExportJobsSelected,
  terminalExportJobIds,
  updateExportJobSelection,
  updateVisibleExportJobSelection,
} from '@/views/profile/exports/components/exportJobSelection'

function exportJob(id: string, status: string): ExportJob {
  return {
    id,
    resource: 'users',
    status,
    created_at: '2026-08-26T00:00:00.000Z',
    matched_rows: 1,
    snapshot_at: '2026-08-26T00:00:00.000Z',
    updated_at: '2026-08-26T00:00:00.000Z',
  }
}

describe('导出任务选择模型', () => {
  it('只把可删除的可见任务纳入全选状态', () => {
    const ids = terminalExportJobIds(
      [exportJob('done', 'succeeded'), exportJob('active', 'running')],
      (status) => status === 'succeeded',
    )
    expect(ids).toEqual(['done'])
    expect(areAllExportJobsSelected(ids, ['done'])).toBe(true)
    expect(areSomeExportJobsSelected(['done', 'failed'], ['done'])).toBe(true)
  })

  it('单选和可见全选保持已有选择顺序且不会重复', () => {
    expect(updateExportJobSelection(['a'], 'a', true)).toEqual(['a'])
    expect(updateExportJobSelection(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(updateExportJobSelection(['a', 'b'], 'a', false)).toEqual(['b'])
    expect(updateVisibleExportJobSelection(['hidden'], ['a', 'b'], true)).toEqual([
      'hidden',
      'a',
      'b',
    ])
    expect(updateVisibleExportJobSelection(['hidden', 'a'], ['a'], false)).toEqual(['hidden'])
  })
})
