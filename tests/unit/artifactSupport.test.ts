import { createHash } from 'node:crypto'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bindWorkerTool } from '../../scripts/worker-tool.mjs'

import {
  inspectExportArtifact,
  parseArtifactInspection,
  verifyDownloadedExportContent,
} from '../browser-real/artifact-support'

vi.mock('../../scripts/worker-tool.mjs', () => ({ bindWorkerTool: vi.fn() }))

const toolRoot = path.resolve('测试 空间/工具来源 N')
const executable = path.join(toolRoot, 'verified-tool.exe')
const verifyUnchanged = vi.fn()
const binding = {
  backendDir: path.resolve('测试 空间/backend P'),
  runtimeDir: path.resolve('测试 空间/.local-tests/runtime P'),
  workerTool: {
    root: toolRoot,
    binding: {
      path: path.join(toolRoot, '.local-tests', 'frontend-origin-tool.json'),
      bytes: 2,
      sha256: 'a'.repeat(64),
    },
  },
}
const receiptPath = path.join(binding.runtimeDir, '物理对象.json')
beforeEach(() => {
  verifyUnchanged.mockReset()
  vi.mocked(bindWorkerTool).mockReturnValue({
    root: binding.workerTool.root,
    executable,
    verifyUnchanged,
  })
})

describe('导出物理对象验收结果', () => {
  it.each([
    ['snapshot', 'present'],
    ['verify-deleted', 'deleted'],
  ] as const)('%s 执行绑定 N 程序并保留 P 参数和完整前后核验', async (operation, state) => {
    const execute = vi.fn(async () => {
      expect(bindWorkerTool).toHaveBeenCalledWith(binding.workerTool)
      expect(verifyUnchanged).not.toHaveBeenCalled()
      return JSON.stringify({ job_id: '42', state })
    })
    await expect(
      inspectExportArtifact(operation, '42', receiptPath, {
        binding,
        environment: { PATH: 'fixed-path', APP_ENV: 'prod', APP_PASSWORD: 'must-not-pass' },
        execute,
      }),
    ).resolves.toBe(state)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledWith({
      executable,
      arguments: [
        'check',
        'recovery',
        'fixture',
        'artifact',
        operation,
        '--runtime-dir',
        binding.runtimeDir,
        '--job-id',
        '42',
        '--receipt',
        receiptPath,
      ],
      options: {
        cwd: binding.backendDir,
        encoding: 'utf8',
        env: { PATH: 'fixed-path', APP_ENV: 'test' },
        maxBuffer: 64 * 1024,
        timeout: 45_000,
        windowsHide: true,
      },
    })
    expect(verifyUnchanged).toHaveBeenCalledTimes(1)
  })

  it('工具绑定缺失或漂移拒绝时不执行物理对象维护', async () => {
    const failure = new Error('Worker 正式工具绑定无效或漂移')
    vi.mocked(bindWorkerTool).mockImplementationOnce(() => {
      throw failure
    })
    const execute = vi.fn()
    await expect(
      inspectExportArtifact('snapshot', '42', receiptPath, { binding, execute }),
    ).rejects.toBe(failure)
    expect(execute).not.toHaveBeenCalled()
  })

  it.each(['snapshot', 'verify-deleted'] as const)(
    '%s 执行失败仍核验来源且不重放',
    async (operation) => {
      const failure = new Error('native execution failed')
      const execute = vi.fn().mockRejectedValue(failure)
      await expect(
        inspectExportArtifact(operation, '42', receiptPath, { binding, execute }),
      ).rejects.toBe(failure)
      expect(verifyUnchanged).toHaveBeenCalledTimes(1)
      expect(execute).toHaveBeenCalledTimes(1)
    },
  )

  it('执行成功后来源漂移拒绝且不重放 snapshot', async () => {
    const drift = new Error('来源已漂移')
    verifyUnchanged.mockImplementationOnce(() => {
      throw drift
    })
    const execute = vi.fn().mockResolvedValue(JSON.stringify({ job_id: '42', state: 'present' }))
    await expect(
      inspectExportArtifact('snapshot', '42', receiptPath, { binding, execute }),
    ).rejects.toBe(drift)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('执行与来源核验双失败保留两个原因', async () => {
    const primary = new Error('native execution failed')
    const drift = new Error('来源已漂移')
    verifyUnchanged.mockImplementationOnce(() => {
      throw drift
    })
    const execute = vi.fn().mockRejectedValue(primary)
    const failure: unknown = await inspectExportArtifact('snapshot', '42', receiptPath, {
      binding,
      execute,
    }).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(AggregateError)
    if (!(failure instanceof AggregateError)) throw failure
    expect(failure.errors[0]).toBe(primary)
    expect(failure.errors[1]).toBe(drift)
    expect(failure.cause).toBe(drift)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('非法收据失败后仍核验来源', async () => {
    const execute = vi.fn().mockResolvedValue(JSON.stringify({ job_id: '43', state: 'present' }))
    await expect(
      inspectExportArtifact('snapshot', '42', receiptPath, { binding, execute }),
    ).rejects.toThrow('对象清理验收返回了无效结果')
    expect(verifyUnchanged).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledTimes(1)
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
