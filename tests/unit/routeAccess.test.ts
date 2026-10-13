import { describe, expect, it } from 'vitest'

import {
  accessResultPath,
  registeredPageAccessResult,
  routeMetaAccessResult,
} from '@/features/navigation/routeAccess'

const emptyContext = {
  capabilities: [],
  multiTenancyEnabled: true,
  permissions: [],
}

describe('页面访问语义', () => {
  it('将已知页面的缺权限、缺能力和未知路由分开', () => {
    expect(registeredPageAccessResult('/system/user', emptyContext)).toBe('forbidden')
    expect(registeredPageAccessResult('/system/service-accounts', emptyContext)).toBe('unknown')
    const feature = { requiredCapabilities: ['example.reports'] }
    expect(routeMetaAccessResult(feature, emptyContext)).toBe('capability-unavailable')
    expect(
      routeMetaAccessResult(feature, { ...emptyContext, capabilities: ['example.reports'] }),
    ).toBe('allowed')
    expect(registeredPageAccessResult('/not-a-real-page', emptyContext)).toBe('unknown')
  })

  it('先拒绝未授权请求，不泄露页面能力配置', () => {
    expect(
      routeMetaAccessResult(
        {
          permission: 'system:user:list',
          requiredCapabilities: ['private.feature'],
          requiresPermission: true,
        },
        emptyContext,
      ),
    ).toBe('forbidden')
  })

  it('为四种结果返回稳定错误页', () => {
    expect(accessResultPath('allowed')).toBeUndefined()
    expect(accessResultPath('forbidden')).toBe('/403')
    expect(accessResultPath('capability-unavailable')).toBe('/feature-unavailable')
    expect(accessResultPath('unknown')).toBe('/404')
  })

  it('单租户隐藏租户和套餐管理，保留配置与数据维护', () => {
    const context = { ...emptyContext, multiTenancyEnabled: false, permissions: ['*:*:*'] }
    expect(registeredPageAccessResult('/platform/tenants', context)).toBe('capability-unavailable')
    expect(registeredPageAccessResult('/platform/product-plans', context)).toBe(
      'capability-unavailable',
    )
    expect(registeredPageAccessResult('/platform/config-transfer', context)).toBe('allowed')
    expect(registeredPageAccessResult('/platform/data-targets', context)).toBe('allowed')
    expect(
      registeredPageAccessResult('/platform/tenants', { ...context, multiTenancyEnabled: true }),
    ).toBe('allowed')
  })
})
