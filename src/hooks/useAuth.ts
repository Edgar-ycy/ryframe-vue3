import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * 权限/认证相关逻辑
 * 
 * @example
 * const { hasAuth, isAdmin, hasRole } = useAuth()
 * if (hasAuth('system:user:list')) { ... }
 */
export function useAuth() {
  const userStore = useUserStore()

  const isAdmin = computed(() => userStore.isAdmin || userStore.permissions.includes('*:*:*') || userStore.permissions.includes('*'))
  const isLoggedIn = computed(() => userStore.isLoggedIn)
  const permissions = computed(() => userStore.permissions)
  const roles = computed(() => userStore.roles)

  /** 判断是否有指定权限（支持单个或数组，数组为 AND 关系） */
  function hasAuth(perm: string | string[]): boolean {
    if (isAdmin.value) return true
    if (!perm || perm.length === 0) return true
    if (Array.isArray(perm)) {
      // AND 关系：所有权限都满足
      return perm.every(p => permissions.value.includes(p))
    }
    return permissions.value.includes(perm)
  }

  /** 判断是否有任意一个权限（OR 关系） */
  function hasAnyAuth(perms: string[]): boolean {
    if (isAdmin.value) return true
    if (!perms || perms.length === 0) return true
    return perms.some(p => permissions.value.includes(p))
  }

  /** 判断是否有指定角色 */
  function hasRole(role: string): boolean {
    return roles.value.includes(role)
  }

  return {
    isAdmin,
    isLoggedIn,
    permissions,
    roles,
    hasAuth,
    hasAnyAuth,
    hasRole,
  }
}
