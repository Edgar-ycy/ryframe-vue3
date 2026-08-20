import { describe, expect, it } from 'vitest'

import {
  accessResultPath,
  registeredPageAccessResult,
  routeMetaAccessResult,
} from '@/router/routeAccess'

const emptyContext = {
  capabilities: [],
  multiTenancyEnabled: true,
  permissions: [],
}

describe('页面访问语义', () => {
  it('将已知页面的缺权限、缺能力和未知路由分开', () => {
    expect(registeredPageAccessResult('/system/user', emptyContext)).toBe('forbidden')
    expect(registeredPageAccessResult('/system/service-accounts', {
      ...emptyContext,
      permissions: ['system:service-account:list'],
    })).toBe('capability-unavailable')
    expect(registeredPageAccessResult('/system/service-accounts', {
      ...emptyContext,
      capabilities: ['system.service_accounts'],
      permissions: ['system:service-account:list'],
    })).toBe('allowed')
    expect(registeredPageAccessResult('/not-a-real-page', emptyContext)).toBe('unknown')
  })

  it('先拒绝未授权请求，不泄露页面能力配置', () => {
    expect(routeMetaAccessResult({
      permission: 'system:user:list',
      requiredCapabilities: ['private.feature'],
      requiresPermission: true,
    }, emptyContext)).toBe('forbidden')
  })

  it('为四种结果返回稳定错误页', () => {
    expect(accessResultPath('allowed')).toBeUndefined()
    expect(accessResultPath('forbidden')).toBe('/403')
    expect(accessResultPath('capability-unavailable')).toBe('/feature-unavailable')
    expect(accessResultPath('unknown')).toBe('/404')
  })
})
