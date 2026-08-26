import type { RouteLocationRaw, Router } from 'vue-router'

export interface RouteRuntimePort {
  router: Router
  ensureAccessibleRoutes(options?: { skipAuthRefresh?: boolean }): Promise<unknown>
  refreshAccessibleRoutes(options?: { skipAuthRefresh?: boolean }): Promise<unknown>
  resolveAccessibleRoute(candidate: string): RouteLocationRaw
  resetDynamicRoutes(): void
}

let runtime: RouteRuntimePort | undefined

export function installRouteRuntime(next: RouteRuntimePort): void {
  runtime = next
}

export function getRouteRuntime(): RouteRuntimePort | undefined {
  return runtime
}

function requireRouteRuntime(): RouteRuntimePort {
  if (!runtime) throw new Error('路由运行时尚未安装')
  return runtime
}

export function ensureRuntimeAccessibleRoutes(options?: {
  skipAuthRefresh?: boolean
}): Promise<unknown> {
  return requireRouteRuntime().ensureAccessibleRoutes(options)
}

export function refreshRuntimeAccessibleRoutes(options?: {
  skipAuthRefresh?: boolean
}): Promise<unknown> {
  return requireRouteRuntime().refreshAccessibleRoutes(options)
}

export function resolveRuntimeAccessibleRoute(candidate: string): RouteLocationRaw {
  return requireRouteRuntime().resolveAccessibleRoute(candidate)
}
