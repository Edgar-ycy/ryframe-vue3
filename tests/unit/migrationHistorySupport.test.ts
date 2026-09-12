import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  migrationHistory,
  migrationHistoryArguments,
  parseMigrationHistoryReceipt,
} from '../browser-device/migration-history'

describe('迁移历史夹具命令', () => {
  const runtime = 'D:\\项目 空间\\.local-tests\\运行目录'
  const tenant = 'tenant-1234abcd'
  const migration = '43'
  const planSha256 = 'a'.repeat(64)

  it.each([
    ['inspect', undefined, []],
    ['plan-history', undefined, []],
    ['historical-expired', planSha256, ['--plan-sha256', planSha256, '--write']],
    ['export-backup', undefined, ['--write']],
    ['verify-cleaned', undefined, []],
  ] as const)('通过固定 cargo xtask 参数执行 %s', (operation, plan, suffix) => {
    const args = migrationHistoryArguments(runtime, operation, tenant, migration, plan)
    expect(args).toEqual([
      'xtask',
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
    expect(args.every((value) => !value.endsWith('.py'))).toBe(true)
  })

  it('从后端 cwd 执行、映射 Python 并解析日志后的唯一收据', async () => {
    const backend = path.resolve('测试 空间/backend')
    const runtimeRoot = path.resolve('测试 空间/.local-tests/runtime')
    const python = path.resolve('测试 工具/python')
    const environment = {
      PATH: 'fixed-path',
      RYFRAME_E2E_BACKEND_DIR: backend,
      RYFRAME_E2E_PYTHON: python,
      RYFRAME_E2E_RUNTIME_DIR: runtimeRoot,
      RYFRAME_E2E_SCOPE_ID: 'retention-test',
    }
    const execute = vi.fn(
      async () =>
        `Compiling xtask\n${JSON.stringify({
          migration_id: migration,
          scope_id: 'retention-test',
          tenant_id: tenant,
        })}\n✓ 0.1s\n`,
    )

    await expect(
      migrationHistory('inspect', tenant, migration, undefined, { environment, execute }),
    ).resolves.toMatchObject({ migration_id: migration, scope_id: 'retention-test' })
    expect(execute).toHaveBeenCalledWith({
      executable: 'cargo',
      arguments: migrationHistoryArguments(runtimeRoot, 'inspect', tenant, migration),
      options: {
        cwd: backend,
        encoding: 'utf8',
        env: { ...environment, RYFRAME_PYTHON: python },
        maxBuffer: 256 * 1024,
        timeout: 150_000,
        windowsHide: true,
      },
    })
  })

  it('保持 cargo xtask 的原始执行错误', async () => {
    const failure = new Error('xtask failed')
    const root = path.resolve('测试 空间')
    await expect(
      migrationHistory('inspect', tenant, migration, undefined, {
        environment: {
          RYFRAME_E2E_BACKEND_DIR: path.join(root, 'backend'),
          RYFRAME_E2E_PYTHON: path.join(root, 'python'),
          RYFRAME_E2E_RUNTIME_DIR: path.join(root, '.local-tests', 'runtime'),
          RYFRAME_E2E_SCOPE_ID: 'retention-test',
        },
        execute: () => Promise.reject(failure),
      }),
    ).rejects.toBe(failure)
  })
})

describe('迁移历史 xtask 收据', () => {
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
