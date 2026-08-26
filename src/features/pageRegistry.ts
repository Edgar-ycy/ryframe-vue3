import { isPermissionCode, type PermissionCode } from '@/api/generated/permissions'
import { registeredMenuPageRegistry, registeredPermissionRouteKeys } from '@/features/registry'
import type { MenuPageRegistryEntry } from '@/features/pages'

export type { MenuPageRegistryEntry } from '@/features/pages'

export interface RegisteredMenuPage extends MenuPageRegistryEntry {
  routeKey: string
  permission?: PermissionCode
}

export const menuPageRegistry = registeredMenuPageRegistry
export const permissionRouteKeys = registeredPermissionRouteKeys

export function getMenuPage(routeKey?: string | null): MenuPageRegistryEntry | undefined {
  return routeKey ? menuPageRegistry[routeKey] : undefined
}

export function getRouteKeyByPermissionCode(
  permissionCode?: PermissionCode | null,
): string | undefined {
  return permissionCode ? permissionRouteKeys[permissionCode] : undefined
}

export function getMenuPageByPath(path: string): RegisteredMenuPage | undefined {
  const normalized = normalizePagePath(path)
  for (const [routeKey, page] of Object.entries(menuPageRegistry)) {
    if (normalizePagePath(page.path) !== normalized) continue
    return {
      ...page,
      permission: permissionForRouteKey(routeKey),
      routeKey,
    }
  }
  return undefined
}

function permissionForRouteKey(routeKey: string): PermissionCode | undefined {
  for (const [permission, mappedRouteKey] of Object.entries(permissionRouteKeys)) {
    if (mappedRouteKey === routeKey && isPermissionCode(permission)) return permission
  }
  return undefined
}

function normalizePagePath(value: string): string {
  const path = value.split(/[?#]/u, 1)[0]?.replace(/\/+$/u, '') || '/'
  return path.startsWith('/') ? path : `/${path}`
}
