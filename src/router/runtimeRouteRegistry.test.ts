import { describe, expect, it } from 'vitest'
import type { RouteRecordName, RouteRecordRaw } from 'vue-router'
import { RuntimeRouteRegistry, type RouteRegistryRouter } from './runtimeRouteRegistry'

class FakeRouter implements RouteRegistryRouter {
  readonly routes = new Set<RouteRecordName>()
  readonly removed: RouteRecordName[] = []

  hasRoute(name: RouteRecordName): boolean {
    return this.routes.has(name)
  }

  addRoute(route: RouteRecordRaw): () => void {
    if (route.name) this.routes.add(route.name)
    return () => {
      if (route.name) this.routes.delete(route.name)
    }
  }

  removeRoute(name: RouteRecordName): void {
    this.routes.delete(name)
    this.removed.push(name)
  }
}

describe('RuntimeRouteRegistry', () => {
  it('adds named routes once and removes only routes it owns', () => {
    const router = new FakeRouter()
    router.routes.add('constant')
    const registry = new RuntimeRouteRegistry(router)
    const dynamicRoute: RouteRecordRaw = { path: '/users', name: 'users', redirect: '/' }

    registry.add([dynamicRoute, dynamicRoute])
    expect([...router.routes]).toEqual(['constant', 'users'])

    registry.reset()
    expect([...router.routes]).toEqual(['constant'])
    expect(router.removed).toEqual(['users'])
  })

  it('rejects unnamed dynamic routes because they cannot be removed safely', () => {
    const registry = new RuntimeRouteRegistry(new FakeRouter())
    expect(() => registry.add([{ path: '/unnamed', redirect: '/' }])).toThrow(
      '动态路由缺少 name',
    )
  })
})
