import { useUserStore } from '@/stores/user'
import type { PermissionCode } from '@/api/generated/permissions'
import {
  hasAllPermissions as checkAllPermissions,
  hasPermission as checkPermission,
} from '@/utils/permission'

export function usePermission() {
  const userStore = useUserStore()

  const isAdmin = () => {
    return userStore.roles.includes('admin')
      || checkPermission(userStore.permissions, '*:*:*', userStore.roles)
  }

  const hasPermission = (perm: PermissionCode): boolean =>
    checkPermission(userStore.permissions, perm, userStore.roles)

  const hasAnyPermission = (...perms: PermissionCode[]): boolean =>
    checkPermission(userStore.permissions, perms, userStore.roles)

  const hasAllPermissions = (...perms: PermissionCode[]): boolean =>
    checkAllPermissions(userStore.permissions, perms, userStore.roles)

  const hasRole = (role: string): boolean => userStore.roles.includes(role)

  return { isAdmin, hasPermission, hasAnyPermission, hasAllPermissions, hasRole }
}
