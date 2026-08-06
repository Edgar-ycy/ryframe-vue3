import type { RouteRecordName, RouteRecordRaw } from 'vue-router'

export interface RouteRegistryRouter {
  hasRoute(name: RouteRecordName): boolean
  addRoute(parentName: RouteRecordName, route: RouteRecordRaw): () => void
  removeRoute(name: RouteRecordName): void
}

export class RuntimeRouteRegistry {
  private readonly names = new Set<RouteRecordName>()

  constructor(private readonly router: RouteRegistryRouter) {}

  add(parentName: RouteRecordName, routes: RouteRecordRaw[]): void {
    for (const route of routes) {
      if (!route.name) {
        throw new Error(`动态路由缺少 name: ${route.path}`)
      }
      if (this.router.hasRoute(route.name)) continue
      this.router.addRoute(parentName, route)
      this.names.add(route.name)
    }
  }

  reset(): void {
    for (const name of this.names) {
      if (this.router.hasRoute(name)) this.router.removeRoute(name)
    }
    this.names.clear()
  }
}
