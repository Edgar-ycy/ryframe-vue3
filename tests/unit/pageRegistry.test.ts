import { describe, expect, it } from 'vitest'
import { isPermissionCode } from '@/api/generated/permissions'

import {
  getMenuPage,
  getRouteKeyByPermissionCode,
  menuPageRegistry,
} from '@/router/pageRegistry'

describe('菜单页面注册表', () => {
  it('不再识别在线代码生成器及其父级 route key', () => {
    expect(getMenuPage('tools.gen')).toBeUndefined()
    expect(getMenuPage('tools')).toBeUndefined()
    expect(Object.values(menuPageRegistry).map(page => page.path)).not.toContain('/tools/gen')
  })

  it('不再把旧生成器权限映射到前端页面', () => {
    expect(isPermissionCode('tools:gen:list')).toBe(false)
  })

  it('自动汇总领域、生成资源和可裁剪功能页面', () => {
    expect(Object.keys(menuPageRegistry)).toHaveLength(30)
    expect(getMenuPage('system.post')?.path).toBe('/system/post')
    expect(getMenuPage('system.service-accounts')?.requiredCapabilities)
      .toEqual(['system.service_accounts'])
    expect(getRouteKeyByPermissionCode('system:post:list')).toBe('system.post')
  })
})
