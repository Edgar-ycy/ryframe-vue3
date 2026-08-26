import type { PermissionCode } from '@/api/generated/permissions'
import {
  hasAllPermissions as hasAllPermissionValues,
  hasPermission as hasPermissionValue,
  matchPermission as matchPermissionValue,
} from '@/shared/navigation/permissionAccess'

export type PermissionValue = PermissionCode | readonly PermissionCode[]

export function matchPermission(owned: string, required: PermissionCode): boolean {
  return matchPermissionValue(owned, required)
}

export function hasPermission(permissions: readonly string[], required: PermissionValue): boolean {
  return hasPermissionValue(permissions, required)
}

export function hasAllPermissions(
  permissions: readonly string[],
  required: readonly PermissionCode[],
): boolean {
  return hasAllPermissionValues(permissions, required)
}
