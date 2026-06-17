import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  hasAllPermissions,
  hasPermission,
} from '@/utils/permission'

export function useAuth() {
  const userStore = useUserStore()

  const isAdmin = computed(() =>
    userStore.isAdmin || hasPermission(userStore.permissions, '*:*:*', userStore.roles),
  )
  const isLoggedIn = computed(() => userStore.isLoggedIn)
  const permissions = computed(() => userStore.permissions)
  const roles = computed(() => userStore.roles)

  function hasAuth(perm: string | string[]): boolean {
    if (isAdmin.value) return true
    if (!perm || perm.length === 0) return true
    if (Array.isArray(perm)) {
      return hasAllPermissions(permissions.value, perm, roles.value)
    }
    return hasPermission(permissions.value, perm, roles.value)
  }

  function hasAnyAuth(perms: string[]): boolean {
    if (isAdmin.value) return true
    if (!perms || perms.length === 0) return true
    return hasPermission(permissions.value, perms, roles.value)
  }

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
