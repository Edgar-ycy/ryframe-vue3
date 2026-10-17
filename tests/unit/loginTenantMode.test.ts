import { describe, expect, it } from 'vitest'
import {
  resolveLoginTenantId,
  showLoginTenantSelector,
  type LoginTenantCapabilities,
} from '@/views/login/loginState'

const unknown: LoginTenantCapabilities = {
  loaded: false,
  multiTenancyEnabled: false,
}
const singleTenant: LoginTenantCapabilities = {
  loaded: true,
  multiTenancyEnabled: false,
}
const multiTenant: LoginTenantCapabilities = {
  loaded: true,
  multiTenancyEnabled: true,
}

describe('登录租户模式', () => {
  it('运行能力未加载时不显示租户选择，也不推断租户', () => {
    expect(showLoginTenantSelector(unknown)).toBe(false)
    expect(resolveLoginTenantId('tenant-a', unknown, 'system')).toBe('')
  })

  it('单租户模式隐藏租户选择并使用系统租户', () => {
    expect(showLoginTenantSelector(singleTenant)).toBe(false)
    expect(resolveLoginTenantId('tenant-a', singleTenant, 'system')).toBe('system')
  })

  it('多租户模式显示租户选择并规范化用户输入', () => {
    expect(showLoginTenantSelector(multiTenant)).toBe(true)
    expect(resolveLoginTenantId(' tenant-a ', multiTenant, 'system')).toBe('tenant-a')
  })
})
