import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bindWorkerTool } from '../browser-real/worker-tool.mjs'

import {
  migrationHistory,
  migrationHistoryArguments,
  parseMigrationHistoryReceipt,
} from '../support/migration-history'

vi.mock('../browser-real/worker-tool.mjs', () => ({ bindWorkerTool: vi.fn() }))

const toolRoot = path.resolve('测试 空间/工具来源 N')
const executable = path.join(toolRoot, 'verified-tool.exe')
const verifyUnchanged = vi.fn()
const workerTool = {
  root: toolRoot,
  binding: {
    path: path.join(toolRoot, '.local-tests', 'frontend-origin-tool.json'),
    bytes: 2,
    sha256: 'a'.repeat(64),
  },
}
beforeEach(() => {
  verifyUnchanged.mockReset()
  vi.mocked(bindWorkerTool).mockReturnValue({ executable, verifyUnchanged })
})

describe('迁移历史夹具命令', () => {
  const runtime = 'D:\\项目 空间\\.local-tests\\运行目录'
  const tenant = 'tenant-1234abcd'
  const migration = '43'
  const planSha256 = 'a'.repeat(64)
  const backend = path.resolve('测试 空间/backend O')
  const runtimeRoot = path.resolve('测试 空间/.local-tests/runtime O')
  const binding = {
    backendDir: backend,
    runtimeDir: runtimeRoot,
    scopeId: 'retention-test',
    workerTool,
  }

  it.each([
    ['inspect', undefined, []],
    ['plan-history', undefined, []],
    ['historical-expired', planSha256, ['--plan-sha256', planSha256, '--write']],
    ['export-backup', undefined, ['--write']],
    ['verify-cleaned', undefined, []],
  ] as const)('通过原生维护参数执行 %s', (operation, plan, suffix) => {
    const args = migrationHistoryArguments(runtime, operation, tenant, migration, plan)
    expect(args).toEqual([
      'check',
      'recovery',
      'fixture',
      'retention',
      operation,
      '--runtime-dir',
      runtime,
      '--tenant',
      tenant,
      '--migration',
      migration,
      ...suffix,
    ])
  })

  it('执行绑定 N 程序并保留 O cwd、运行目录和受控环境，解析唯一收据', async () => {
    const execute = vi.fn(
      async () =>
        `历史保留期 fixture\n${JSON.stringify({
          migration_id: migration,
          scope_id: 'retention-test',
          tenant_id: tenant,
        })}\n✓ 0.1s\n`,
    )

    await expect(
      migrationHistory('inspect', tenant, migration, undefined, {
        binding,
        environment: { PATH: 'fixed-path', APP_ENV: 'prod', APP_PASSWORD: 'must-not-pass' },
        execute,
      }),
    ).resolves.toMatchObject({ migration_id: migration, scope_id: 'retention-test' })
    expect(execute).toHaveBeenCalledWith({
      executable,
      arguments: migrationHistoryArguments(runtimeRoot, 'inspect', tenant, migration),
      options: {
        cwd: backend,
        encoding: 'utf8',
        env: { PATH: 'fixed-path', APP_ENV: 'test' },
        maxBuffer: 256 * 1024,
        timeout: 150_000,
        windowsHide: true,
      },
    })
    expect(bindWorkerTool).toHaveBeenCalledWith(workerTool)
    expect(verifyUnchanged).toHaveBeenCalledTimes(1)
  })

  it('来源核验成功时保持原始执行错误', async () => {
    const failure = new Error('native execution failed')
    const root = path.resolve('测试 空间')
    await expect(
      migrationHistory('inspect', tenant, migration, undefined, {
        binding: {
          backendDir: path.join(root, 'backend'),
          runtimeDir: path.join(root, '.local-tests', 'runtime'),
          scopeId: 'retention-test',
          workerTool,
        },
        execute: () => Promise.reject(failure),
      }),
    ).rejects.toBe(failure)
    expect(verifyUnchanged).toHaveBeenCalledTimes(1)
  })

  it('来源绑定拒绝时不执行维护命令', async () => {
    const failure = new Error('来源绑定拒绝')
    vi.mocked(bindWorkerTool).mockImplementationOnce(() => {
      throw failure
    })
    const execute = vi.fn()
    await expect(
      migrationHistory('export-backup', tenant, migration, undefined, { binding, execute }),
    ).rejects.toBe(failure)
    expect(execute).not.toHaveBeenCalled()
  })

  it('写操作执行后来源漂移拒绝，且不重放未知写入', async () => {
    const drift = new Error('来源已漂移')
    verifyUnchanged.mockImplementationOnce(() => {
      throw drift
    })
    const execute = vi.fn().mockResolvedValue(
      JSON.stringify({
        scope_id: binding.scopeId,
        tenant_id: tenant,
        migration_id: migration,
      }),
    )
    await expect(
      migrationHistory('export-backup', tenant, migration, undefined, { binding, execute }),
    ).rejects.toBe(drift)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('同时保留维护执行与来源核验失败的原始原因', async () => {
    const primary = new Error('native execution failed')
    const drift = new Error('来源已漂移')
    verifyUnchanged.mockImplementationOnce(() => {
      throw drift
    })
    const execute = vi.fn().mockRejectedValue(primary)
    const failure: unknown = await migrationHistory('inspect', tenant, migration, undefined, {
      binding,
      execute,
    }).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(AggregateError)
    if (!(failure instanceof AggregateError)) throw failure
    expect(failure.errors[0]).toBe(primary)
    expect(failure.errors[1]).toBe(drift)
    expect(execute).toHaveBeenCalledTimes(1)
  })
})

describe('迁移历史原生收据', () => {
  const expected = ['retention-test', 'tenant-1234abcd', '43'] as const

  it('接受日志后的唯一匹配对象', () => {
    const receipt = { migration_id: expected[2], scope_id: expected[0], tenant_id: expected[1] }
    expect(
      parseMigrationHistoryReceipt(
        `Running fixture\n${JSON.stringify(receipt)}\n✓ 0.1s\n`,
        ...expected,
      ),
    ).toEqual(receipt)
  })

  it.each([
    ['缺失', 'Running fixture\n'],
    ['多个', '{}\n{}\n'],
    ['非对象', '[]\n'],
    ['尾随破损', '{}\n{"unfinished"\n'],
  ])('拒绝%s JSON 收据', (_label, stdout) => {
    expect(() => parseMigrationHistoryReceipt(stdout, ...expected)).toThrow()
  })

  it('拒绝其他 scope、租户或迁移', () => {
    const receipt = { migration_id: '44', scope_id: expected[0], tenant_id: expected[1] }
    expect(() => parseMigrationHistoryReceipt(JSON.stringify(receipt), ...expected)).toThrow(
      '历史保留期 fixture 返回了其他运行、租户或迁移的收据',
    )
  })
})
