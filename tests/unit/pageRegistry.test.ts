import { describe, expect, it } from 'vitest'

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
    expect(getRouteKeyByPermissionCode('tools:gen:list')).toBeUndefined()
  })
})
