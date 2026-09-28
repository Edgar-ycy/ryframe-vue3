import { describe, expect, it, vi } from 'vitest'
import { installRouteTagSync } from '@/components/layout/TagsView/routeTagSync'

describe('路由标签同步', () => {
  it('保留稳定标题键及服务端默认名称', () => {
    const addView = vi.fn()
    let afterEach:
      ((route: { meta: Record<string, unknown>; name: string; path: string }) => void) | undefined
    const remove = vi.fn()
    const router = {
      afterEach(
        callback: (route: { meta: Record<string, unknown>; name: string; path: string }) => void,
      ) {
        afterEach = callback
        return remove
      },
    }
    const currentRoute = {
      path: '/system/post',
      name: 'SystemPost',
      meta: { defaultTitle: '岗位管理', title: 'system.post' },
    }

    expect(installRouteTagSync(router as never, currentRoute as never, addView)).toBe(remove)
    expect(addView).toHaveBeenCalledExactlyOnceWith({
      affix: false,
      defaultTitle: '岗位管理',
      name: 'SystemPost',
      noCache: false,
      path: '/system/post',
      title: 'system.post',
    })

    afterEach?.({
      path: '/system/post',
      name: 'SystemPost',
      meta: { defaultTitle: '岗位管理', title: 'system.post' },
    })
    expect(addView).toHaveBeenCalledTimes(2)
  })
})
