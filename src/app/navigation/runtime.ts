import type { Router } from 'vue-router'

export interface RouteRuntimePort {
  router: Router
  ensureAccessibleRoutes(options?: { skipAuthRefresh?: boolean }): Promise<unknown>
  refreshAccessibleRoutes(options?: { skipAuthRefresh?: boolean }): Promise<unknown>
  resetDynamicRoutes(): void
}

let runtime: RouteRuntimePort | undefined

export function installRouteRuntime(next: RouteRuntimePort): void {
  runtime = next
}

export function getRouteRuntime(): RouteRuntimePort | undefined {
  return runtime
}
