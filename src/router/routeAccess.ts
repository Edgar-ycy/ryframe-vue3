import type { RouteMeta } from 'vue-router'
import { getMenuPageByPath } from '@/router/pageRegistry'
import { hasPermission } from '@/utils/permission'

export type RouteAccessResult =
  | 'allowed'
  | 'forbidden'
  | 'capability-unavailable'
  | 'unknown'

export const CAPABILITY_UNAVAILABLE_PATH = '/feature-unavailable'

export interface RouteAccessContext {
  capabilities: readonly string[]
  multiTenancyEnabled: boolean
  permissions: readonly string[]
}

export function hasRequiredCapabilities(
  capabilities: readonly string[],
  required: readonly string[] | undefined,
): boolean {
  return !required?.length || required.every(code => capabilities.includes(code))
}

/** 已解析路由、静态页面识别和标签清理必须共用同一套访问判定。 */
export function routeMetaAccessResult(
  meta: RouteMeta | undefined,
  context: RouteAccessContext,
): Exclude<RouteAccessResult, 'unknown'> {
  if (meta?.requiresPermission) {
    const required = meta.permission
    if (!required || !hasPermission(context.permissions, required)) return 'forbidden'
  }
  if (meta?.requiresMultiTenancy && !context.multiTenancyEnabled) {
    return 'capability-unavailable'
  }
  if (!hasRequiredCapabilities(context.capabilities, meta?.requiredCapabilities)) {
    return 'capability-unavailable'
  }
  return 'allowed'
}

export function matchedRouteAccessResult(
  metas: readonly (RouteMeta | undefined)[],
  context: RouteAccessContext,
): Exclude<RouteAccessResult, 'unknown'> {
  let result: Exclude<RouteAccessResult, 'unknown'> = 'allowed'
  for (const meta of metas) {
    const current = routeMetaAccessResult(meta, context)
    if (current === 'forbidden') return current
    if (current === 'capability-unavailable') result = current
  }
  return result
}

export function registeredPageAccessResult(
  path: string,
  context: RouteAccessContext,
): RouteAccessResult {
  const page = getMenuPageByPath(path)
  if (!page) return 'unknown'
  if (page.permission && !hasPermission(context.permissions, page.permission)) return 'forbidden'
  if (!hasRequiredCapabilities(context.capabilities, page.requiredCapabilities)) {
    return 'capability-unavailable'
  }
  return 'allowed'
}

export function accessResultPath(result: RouteAccessResult): string | undefined {
  if (result === 'forbidden') return '/403'
  if (result === 'capability-unavailable') return CAPABILITY_UNAVAILABLE_PATH
  if (result === 'unknown') return '/404'
  return undefined
}
