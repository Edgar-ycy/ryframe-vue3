import { useUserStore } from '@/stores/user'
import type { PermissionCode } from '@/api/generated/permissions'
import {
  hasAllPermissions as checkAllPermissions,
  hasPermission as checkPermission,
} from '@/utils/permission'

export function usePermission() {
  const userStore = useUserStore()

  const isSuperAdmin = (): boolean => userStore.isSuperAdmin

  const hasPermission = (perm: PermissionCode): boolean =>
    checkPermission(userStore.permissions, perm)

  const hasAnyPermission = (...perms: PermissionCode[]): boolean =>
    checkPermission(userStore.permissions, perms)

  const hasAllPermissions = (...perms: PermissionCode[]): boolean =>
    checkAllPermissions(userStore.permissions, perms)

  return { isSuperAdmin, hasPermission, hasAnyPermission, hasAllPermissions }
}
