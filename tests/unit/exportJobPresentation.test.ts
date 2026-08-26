import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ExportJob } from '@/api/modules/exportJob'
import {
  exportJobDisplayName,
  exportJobResourceKey,
  exportJobStatusKey,
  exportJobStatusTag,
  formatExportFileSize,
  isExportDownloadExpired,
} from '@/app/exports/exportJobPresentation'

function exportJob(overrides: Partial<ExportJob> = {}): ExportJob {
  return {
    id: 'job-1',
    resource: 'users',
    status: 'queued',
    created_at: '2026-08-20T00:00:00.000Z',
    matched_rows: 0,
    snapshot_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-20T00:00:00.000Z',
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('导出任务展示规则', () => {
  it('为已知和未知资源、状态返回稳定翻译键', () => {
    expect(exportJobResourceKey('users')).toBe('exportCenter.resourceUsers')
    expect(exportJobResourceKey('future-resource')).toBe('exportCenter.resourceUnknown')
    expect(exportJobStatusKey('succeeded')).toBe('exportCenter.succeeded')
    expect(exportJobStatusKey('future-status')).toBe('exportCenter.unknown')
  })

  it.each([
    ['queued', 'info'],
    ['running', 'primary'],
    ['succeeded', 'success'],
    ['cancelled', 'warning'],
    ['expired', 'warning'],
    ['failed', 'danger'],
    ['future-status', 'danger'],
  ] as const)('将状态 %s 映射为 %s 标签', (status, tag) => {
    expect(exportJobStatusTag(status)).toBe(tag)
  })

  it('按 B、KiB、MiB 边界格式化文件大小', () => {
    expect(formatExportFileSize(undefined)).toBe('—')
    expect(formatExportFileSize(-1)).toBe('—')
    expect(formatExportFileSize(1023)).toBe('1023 B')
    expect(formatExportFileSize(1024)).toBe('1.0 KiB')
    expect(formatExportFileSize(1024 * 1024)).toBe('1.0 MiB')
  })

  it('以任务状态和服务端过期时间判定下载是否过期', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))

    expect(isExportDownloadExpired(exportJob({ status: 'expired' }))).toBe(true)
    expect(isExportDownloadExpired(exportJob({ expires_at: '2026-08-20T12:00:00.000Z' }))).toBe(
      true,
    )
    expect(isExportDownloadExpired(exportJob({ expires_at: '2026-08-20T12:00:01.000Z' }))).toBe(
      false,
    )
    expect(isExportDownloadExpired(exportJob({ expires_at: null }))).toBe(false)
  })

  it('优先显示服务端生成的文件名', () => {
    expect(exportJobDisplayName(exportJob({ result_file_name: '用户报表.xlsx' }))).toBe(
      '用户报表.xlsx',
    )
  })
})
