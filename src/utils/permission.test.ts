import { describe, expect, it } from 'vitest'
import { hasAllPermissions, hasPermission, matchPermission } from './permission'

describe('权限匹配', () => {
  it('匹配精确权限、全局权限和限定范围的通配权限', () => {
    expect(matchPermission('system:user:list', 'system:user:list')).toBe(true)
    expect(matchPermission('*:*:*', 'system:user:list')).toBe(true)
    expect(matchPermission('*', 'system:user:list')).toBe(false)
    expect(matchPermission('system:*:list', 'system:user:list')).toBe(true)
    expect(matchPermission('system:role:*', 'system:user:list')).toBe(false)
  })

  it('管理员角色直接放行，并拒绝不完整的权限集合', () => {
    expect(hasPermission([], 'system:user:list', ['admin'])).toBe(true)
    expect(hasPermission(['system:user:list'], ['system:user:list', 'system:role:list'])).toBe(true)
    expect(hasAllPermissions(['system:user:list'], ['system:user:list', 'system:role:list'])).toBe(false)
  })

  it('空权限要求视为公开，并支持管理员和完整权限集合', () => {
    expect(matchPermission('', 'system:user:list')).toBe(false)
    expect(matchPermission('system:user:list', '')).toBe(false)
    expect(hasPermission([], '')).toBe(true)
    expect(hasPermission([], [])).toBe(true)
    expect(hasAllPermissions([], [])).toBe(true)
    expect(hasAllPermissions([], ['system:user:list'], ['admin'])).toBe(true)
    expect(hasAllPermissions(
      ['system:user:list', 'system:role:list'],
      ['system:user:list', 'system:role:list'],
    )).toBe(true)
  })
})
