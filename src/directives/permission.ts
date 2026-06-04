import type { Directive } from 'vue'
import { useUserStore } from '@/stores/user'

const permissionDirective: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    const { value } = binding
    if (!value) return

    const userStore = useUserStore()
    const perms = userStore.permissions
    const roles = userStore.roles

    // 超级管理员：拥有 admin 角色或 *:*:* 通配符权限
    const isAdmin = roles.includes('admin') || perms.includes('*:*:*') || perms.includes('*')
    if (isAdmin) return

    const hasPermission = perms.includes(value)
    if (!hasPermission) {
      el.parentNode?.removeChild(el)
    }
  },
}

export default permissionDirective
