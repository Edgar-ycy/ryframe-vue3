import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  artifactInspectionArguments,
  parseArtifactInspection,
  verifyDownloadedExportContent,
} from '../browser-real/artifact-support'

describe('导出物理对象验收结果', () => {
  it('使用后端脚本声明的目录参数', () => {
    const args = artifactInspectionArguments(
      'D:\\workspace\\backend',
      'D:\\workspace\\runtime',
      'snapshot',
      '42',
      'D:\\workspace\\receipt.json',
    )
    expect(args).toContain('--backend-dir')
    expect(args).not.toContain('--backend-root')
  })

  it.each([
    ['snapshot', 'present'],
    ['verify-deleted', 'pending'],
    ['verify-deleted', 'deleted'],
  ] as const)('接受 %s 操作的 %s 状态', (operation, state) => {
    expect(parseArtifactInspection(JSON.stringify({ job_id: '42', state }), operation, '42')).toBe(
      state,
    )
  })

  it.each([
    ['非 JSON', '{'],
    ['数组', JSON.stringify([{ job_id: '42', state: 'present' }])],
    ['额外字段', JSON.stringify({ job_id: '42', state: 'present', ignored: true })],
    ['错误任务', JSON.stringify({ job_id: '43', state: 'present' })],
  ])('拒绝%s结果', (_label, stdout) => {
    expect(() => parseArtifactInspection(stdout, 'snapshot', '42')).toThrow()
  })

  it.each([
    ['snapshot', 'pending'],
    ['snapshot', 'deleted'],
    ['verify-deleted', 'present'],
    ['verify-deleted', 'unknown'],
  ] as const)('拒绝 %s 操作的 %s 状态', (operation, state) => {
    const stdout = JSON.stringify({ job_id: '42', state })
    expect(() => parseArtifactInspection(stdout, operation, '42')).toThrow(
      '对象清理验收返回了与操作不一致的状态',
    )
  })
})

describe('下载内容与物理对象收据', () => {
  const content = Buffer.from('verified export')
  const receipt = {
    scope_id: 'export-test',
    server_uuid: '12345678-1234-1234-1234-123456789abc',
    database: 'ryframe_export_test',
    job_id: '42',
    file_id: '43',
    key: 'jobs/42.xlsx',
    bucket: 'exports',
    sha256: createHash('sha256').update(content).digest('hex'),
    bytes: content.byteLength,
  }

  it('接受与物理对象摘要一致的下载', () => {
    expect(() =>
      verifyDownloadedExportContent(JSON.stringify(receipt), '42', content),
    ).not.toThrow()
  })

  it.each([
    ['任务不匹配', { ...receipt, job_id: '44' }, content],
    ['字段多余', { ...receipt, ignored: true }, content],
    ['对象键越界', { ...receipt, key: '../outside.xlsx' }, content],
    ['摘要错误', receipt, Buffer.from('corrupt')],
  ])('拒绝%s', (_label, value, downloaded) => {
    expect(() => verifyDownloadedExportContent(JSON.stringify(value), '42', downloaded)).toThrow()
  })
})
