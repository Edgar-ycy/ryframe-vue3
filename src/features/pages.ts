import type { PermissionCode } from '@/api/generated/permissions'
import type { MessageCatalogLoader } from '@/i18n/catalog'
import type { RouteComponentLoader } from '@/shared/navigation/routeComponent'

export interface MenuPageRegistryEntry {
  path: string
  component?: RouteComponentLoader
  requiredCapabilities?: readonly string[]
}

export interface PageManifestEntry {
  routeKey: string
  permissionCode?: PermissionCode
  path: string
  page?: RouteComponentLoader
  catalogs?: readonly MessageCatalogLoader[]
}

export interface PageManifest {
  pages: readonly PageManifestEntry[]
}

/** 保留路由键、权限和页面路径的字面量类型。 */
export function definePageManifest<const Manifest extends PageManifest>(
  manifest: Manifest,
): Manifest {
  return manifest
}
