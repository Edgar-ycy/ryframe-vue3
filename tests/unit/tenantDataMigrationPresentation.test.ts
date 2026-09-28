import { describe, expect, it } from 'vitest'
import type { TenantDataMigrationState } from '@/api/modules/tenantData'
import { blocksNewMigration, shouldPollMigration } from '@/features/tenant-data/presentation'

describe('租户数据迁移终态与轮询', () => {
  it.each<TenantDataMigrationState>(['cancelled', 'finalized', 'failed'])(
    '%s 保留操作记录时仍允许新迁移并停止轮询',
    (state) => {
      for (const cancel_requested of [false, true]) {
        for (const finalize_requested of [false, true]) {
          expect(blocksNewMigration(state)).toBe(false)
          expect(shouldPollMigration({ state, cancel_requested, finalize_requested })).toBe(false)
        }
      }
    },
  )

  it.each<TenantDataMigrationState>([
    'prechecking',
    'queued',
    'quiescing',
    'frozen',
    'copying',
    'verifying',
    'cutting_over',
    'activating',
    'succeeded',
  ])('%s 执行中阻止新迁移并持续读取状态', (state) => {
    expect(blocksNewMigration(state)).toBe(true)
    expect(shouldPollMigration({ state, cancel_requested: false, finalize_requested: false })).toBe(
      true,
    )
  })

  it('保留期仍阻止新迁移，提交清理前停止轮询，提交后恢复轮询', () => {
    expect(blocksNewMigration('retention_pending')).toBe(true)
    expect(
      shouldPollMigration({
        state: 'retention_pending',
        cancel_requested: false,
        finalize_requested: false,
      }),
    ).toBe(false)
    expect(
      shouldPollMigration({
        state: 'retention_pending',
        cancel_requested: false,
        finalize_requested: true,
      }),
    ).toBe(true)
  })
})
