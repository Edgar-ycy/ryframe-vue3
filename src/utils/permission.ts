import type { PermissionCode } from '@/api/generated/permissions'

export type PermissionValue = PermissionCode | readonly PermissionCode[]

function escapeRegExp(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
}

function wildcardToRegExp(pattern: string): RegExp {
  const source = pattern.split('*').map(escapeRegExp).join('.*')
  return new RegExp(`^${source}$`)
}

export function matchPermission(owned: string, required: PermissionCode): boolean {
  if (!owned || !required) return false
  if (owned === '*') return false
  if (owned === '*:*:*' || owned === required) return true
  if (!owned.includes('*')) return false
  return wildcardToRegExp(owned).test(required)
}

export function hasPermission(permissions: readonly string[], required: PermissionValue): boolean {
  if (!required || required.length === 0) return true

  const requiredList = Array.isArray(required) ? required : [required]
  return requiredList.some((perm) => permissions.some((owned) => matchPermission(owned, perm)))
}

export function hasAllPermissions(
  permissions: readonly string[],
  required: readonly PermissionCode[],
): boolean {
  if (!required.length) return true
  return required.every((perm) => hasPermission(permissions, perm))
}
