import { beforeEach, describe, expect, it, vi } from 'vitest'

const user = vi.hoisted(() => ({
  permissions: [] as string[],
  roles: [] as string[],
}))

vi.mock('@/stores/user', () => ({ useUserStore: () => user }))

import { usePermission } from './usePermission'

describe('usePermission', () => {
  beforeEach(() => {
    user.permissions = ['system:user:*', 'system:role:list']
    user.roles = ['auditor']
  })

  it('按任一、全部权限和角色执行统一判断', () => {
    const permission = usePermission()

    expect(permission.isAdmin()).toBe(false)
    expect(permission.hasPermission('system:user:list')).toBe(true)
    expect(permission.hasAnyPermission('system:notice:list', 'system:role:list')).toBe(true)
    expect(permission.hasAllPermissions('system:user:add', 'system:role:list')).toBe(true)
    expect(permission.hasAllPermissions('system:user:add', 'system:role:edit')).toBe(false)
    expect(permission.hasRole('auditor')).toBe(true)
  })

  it('管理员角色拥有全部权限', () => {
    user.permissions = []
    user.roles = ['admin']
    const permission = usePermission()

    expect(permission.isAdmin()).toBe(true)
    expect(permission.hasPermission('tenant:status')).toBe(true)
    expect(permission.hasAllPermissions('system:user:remove', 'system:role:remove')).toBe(true)
  })
})
