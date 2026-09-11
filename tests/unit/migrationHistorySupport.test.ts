import { describe, expect, it } from 'vitest'

import { migrationHistoryArguments } from '../browser-device/migration-history'

describe('迁移历史夹具命令', () => {
  it('使用后端脚本声明的目录参数', () => {
    const args = migrationHistoryArguments(
      'D:\\workspace\\backend',
      'D:\\workspace\\runtime',
      'inspect',
      '42',
      '43',
    )
    expect(args).toContain('--backend-dir')
    expect(args).not.toContain('--backend-root')
    expect(args).not.toContain('--write')
  })

  it.each(['historical-expired', 'export-backup'] as const)(
    '为写操作 %s 显式传递授权',
    (operation) => {
      const args = migrationHistoryArguments(
        'D:\\workspace\\backend',
        'D:\\workspace\\runtime',
        operation,
        '42',
        '43',
      )
      expect(args.filter((value) => value === '--write')).toHaveLength(1)
    },
  )
})
