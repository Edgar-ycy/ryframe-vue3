import type { PermissionCode } from '@/api/generated/permissions'
import type { RouteComponentLoader } from '@/router/namedRouteComponent'

export type CapabilityCode = string

/**
 * 一个可裁剪业务能力的完整前端声明。
 *
 * routeKey 对应服务端菜单中的稳定 route_key；page 与配置编辑器都保持懒加载，
 * 避免未授权能力进入首屏产物。
 */
export interface FeatureManifest {
  capabilityCode: CapabilityCode
  routeKey: string
  permissionCode: PermissionCode
  path: string
  page: RouteComponentLoader
  allowedVariants: readonly string[]
  planConfigEditor: RouteComponentLoader
  /** 业务数据不可写期间应禁用的写权限；系统管理权限不得放入此集合。 */
  businessWritePermissions: readonly PermissionCode[]
}

/** 保留 capability、variant 与 route_key 的字面量类型。 */
export function defineFeatureManifest<const Manifest extends FeatureManifest>(
  manifest: Manifest,
): Manifest {
  return manifest
}
