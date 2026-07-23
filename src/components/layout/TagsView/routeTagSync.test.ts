import type { Router } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import type { TagView } from '@/stores/tagsView'
import { installRouteTagSync } from './routeTagSync'

describe('installRouteTagSync', () => {
  it('adds the current route, follows navigation, and exposes hook cleanup', () => {
    let afterEachHook: ((route: never) => void) | undefined
    const removeHook = vi.fn()
    const afterEach = vi.fn((hook: (route: never) => void) => {
      afterEachHook = hook
      return removeHook
    })
    const views: TagView[] = []
    const router = { afterEach } as unknown as Pick<Router, 'afterEach'>

    const dispose = installRouteTagSync(
      router,
      {
        path: '/users',
        name: 'users',
        meta: { title: 'Users', affix: true, noCache: true },
      },
      view => views.push(view),
    )

    expect(views).toEqual([{
      path: '/users',
      name: 'users',
      title: 'Users',
      affix: true,
      noCache: true,
    }])

    afterEachHook?.({
      path: '/roles',
      name: 'roles',
      meta: { title: 'Roles' },
    } as never)
    afterEachHook?.({ path: '/layout', name: undefined, meta: {} } as never)

    expect(views).toHaveLength(2)
    expect(views[1]).toMatchObject({ path: '/roles', name: 'roles', title: 'Roles' })

    dispose()
    expect(removeHook).toHaveBeenCalledOnce()
  })
})
