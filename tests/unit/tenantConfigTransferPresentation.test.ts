import { describe, expect, it, vi } from 'vitest'
import type { TenantConfigBundle, TenantConfigTransfer } from '@/api/modules/tenantConfigTransfer'
import {
  canApplyTenantConfigTransfer,
  canDownloadTenantConfigPackage,
  canPreviewTenantConfigTransfer,
  canRollbackTenantConfigTransfer,
  tenantConfigResourceCounts,
  tenantConfigResourceLabel,
} from '@/views/system/config-transfer/presentation'

function transfer(status: string, extra: Partial<TenantConfigTransfer> = {}): TenantConfigTransfer {
  return {
    status,
    change_counts: {},
    ...extra,
  } as TenantConfigTransfer
}

function bundle(status: string, extra: Partial<TenantConfigBundle> = {}): TenantConfigBundle {
  return { status, resource_counts: {}, ...extra } as TenantConfigBundle
}

describe('租户配置迁移展示模型', () => {
  it('只允许无冲突且带计划摘要的成功预览进入应用', () => {
    expect(
      canApplyTenantConfigTransfer(
        transfer('previewed', { plan_hash: 'hash', change_counts: { blocked: 0, conflict: 0 } }),
      ),
    ).toBe(true)
    expect(
      canApplyTenantConfigTransfer(
        transfer('previewed', { plan_hash: 'hash', change_counts: { conflict: 1 } }),
      ),
    ).toBe(false)
    expect(canApplyTenantConfigTransfer(transfer('previewed'))).toBe(false)
  })

  it('按服务端状态与浏览器时间投影预览、回滚和下载能力', () => {
    expect(canPreviewTenantConfigTransfer(transfer('failed'))).toBe(true)
    expect(canPreviewTenantConfigTransfer(transfer('applying'))).toBe(false)
    expect(
      canRollbackTenantConfigTransfer(
        transfer('applied', { rollback_expires_at: '2026-08-26T00:01:00Z' }),
        Date.parse('2026-08-26T00:00:00Z'),
      ),
    ).toBe(true)
    expect(
      canDownloadTenantConfigPackage(
        bundle('succeeded', { expires_at: '2026-08-25T23:59:00Z' }),
        Date.parse('2026-08-26T00:00:00Z'),
      ),
    ).toBe(false)
  })

  it('过滤非数值计数并复用资源本地化映射', () => {
    const t = vi.fn((key: string) => key)
    const input = bundle('succeeded', {
      resource_counts: {
        posts: 2,
        menus: 3,
        ignored: null,
      } as unknown as TenantConfigBundle['resource_counts'],
    })

    expect(tenantConfigResourceCounts(input)).toEqual([
      ['posts', 2],
      ['menus', 3],
    ])
    expect(tenantConfigResourceLabel('posts', t)).toBe('tenantConfigTransfer.resourcePosts')
    expect(tenantConfigResourceLabel('custom', t)).toBe('custom')
  })
})
