import { describe, expect, it } from 'vitest'
import { hasAllPermissions, hasPermission, matchPermission } from './permission'

describe('permission matching', () => {
  it('matches exact, global, and scoped wildcard permissions', () => {
    expect(matchPermission('system:user:list', 'system:user:list')).toBe(true)
    expect(matchPermission('*:*:*', 'system:user:list')).toBe(true)
    expect(matchPermission('system:*:list', 'system:user:list')).toBe(true)
    expect(matchPermission('system:role:*', 'system:user:list')).toBe(false)
  })

  it('grants admin roles and rejects incomplete permission sets', () => {
    expect(hasPermission([], 'system:user:list', ['admin'])).toBe(true)
    expect(hasPermission(['system:user:list'], ['system:user:list', 'system:role:list'])).toBe(true)
    expect(hasAllPermissions(['system:user:list'], ['system:user:list', 'system:role:list'])).toBe(false)
  })
})
