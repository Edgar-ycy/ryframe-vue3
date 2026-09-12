import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  artifactInspectionArguments,
  artifactInspectionInvocation,
  parseArtifactInspection,
  verifyDownloadedExportContent,
} from '../browser-real/artifact-support'
import { parseXtaskJsonReceipt } from '../support/xtask-receipt'

describe('导出物理对象验收结果', () => {
  const backend = 'D:\\工作 空间\\backend'
  const runtime = 'D:\\工作 空间\\.local-tests\\runtime'
  const python = 'D:\\工具 目录\\python.exe'
  const receipt = 'D:\\工作 空间\\.local-tests\\物理对象.json'

  it.each(['snapshot', 'verify-deleted'] as const)(
    '通过固定 cargo xtask 参数执行 %s 且不传公开写入参数',
    (operation) => {
      const args = artifactInspectionArguments(runtime, operation, '42', receipt)
      expect(args).toEqual([
        'xtask',
        'check',
        'recovery',
        'fixture',
        'artifact',
        operation,
        '--runtime-dir',
        runtime,
        '--job-id',
        '42',
        '--receipt',
        receipt,
      ])
      expect(args).not.toContain('--write')
      expect(args.every((value) => !value.endsWith('.py'))).toBe(true)
    },
  )

  it('从后端 cwd 执行并将已登记 Python 映射给 xtask', () => {
    const invocation = artifactInspectionInvocation(
      backend,
      runtime,
      python,
      'snapshot',
      '42',
      receipt,
      { PATH: 'fixed-path' },
    )
    expect(invocation.executable).toBe('cargo')
    expect(invocation.arguments).toEqual(
      artifactInspectionArguments(runtime, 'snapshot', '42', receipt),
    )
    expect(invocation.options.cwd).toBe(backend)
    expect(invocation.options.env).toEqual({ PATH: 'fixed-path', RYFRAME_PYTHON: python })
  })

  it.each([
    ['snapshot', 'present'],
    ['verify-deleted', 'pending'],
    ['verify-deleted', 'deleted'],
  ] as const)('接受 %s 操作的 %s 状态', (operation, state) => {
    const stdout = `Compiling xtask\n${JSON.stringify({ job_id: '42', state })}\n✓ 0.1s\n`
    expect(parseArtifactInspection(stdout, operation, '42')).toBe(state)
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

describe('xtask JSON 收据提取', () => {
  it('接受前后执行日志之间的唯一对象', () => {
    expect(
      parseXtaskJsonReceipt('Compiling xtask\n执行 fixture\n{"state":"ok"}\n✓ 0.1s\n'),
    ).toEqual({ state: 'ok' })
  })

  it.each([
    ['缺少 JSON', 'Compiling xtask\n执行 fixture\n'],
    ['多个 JSON', '{"first":true}\n{"second":true}\n'],
    ['数组', '[{"state":"ok"}]\n'],
    ['尾随破损', '{"state":"ok"}\n{"unfinished"\n'],
  ])('拒绝%s', (_label, stdout) => {
    expect(() => parseXtaskJsonReceipt(stdout)).toThrow()
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
