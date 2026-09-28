import { isProxy, reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import type { TenantDataMigrationPreview } from '@/api/modules/tenantData'
import { snapshotTenantDataMigrationPreview } from '@/views/platform/tenant/components/tenantDataMigrationCommand'

function preview(): TenantDataMigrationPreview {
  return {
    blockers: [],
    eligible: true,
    expected_placement_generation: 'generation-1',
    impact: {
      catalog_table_count: 2,
      retention_hours: 168,
      rollback_boundary: 'backup-1',
      stop_write: true,
    },
    plan_hash: 'plan-1',
    source_target_key: 'source',
    target_generation: 'target-generation-1',
    target_target_key: 'target',
    tenant_id: 'tenant-1',
    warnings: ['确认窗口'],
  }
}

describe('租户数据迁移创建快照', () => {
  it('接受响应式预览并隔离嵌套影响与提示的后续修改', () => {
    const current = reactive(preview())
    const snapshot = snapshotTenantDataMigrationPreview(current)
    current.impact.retention_hours = 24
    current.warnings.push('后续提示')
    current.plan_hash = 'plan-2'

    expect(snapshot).toEqual(preview())
    expect(isProxy(snapshot)).toBe(false)
    expect(isProxy(snapshot.impact)).toBe(false)
  })
})
