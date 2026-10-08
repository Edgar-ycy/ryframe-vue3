import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isEmptyPlanConfig } from '@/features/manifest'
import { registeredPageAccessResult } from '@/features/navigation/routeAccess'
import { featureManifests, isBusinessWritePermission } from '@/features/registry'

describe('首批可选能力边界', () => {
  it('前后端能力及变体配置 Schema 完全一致', () => {
    const formal = new URL('../../openapi/openapi.json', import.meta.url)
    const contract: {
      'x-ryframe-product-capabilities': {
        capabilities: { code: string; variants: unknown[] }[]
      }
    } = JSON.parse(readFileSync(formal, 'utf8'))
    const catalog = contract['x-ryframe-product-capabilities'].capabilities
    expect(featureManifests.map((item) => item.capabilityCode).sort()).toEqual([
      'system.message',
      'system.notice',
    ])
    expect(catalog.map((item: { code: string }) => item.code).sort()).toEqual(
      featureManifests.map((item) => item.capabilityCode).sort(),
    )
    for (const manifest of featureManifests) {
      const descriptor = catalog.find(
        (item: { code: string }) => item.code === manifest.capabilityCode,
      )
      if (!descriptor) throw new Error(`缺少能力 ${manifest.capabilityCode}`)
      expect(descriptor.variants).toEqual([
        {
          code: 'standard',
          schema_version: 1,
          config_schema: { type: 'object', properties: {}, additionalProperties: false },
        },
      ])
      expect(manifest.allowedVariants).toEqual(['standard'])
      expect(manifest.validatePlanConfig({})).toBe(true)
    }
  })

  it('拒绝首批能力的额外配置和非对象配置', () => {
    for (const config of [null, [], '', false, { enabled: true }, { limit: 0 }]) {
      expect(isEmptyPlanConfig(config)).toBe(false)
    }
    expect(isEmptyPlanConfig({})).toBe(true)
  })

  it('空能力租户的基础页面继续遵循 RBAC', () => {
    const context = { capabilities: [], multiTenancyEnabled: true, permissions: ['*:*:*'] }
    for (const path of [
      '/system/user',
      '/system/role',
      '/system/menu',
      '/system/dept',
      '/system/dict',
      '/system/config',
      '/system/post',
      '/monitor/jobs',
      '/monitor/schedules',
      '/monitor/online',
    ]) {
      expect(registeredPageAccessResult(path, context)).toBe('allowed')
      expect(registeredPageAccessResult(path, { ...context, permissions: [] })).toBe('forbidden')
    }
    expect(registeredPageAccessResult('/system/notice', context)).toBe('capability-unavailable')
    expect(
      registeredPageAccessResult('/system/notice', {
        ...context,
        capabilities: ['system.notice'],
      }),
    ).toBe('allowed')
  })

  it('岗位的业务写入保护不依赖套餐开关', () => {
    for (const permission of [
      'system:post:add',
      'system:post:edit',
      'system:post:remove',
      'system:post:export',
    ] as const) {
      expect(isBusinessWritePermission(permission)).toBe(true)
    }
    expect(isBusinessWritePermission('system:user:edit')).toBe(false)
    expect(isBusinessWritePermission('system:notice:add')).toBe(false)
  })
})
