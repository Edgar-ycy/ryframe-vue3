export type PermissionValue = string | string[]

function escapeRegExp(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
}

function wildcardToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('*')
    .map(escapeRegExp)
    .join('.*')
  return new RegExp(`^${source}$`)
}

export function matchPermission(owned: string, required: string): boolean {
  if (!owned || !required) return false
  if (owned === '*' || owned === '*:*:*' || owned === required) return true
  if (!owned.includes('*')) return false
  return wildcardToRegExp(owned).test(required)
}

export function hasPermission(
  permissions: readonly string[],
  required: PermissionValue,
  roles: readonly string[] = [],
): boolean {
  if (!required || required.length === 0) return true
  if (roles.includes('admin')) return true

  const requiredList = Array.isArray(required) ? required : [required]
  return requiredList.some(perm =>
    permissions.some(owned => matchPermission(owned, perm)),
  )
}

export function hasAllPermissions(
  permissions: readonly string[],
  required: readonly string[],
  roles: readonly string[] = [],
): boolean {
  if (!required.length) return true
  if (roles.includes('admin')) return true
  return required.every(perm => hasPermission(permissions, perm, roles))
}
