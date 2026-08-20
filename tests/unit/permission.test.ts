import { describe, expect, it } from 'vitest'

import { hasAllPermissions, hasPermission, matchPermission } from '@/utils/permission'

describe('权限匹配', () => {
  it('只根据服务端权限集合授权', () => {
    expect(hasPermission([], 'system:user:list')).toBe(false)
    expect(hasPermission(['system:user:list'], 'system:user:list')).toBe(true)
    expect(hasPermission(['*:*:*'], 'system:user:list')).toBe(true)
  })

  it('支持受控通配符但拒绝裸星号', () => {
    expect(matchPermission('system:*:list', 'system:user:list')).toBe(true)
    expect(matchPermission('*', 'system:user:list')).toBe(false)
  })

  it('全部权限要求不会因其他角色信息而被绕过', () => {
    expect(hasAllPermissions(
      ['system:user:list'],
      ['system:user:list', 'system:user:edit'],
    )).toBe(false)
  })
})
