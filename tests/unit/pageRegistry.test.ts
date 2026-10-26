import { describe, expect, it, vi } from 'vitest'
import { isPermissionCode } from '@/api/generated/permissions'

import { getMenuPage, getRouteKeyByPermissionCode, menuPageRegistry } from '@/features/pageRegistry'

describe('菜单页面注册表', () => {
  it('生成资源声明的业务写权限进入统一维护集合，读取权限仍独立', async () => {
    vi.resetModules()
    vi.doMock('@/generated/resources/post/registration', async (importOriginal) => {
      const actual =
        await importOriginal<typeof import('@/generated/resources/post/registration')>()
      return {
        ...actual,
        pageManifest: {
          ...actual.pageManifest,
          businessWritePermissions: ['system:user:add', 'system:user:edit', 'system:user:remove'],
        },
      }
    })
    try {
      const { isBusinessWritePermission } = await import('@/features/registry')
      for (const permission of [
        'system:user:add',
        'system:user:edit',
        'system:user:remove',
      ] as const)
        expect(isBusinessWritePermission(permission)).toBe(true)
      expect(isBusinessWritePermission('system:user:list')).toBe(false)
      expect(isBusinessWritePermission('system:post:add')).toBe(true)
    } finally {
      vi.doUnmock('@/generated/resources/post/registration')
      vi.resetModules()
    }
  })
  it('不再识别在线代码生成器及其父级 route key', () => {
    expect(getMenuPage('tools.gen')).toBeUndefined()
    expect(getMenuPage('tools')).toBeUndefined()
    expect(Object.values(menuPageRegistry).map((page) => page.path)).not.toContain('/tools/gen')
  })

  it('不再把旧生成器权限映射到前端页面', () => {
    expect(isPermissionCode('tools:gen:list')).toBe(false)
  })

  it('自动汇总领域、生成资源和可裁剪功能页面', () => {
    expect(getMenuPage('system.post')?.path).toBe('/system/post')
    expect(getMenuPage('system.post')?.requiredCapabilities ?? []).toEqual([])
    expect(getMenuPage('system.service-accounts')).toBeUndefined()
    expect(getRouteKeyByPermissionCode('system:post:list')).toBe('system.post')
  })
})
