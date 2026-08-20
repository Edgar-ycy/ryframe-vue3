import type { MenuPageRegistryEntry } from '@/router/pageRegistry'
import type { PermissionCode } from '@/api/generated/permissions'
import { serviceAccountsFeature } from '@/features/service-accounts/manifest'

export const featureManifests = [serviceAccountsFeature] as const

export const featureMenuPageRegistry = Object.fromEntries(
  featureManifests.map((feature) => [
    feature.routeKey,
    {
      path: feature.path,
      component: feature.page,
      requiredCapabilities: [feature.capabilityCode],
    } satisfies MenuPageRegistryEntry,
  ]),
) as Readonly<Record<string, MenuPageRegistryEntry>>

export const featurePermissionRouteKeys = Object.fromEntries(
  featureManifests.map((feature) => [feature.permissionCode, feature.routeKey]),
) as Readonly<Partial<Record<PermissionCode, string>>>

const businessWritePermissions = new Set<PermissionCode>(
  featureManifests.flatMap(feature => [...feature.businessWritePermissions]),
)

export function isBusinessWritePermission(permissionCode: PermissionCode): boolean {
  return businessWritePermissions.has(permissionCode)
}

export function findFeatureManifest(capabilityCode: string) {
  return featureManifests.find((feature) => feature.capabilityCode === capabilityCode)
}
