import type { PermissionCode } from '@/api/generated/permissions'
import type { FeatureManifest } from '@/features/manifest'
import type { MenuPageRegistryEntry, PageManifest, PageManifestEntry } from '@/features/pages'
import { withRouteMessageCatalogs } from '@/i18n/lazyCatalog'

interface FeatureModule {
  featureManifest: FeatureManifest
}

interface PageModule {
  pageManifest: PageManifest
}

const featureModules = import.meta.glob<FeatureModule>('./*/manifest.ts', { eager: true })
const domainPageModules = import.meta.glob<PageModule>('./*/pages.ts', { eager: true })
const resourcePageModules = import.meta.glob<PageModule>(
  '../generated/resources/*/registration.ts',
  { eager: true },
)

export const featureManifests = Object.values(featureModules).map(
  (module) => module.featureManifest,
)

const pageEntries = Object.values({ ...domainPageModules, ...resourcePageModules }).flatMap(
  (module) => module.pageManifest.pages,
)

function addPage(
  registry: Record<string, MenuPageRegistryEntry>,
  permissions: Partial<Record<PermissionCode, string>>,
  entry: PageManifestEntry,
): void {
  const existing = registry[entry.routeKey]
  if (existing) {
    if (existing.path !== entry.path) throw new Error(`页面 route_key 路径冲突：${entry.routeKey}`)
    existing.requiredCapabilities = Array.from(
      new Set([...(existing.requiredCapabilities ?? []), ...(entry.requiredCapabilities ?? [])]),
    )
    if (entry.permissionCode) {
      const registeredRouteKey = permissions[entry.permissionCode]
      if (registeredRouteKey && registeredRouteKey !== entry.routeKey) {
        throw new Error(`重复的页面权限：${entry.permissionCode}`)
      }
      permissions[entry.permissionCode] = entry.routeKey
    }
    return
  }
  registry[entry.routeKey] = {
    path: entry.path,
    ...(entry.page ? { component: withRouteMessageCatalogs(entry.routeKey, entry.page) } : {}),
    ...(entry.requiredCapabilities ? { requiredCapabilities: entry.requiredCapabilities } : {}),
  }
  if (!entry.permissionCode) return
  if (permissions[entry.permissionCode]) throw new Error(`重复的页面权限：${entry.permissionCode}`)
  permissions[entry.permissionCode] = entry.routeKey
}

const menuPages: Record<string, MenuPageRegistryEntry> = {}
const permissionRoutes: Partial<Record<PermissionCode, string>> = {}

for (const entry of pageEntries) addPage(menuPages, permissionRoutes, entry)
for (const feature of featureManifests) {
  if (!feature.routeKey) continue
  if (!feature.permissionCode || !feature.path || !feature.page) {
    throw new Error(`能力页面声明不完整：${feature.capabilityCode}`)
  }
  addPage(menuPages, permissionRoutes, {
    routeKey: feature.routeKey,
    permissionCode: feature.permissionCode,
    path: feature.path,
    page: feature.page,
  })
  menuPages[feature.routeKey].requiredCapabilities = [feature.capabilityCode]
}

export const registeredMenuPageRegistry = Object.freeze(menuPages)
export const registeredPermissionRouteKeys = Object.freeze(permissionRoutes)

const businessWritePermissions = new Set<PermissionCode>(
  featureManifests.flatMap((feature) => feature.businessWritePermissions),
)

export function isBusinessWritePermission(permissionCode: PermissionCode): boolean {
  return businessWritePermissions.has(permissionCode)
}

export function findFeatureManifest(capabilityCode: string) {
  return featureManifests.find((feature) => feature.capabilityCode === capabilityCode)
}
