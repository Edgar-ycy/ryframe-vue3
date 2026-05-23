import { useUserStore } from '@/stores/user'

export function usePermission() {
  const userStore = useUserStore()

  /** 检查是否拥有某个权限 */
  const hasPermission = (perm: string): boolean => userStore.permissions.includes(perm)

  /** 检查是否拥有任一权限 */
  const hasAnyPermission = (...perms: string[]): boolean => perms.some(p => userStore.permissions.includes(p))

  /** 检查是否拥有全部权限 */
  const hasAllPermissions = (...perms: string[]): boolean => perms.every(p => userStore.permissions.includes(p))

  /** 检查角色 */
  const hasRole = (role: string): boolean => userStore.roles.includes(role)

  return { hasPermission, hasAnyPermission, hasAllPermissions, hasRole }
}
