import type { RouteMeta } from 'vue-router'
import { hasPermission } from '@/utils/permission'

export interface RouteAccessContext {
  capabilities: readonly string[]
  multiTenancyEnabled: boolean
  permissions: readonly string[]
  roles: readonly string[]
}

export function hasRequiredCapabilities(
  capabilities: readonly string[],
  required: readonly string[] | undefined,
): boolean {
  return !required?.length || required.every(code => capabilities.includes(code))
}

/** 菜单过滤、导航守卫和标签清理必须共用同一套访问判定。 */
export function canAccessRouteMeta(meta: RouteMeta | undefined, context: RouteAccessContext): boolean {
  if (meta?.requiresMultiTenancy && !context.multiTenancyEnabled) return false
  if (!hasRequiredCapabilities(context.capabilities, meta?.requiredCapabilities)) return false
  if (!meta?.requiresPermission) return true
  const required = meta.permission
  return typeof required === 'string'
    && hasPermission(context.permissions, required, context.roles)
}
