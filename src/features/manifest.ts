import type { PermissionCode } from '@/api/generated/permissions'
import type { RouteComponentLoader } from '@/shared/navigation/routeComponent'

export type CapabilityCode = string

export interface CapabilityVariantSchema {
  code: string
  schema_version: number
  config_schema: unknown
}

/**
 * 一个可裁剪业务能力的完整前端声明。
 *
 * routeKey 对应服务端菜单中的稳定 route_key；page 与配置编辑器都保持懒加载，
 * 避免未授权能力进入首屏产物。
 */
export interface FeatureManifest {
  capabilityCode: CapabilityCode
  routeKey?: string
  permissionCode?: PermissionCode
  path?: string
  page?: RouteComponentLoader
  allowedVariants: readonly string[]
  validatePlanConfig: (config: unknown) => boolean
  validateVariantSchema: (variant: CapabilityVariantSchema) => boolean
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

/** 首批能力只接受严格空对象，不接受数组或额外配置字段。 */
export function isEmptyPlanConfig(config: unknown): boolean {
  return Boolean(
    config &&
    typeof config === 'object' &&
    !Array.isArray(config) &&
    Object.keys(config).length === 0,
  )
}

/** 严格核验首批 standard 变体，拒绝服务端 Schema 漂移。 */
export function isStandardEmptyVariant(variant: CapabilityVariantSchema): boolean {
  const schema = variant.config_schema
  return Boolean(
    variant.code === 'standard' &&
    variant.schema_version === 1 &&
    schema &&
    typeof schema === 'object' &&
    !Array.isArray(schema) &&
    Object.keys(schema).sort().join(',') === 'additionalProperties,properties,type' &&
    'type' in schema &&
    schema.type === 'object' &&
    'properties' in schema &&
    isEmptyPlanConfig(schema.properties) &&
    'additionalProperties' in schema &&
    schema.additionalProperties === false,
  )
}

/** 空目录可用；非空目录必须完整匹配客户端能力、变体和 Schema。 */
export function capabilityCatalogMismatchCodes(
  catalog: readonly { code: string; variants: readonly CapabilityVariantSchema[] }[],
  manifests: readonly FeatureManifest[],
): string[] {
  if (catalog.length === 0) return []
  const mismatches = new Set<string>()
  const codes = new Set<string>()
  for (const descriptor of catalog) {
    const manifest = manifests.find((item) => item.capabilityCode === descriptor.code)
    if (
      codes.has(descriptor.code) ||
      !manifest ||
      descriptor.variants.length !== manifest.allowedVariants.length ||
      new Set(descriptor.variants.map((item) => item.code)).size !== descriptor.variants.length ||
      descriptor.variants.some(
        (item) =>
          !manifest.allowedVariants.includes(item.code) || !manifest.validateVariantSchema(item),
      )
    ) {
      mismatches.add(descriptor.code)
    }
    codes.add(descriptor.code)
  }
  for (const manifest of manifests) {
    if (!codes.has(manifest.capabilityCode)) mismatches.add(manifest.capabilityCode)
  }
  return [...mismatches].sort()
}
