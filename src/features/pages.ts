import type { PermissionCode } from '@/api/generated/permissions'
import type { RouteComponentLoader } from '@/shared/navigation/routeComponent'

export interface MenuPageRegistryEntry {
  path: string
  component?: RouteComponentLoader
  requiredCapabilities?: readonly string[]
  requiresMultiTenancy?: boolean
  requiresSystemTenant?: boolean
}

export interface PageManifestEntry {
  routeKey: string
  permissionCode?: PermissionCode
  path: string
  page?: RouteComponentLoader
  requiredCapabilities?: readonly string[]
  requiresMultiTenancy?: boolean
  requiresSystemTenant?: boolean
}

export interface PageManifest {
  pages: readonly PageManifestEntry[]
  /** 基础页面的业务写权限，与套餐能力开关独立。 */
  businessWritePermissions?: readonly PermissionCode[]
}

/** 保留路由键、权限和页面路径的字面量类型。 */
export function definePageManifest<const Manifest extends PageManifest>(
  manifest: Manifest,
): Manifest {
  return manifest
}
